import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import Payment from '@/database/models/Payment';
import Student from '@/database/models/Student';

export async function POST(req: NextRequest) {
    try {
        const { transactionId } = await req.json();

        if (!transactionId) {
            return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
        }

        await connectToDatabase();

        // Flexible search using Aggregation to support partial ObjectID matching
        const results = await Payment.aggregate([
            {
                $addFields: {
                    strId: { $toString: "$_id" }
                }
            },
            {
                $match: {
                    $or: [
                        { strId: { $regex: `^${transactionId}`, $options: 'i' } }, // Match start of ID (Receipt No)
                        { transactionHash: transactionId },
                        { bankReferenceId: transactionId },
                        { challanId: transactionId }
                    ]
                }
            },
            { $limit: 1 }
        ]);

        const payment = results[0];

        if (!payment) {
            return NextResponse.json({ found: false, message: 'Transaction not found' }, { status: 404 });
        }

        // Fetch Student Name for verification context (optional but requested)
        const student = await Student.findOne({ usn: payment.usn }).select('studentName degree department');

        return NextResponse.json({
            found: true,
            data: {
                paymentId: payment._id,
                usn: payment.usn,
                studentName: student?.studentName || 'Unknown',
                amount: payment.amount,
                status: payment.status,
                date: payment.createdAt,
                method: payment.paymentMethod,
                refId: payment.transactionHash || payment.bankReferenceId || payment.challanId
            }
        });

    } catch (error: any) {
        console.error('Lookup error:', error);
        return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
    }
}
