import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getSession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import User from '@/database/models/User';

export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session');
    let session = null;

    if (sessionCookie) {
      session = await getSession();
    }

    if (session) {
      await connectToDatabase();

      if (session.userType === 'staff' && session.userId) {
        await User.findByIdAndUpdate(session.userId, {
          $set: { activeSessionId: null }
        });
      } else if (session.userType === 'student' && session.usn) {
        await Student.findOneAndUpdate(
          { usn: session.usn },
          { $set: { isOnline: false, activeSessionId: null } }
        );
      }
    }

    await deleteSession();

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}