import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Payment from '@/database/models/Payment';
import Student from '@/database/models/Student';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifySession(sessionCookie.value);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { feeIds, amount, transactionHash, paymentMethod, channel = 'ONLINE' } = await req.json();

    // Validation
    if (!feeIds || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Specific validation
    if (paymentMethod === 'crypto' && !transactionHash) {
      return NextResponse.json({ error: 'Transaction hash required for crypto' }, { status: 400 });
    }

    await connectToDatabase();

    let status = 'completed';
    let challanId = undefined;

    if (paymentMethod === 'cash') {
      status = 'pending_bank_verification';
      // Generate Challan ID: BEC-CH-{TIMESTAMP}-{USN_SUFFIX}
      const timestamp = Date.now().toString().slice(-6);
      const usnSuffix = session.usn.slice(-4);
      challanId = `BEC-CH-${timestamp}-${usnSuffix}`;
    }

    // Create payment record
    const payment = await Payment.create({
      usn: session.usn,
      feeIds,
      amount,
      transactionHash: transactionHash || undefined, // undefined for cash
      paymentMethod,
      channel,
      status,
      challanId,
      createdAt: new Date(),
    });

    // Only update Student paid fees if COMPLETED
    if (status === 'completed') {
      await Student.findOneAndUpdate(
        { usn: session.usn },
        { $addToSet: { paidFees: { $each: feeIds } } }
      );
    }

    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error: any) {
    console.error('Create payment error:', error);
    return NextResponse.json({ error: 'Payment creation failed' }, { status: 500 });
  }
}