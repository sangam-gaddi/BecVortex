import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AccessToken, type AccessTokenOptions, type VideoGrant, RoomServiceClient } from 'livekit-server-sdk';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import User from '@/database/models/User';
import Grade from '@/database/models/Grade';
import Subject from '@/database/models/Subject';
import Payment from '@/database/models/Payment';
import CustomFee from '@/database/models/CustomFee';
import Faculty from '@/database/models/Faculty';

export const revalidate = 0;

const API_KEY     = process.env.LIVEKIT_API_KEY;
const API_SECRET  = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

async function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
): Promise<string> {
  const at = new AccessToken(API_KEY!, API_SECRET!, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  };
  at.addGrant(grant);
  return at.toJwt();
}

export async function POST() {
  try {
    if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
      throw new Error('LiveKit credentials not configured (LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET)');
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifySession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    await connectToDatabase();

    // ────────────────────────────────────────────────
    // Build context based on user type
    // ────────────────────────────────────────────────
    let roomMetadata: Record<string, any> = { userType: session.userType };

    if (session.userType === 'student') {
      const student = await Student.findOne({ usn: session.usn }).lean() as any;
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      }

      // Grades enriched with subject names
      const grades = await Grade.find({ studentId: student._id })
        .sort({ semester: 1 }).lean() as any[];
      const subjectCodes = [...new Set(grades.map((g: any) => g.subjectCode as string))];
      const subjects = await Subject.find({ subjectCode: { $in: subjectCodes } }).lean() as any[];
      const subjectMap: Record<string, string> = {};
      subjects.forEach((s: any) => { subjectMap[s.subjectCode] = s.title || s.subjectName || s.subjectCode; });

      const enrichedGrades = grades.map((g: any) => ({
        subjectCode:  g.subjectCode,
        subjectName:  subjectMap[g.subjectCode] || g.subjectCode,
        semester:     g.semester,
        cie1:         g.cie1,
        cie2:         g.cie2,
        assignment:   g.assignment,
        totalMarks:   g.totalMarks,
        letterGrade:  g.letterGrade,
      }));

      // Payment history (last 10)
      const payments = await Payment.find({ usn: student.usn, status: 'completed' })
        .sort({ createdAt: -1 }).limit(10).lean() as any[];
      const paymentHistory = payments.map((p: any) => ({
        amount:        p.amount,
        paymentMethod: p.paymentMethod,
        createdAt:     p.createdAt,
        feeIds:        p.feeIds || [],
      }));

      // Custom fees
      const customFees = await CustomFee.find({ studentUsn: student.usn }).lean() as any[];

      roomMetadata = {
        userType:      'student',
        role:          'STUDENT',
        usn:           student.usn,
        studentName:   student.studentName,
        department:    student.department,
        semester:      student.semester,
        degree:        student.degree,
        paidFees:      student.paidFees || [],
        grades:        enrichedGrades,
        paymentHistory,
        customFees:    customFees.map((cf: any) => ({
          name:        cf.name,
          amount:      cf.amount,
          isPaid:      cf.isPaid,
          dueDate:     cf.dueDate,
          description: cf.description,
        })),
      };

    } else {
      // Staff
      const user = await User.findById(session.userId).lean() as any;
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      roomMetadata = {
        userType:   'staff',
        role:       session.role || 'OFFICER',
        fullName:   user.fullName || user.username,
        username:   user.username,
        department: user.department || session.department,
      };

      // Enrich faculty with assigned classes
      if (session.role === 'FACULTY') {
        const faculty = await Faculty.findOne({ userId: session.userId }).lean() as any;
        if (faculty) {
          // Enrich assigned classes with subject names
          const classCodes = (faculty.assignedClasses || []).map((c: any) => c.subjectCode);
          const classSubjects = await Subject.find({ subjectCode: { $in: classCodes } }).lean() as any[];
          const classSubjectMap: Record<string, string> = {};
          classSubjects.forEach((s: any) => { classSubjectMap[s.subjectCode] = s.title || s.subjectCode; });

          roomMetadata.employeeId = faculty.employeeId;
          roomMetadata.assignedClasses = (faculty.assignedClasses || []).map((c: any) => ({
            subjectCode:  c.subjectCode,
            subjectName:  classSubjectMap[c.subjectCode] || c.subjectCode,
            semester:     c.semester,
            section:      c.section,
          }));
        }
      }
    }

    // ────────────────────────────────────────────────
    // Create LiveKit room
    // ────────────────────────────────────────────────
    const identity = session.userType === 'student'
      ? `student_${session.usn}_${Date.now()}`
      : `staff_${session.userId}_${Date.now()}`;

    const roomName = `aria_vortex_${Date.now()}`;

    const roomService = new RoomServiceClient(
      LIVEKIT_URL.replace('wss://', 'https://'),
      API_KEY,
      API_SECRET,
    );

    try {
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 300,
        maxParticipants: 2,
        metadata: JSON.stringify(roomMetadata),
      });
    } catch {
      // Room may already exist — not fatal
    }

    const participantToken = await createParticipantToken(
      { identity, name: roomMetadata.studentName || roomMetadata.fullName || identity },
      roomName,
    );

    return NextResponse.json(
      { serverUrl: LIVEKIT_URL, roomName, participantToken },
      { headers: { 'Cache-Control': 'no-store' } },
    );

  } catch (error: any) {
    console.error('ARIA connection-details error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
