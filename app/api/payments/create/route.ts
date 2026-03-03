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

    let sessionUsn = null;
    if (sessionCookie) {
      const session = await verifySession(sessionCookie.value);
      if (session) {
        sessionUsn = session.usn;
      }
    }

    const { feeIds, amount, transactionHash, paymentMethod, channel = 'ONLINE', usn } = await req.json();

    const finalUsn = sessionUsn || usn;

    if (!finalUsn) {
      return NextResponse.json({ error: 'Not authenticated or valid USN provided' }, { status: 401 });
    }

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
      const usnSuffix = finalUsn.slice(-4);
      challanId = `BEC-CH-${timestamp}-${usnSuffix}`;
    }

    // Create payment record
    const payment = await Payment.create({
      usn: finalUsn,
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
        { usn: finalUsn },
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