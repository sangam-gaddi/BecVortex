import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fallbackUsn = searchParams.get('usn');

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    let sessionUsn = null;
    if (sessionCookie) {
      const session = await verifySession(sessionCookie.value);
      if (session) {
        sessionUsn = session.usn;
      }
    }

    const finalUsn = sessionUsn || fallbackUsn;

    if (!finalUsn) {
      return NextResponse.json(
        { error: 'Not authenticated and no fallback USN provided' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const student = await Student.findOne({ usn: finalUsn }).lean();

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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