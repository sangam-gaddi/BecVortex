import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/database/mongoose';
import ChatMessage from '@/database/models/ChatMessage';
import User from '@/database/models/User';
import Student from '@/database/models/Student';
import { verifyAuth } from '@/lib/actions/chat.actions';

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function toObjectId(id: string) {
  return new mongoose.Types.ObjectId(id);
}

async function resolveRecipient(recipientId?: string | null, recipientUsn?: string | null) {
  if (recipientId) {
    return { _id: recipientId } as any;
  }

  if (!recipientUsn) return null;

  const usnUpper = recipientUsn.toUpperCase();
  const student = await Student.findOne({ usn: usnUpper }).select('_id').lean();
  if (student) return student;

  // Fallback: try matching staff by username/email if USN was actually their identifier
  const staff = await User.findOne({ $or: [{ username: usnUpper.toLowerCase() }, { email: usnUpper.toLowerCase() }] })
    .select('_id')
    .lean();
  return staff;
}

export async function GET(req: NextRequest) {
  try {
    const session = await verifyAuth();
    const { searchParams } = new URL(req.url);
    const otherUsn = searchParams.get('recipientUsn');
    const recipientId = searchParams.get('recipientId');

    const recipient = await resolveRecipient(recipientId, otherUsn);

    if (!recipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    await connectToDatabase();

    const mSender = toObjectId(session.userId);
    const mReceiver = toObjectId(String(recipient._id));

    const messages = await ChatMessage.find({
      isGlobal: false,
      groupId: null,
      $or: [
        { senderId: mSender, receiverId: mReceiver },
        { senderId: mReceiver, receiverId: mSender },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100)
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

    const hydrated = messages.map((m: any) => ({
      ...m,
      senderId: senderMap[String(m.senderId)] || { _id: m.senderId, fullName: 'Unknown' },
    }));

    return NextResponse.json({ success: true, messages: hydrated });
  } catch (error: any) {
    const status = error?.message === 'Unauthorized' ? 401 : 500;
    console.error(' Error fetching private messages:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch messages' },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAuth();
    const { recipientUsn, recipientId, message } = await req.json();

    if (!recipientUsn && !recipientId) {
      return NextResponse.json(
        { success: false, error: 'Recipient identifier required (recipientUsn or recipientId)' },
        { status: 400 }
      );
    }

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

    const recipient = await resolveRecipient(recipientId, recipientUsn);
    if (!recipient) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    const expiresAt = new Date(Date.now() + FIVE_DAYS_MS);

    const senderProfile = session.userType === 'staff'
      ? await User.findById(session.userId).select('_id fullName role department profilePicture').lean()
      : await Student.findById(session.userId).select('_id studentName department profilePicture usn').lean();

    const newMessage = await ChatMessage.create({
      senderId: session.userId,
      receiverId: recipient._id,
      groupId: null,
      isGlobal: false,
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
    console.error('❌ Error sending private message:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to send message' },
      { status }
    );
  }
}
