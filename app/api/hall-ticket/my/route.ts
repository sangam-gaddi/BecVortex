import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import HallTicket from '@/database/models/HallTicket';

/**
 * GET /api/hall-ticket/my
 * Returns the authenticated student's hall tickets (active ones).
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
      return NextResponse.json({ error: 'Student account required' }, { status: 403 });
    }

    await connectToDatabase();

    const hallTickets = await HallTicket.find({ usn: session.usn, isValid: true })
      .sort({ generatedAt: -1 })
      .lean();

    return NextResponse.json({
      hallTickets: JSON.parse(JSON.stringify(hallTickets)),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
