import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import ChatMessage from '@/database/models/ChatMessage';
import User from '@/database/models/User';
import Student from '@/database/models/Student';
import { verifyAuth } from '@/lib/actions/chat.actions';

const ONE_MINUTE_MS = 60 * 1000;

/**
 * Global chat history (last 50, oldest first).
 * Uses the shared verifyAuth to allow both staff sessions and student auth-token.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyAuth();
    await connectToDatabase();

    const messages = await ChatMessage.find({ isGlobal: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const senderIds = [...new Set(messages.map((m: any) => String(m.senderId)))];
    const [users, students] = await Promise.all([
      User.find({ _id: { $in: senderIds } }).select('_id fullName role department profilePicture').lean(),
      Student.find({ _id: { $in: senderIds } }).select('_id studentName department profilePicture usn').lean(),
    ]);

    const senderMap: Record<string, any> = {};
    users.forEach((u: any) => {
      senderMap[String(u._id)] = {
        _id: u._id,
        fullName: u.fullName,
        role: u.role,
        department: u.department,
        profileImage: u.profilePicture,
      };
    });
    students.forEach((s: any) => {
      senderMap[String(s._id)] = {
        _id: s._id,
        fullName: s.studentName,
        role: 'STUDENT',
        department: s.department,
        profileImage: s.profilePicture,
        usn: s.usn,
      };
    });

    const hydrated = messages
      .map((m: any) => ({
        ...m,
        senderId: senderMap[String(m.senderId)] || { _id: m.senderId, fullName: 'Unknown' },
      }))
      .reverse(); // oldest first

    return NextResponse.json({ success: true, messages: hydrated });
  } catch (error: any) {
    const status = error?.message === 'Unauthorized' ? 401 : 500;
    console.error('❌ Error fetching global messages:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch messages' },
      { status }
    );
  }
}

/**
 * Create a global message with strict 1-minute TTL.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth();
    const { message } = await req.json();

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Message too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Determine sender profile for reference (optional for clients)
    let senderProfile: any = null;
    if (session.userType === 'staff') {
      senderProfile = await User.findById(session.userId).select('_id fullName role department profilePicture').lean();
    } else {
      senderProfile = await Student.findById(session.userId).select('_id studentName department profilePicture usn').lean();
    }

    const expiresAt = new Date(Date.now() + ONE_MINUTE_MS);

    const newMessage = await ChatMessage.create({
      senderId: session.userId,
      receiverId: null,
      groupId: null,
      isGlobal: true,
      content: message.trim(),
      expiresAt,
    });

    const responseMessage = {
      ...newMessage.toObject(),
      senderId: senderProfile || { _id: session.userId, fullName: 'Unknown' },
    };

    return NextResponse.json({ success: true, message: responseMessage });
  } catch (error: any) {
    const status = error?.message === 'Unauthorized' ? 401 : 500;
    console.error('❌ Error sending global message:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send message' },
      { status }
    );
  }
}
