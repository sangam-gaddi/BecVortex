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

        const { paymentId, bankReferenceId } = await req.json();

        if (!paymentId || !bankReferenceId) {
            return NextResponse.json({ error: 'Missing payment ID or Bank Reference ID' }, { status: 400 });
        }

        await connectToDatabase();

        const payment = await Payment.findOne({
            _id: paymentId,
            usn: session.usn,
            status: 'pending_bank_verification'
        });

        if (!payment) {
            return NextResponse.json({ error: 'Invalid payment or already verified' }, { status: 404 });
        }

        // Update payment
        payment.status = 'completed';
        payment.bankReferenceId = bankReferenceId;
        // We could store receipt snapshot here if we generated it server side, but client generates it.
        // For now, let's just mark it done.
        await payment.save();

        // Update Student fees
        await Student.findOneAndUpdate(
            { usn: session.usn },
            { $addToSet: { paidFees: { $each: payment.feeIds } } }
        );

        return NextResponse.json({
            success: true,
            payment,
        });

    } catch (error: any) {
        console.error('Verify payment error:', error);
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }
}
