import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Grade from '@/database/models/Grade';
import Student from '@/database/models/Student';
import Subject from '@/database/models/Subject';

/**
 * GET /api/grades/my
 * Returns all grades for the authenticated student, enriched with subject names.
 */
export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifySession(sessionCookie.value);
    if (!session || session.userType !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    const student = await Student.findOne({ usn: session.usn }).lean() as any;
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch all grades for this student
    const grades = await Grade.find({ studentId: student._id }).sort({ semester: 1, subjectCode: 1 }).lean();

    // Enrich with subject names
    const subjectCodes = [...new Set(grades.map((g: any) => g.subjectCode))];
    const subjects = await Subject.find({ subjectCode: { $in: subjectCodes } }).lean();
    const subjectMap: Record<string, any> = {};
    subjects.forEach((s: any) => { subjectMap[s.subjectCode] = s; });

    const enriched = grades.map((g: any) => ({
      ...g,
      subjectName: subjectMap[g.subjectCode]?.subjectName || g.subjectCode,
      credits: subjectMap[g.subjectCode]?.credits,
    }));

    return NextResponse.json({
      grades: JSON.parse(JSON.stringify(enriched)),
      student: {
        usn: student.usn,
        studentName: student.studentName,
        department: student.department,
        semester: student.semester,
        currentSemester: student.currentSemester,
        registeredSubjects: student.registeredSubjects || [],
      },
    });
  } catch (error) {
    console.error('Grades fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch grades' }, { status: 500 });
  }
}
