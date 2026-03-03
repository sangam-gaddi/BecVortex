import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, getSession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (session?.usn) {
      await connectToDatabase();
      await Student.findOneAndUpdate({ usn: session.usn }, { $set: { isOnline: false } });
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