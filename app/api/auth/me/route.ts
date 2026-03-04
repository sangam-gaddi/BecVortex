import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import User from '@/database/models/User';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fallbackUsn = searchParams.get('usn');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    let session = null;
    if (sessionCookie) {
      session = await verifySession(sessionCookie.value);
    }

    await connectToDatabase();

    // ── Staff user ──
    if (session?.userType === 'staff') {
      const user = await User.findById(session.userId).lean();
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({
        userType: 'staff',
        user: {
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      });
    }

    // ── Student user ──
    const finalUsn = session?.usn || fallbackUsn;

    if (!finalUsn) {
      return NextResponse.json(
        { error: 'Not authenticated and no fallback USN provided' },
        { status: 401 }
      );
    }

    const student = await Student.findOne({ usn: finalUsn }).lean();

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userType: 'student',
      student: {
        usn: student.usn,
        studentName: student.studentName,
        email: student.email,
        department: student.department,
        semester: student.semester,
        degree: student.degree,
        category: student.casteCat,
        stdType: student.stdType,
        csn: student.csn,
        idNo: student.idNo,
        paymentCategory: student.paymentCategory,
        paidFees: student.paidFees,
      },
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Authentication check failed' },
      { status: 500 }
    );
  }
}