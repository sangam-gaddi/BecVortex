import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import CustomFee from '@/database/models/CustomFee';

/**
 * GET /api/payments/my-custom-fees
 * Returns custom fees assigned to the authenticated student.
 */
export async function GET(_req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const session = await verifySession(sessionCookie.value);
    if (!session || session.userType !== 'student' || !session.usn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();
    const fees = await CustomFee.find({ studentUsn: session.usn }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ customFees: JSON.parse(JSON.stringify(fees)) });
  } catch (error) {
    console.error('Custom fees error:', error);
    return NextResponse.json({ error: 'Failed to fetch custom fees' }, { status: 500 });
  }
}

/**
 * PATCH /api/payments/my-custom-fees
 * Student marks their own custom fee as paid after a successful payment.
 */
export async function PATCH(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');
    if (!sessionCookie) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const session = await verifySession(sessionCookie.value);
    if (!session || session.userType !== 'student' || !session.usn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { feeId } = await req.json();
    if (!feeId) return NextResponse.json({ error: 'feeId required' }, { status: 400 });

    await connectToDatabase();
    // Only allow updating the student's own fee
    const updated = await CustomFee.findOneAndUpdate(
      { feeId, studentUsn: session.usn },
      { isPaid: true },
      { new: true }
    );
    if (!updated) return NextResponse.json({ error: 'Fee not found' }, { status: 404 });

    return NextResponse.json({ success: true, fee: updated });
  } catch (error) {
    console.error('Mark custom fee paid error:', error);
    return NextResponse.json({ error: 'Failed to update fee' }, { status: 500 });
  }
}
