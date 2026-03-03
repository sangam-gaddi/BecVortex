import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import { getSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ success: false }, { status: 401 });

        await connectToDatabase();

        await Student.findOneAndUpdate(
            { usn: session.usn },
            { $set: { isOnline: true, lastSeen: new Date() } }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
