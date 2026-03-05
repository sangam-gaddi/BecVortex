'use server';

import { connectToDatabase } from '@/database/mongoose';
import User from '@/database/models/User';
import Student from '@/database/models/Student';
import ChatGroup from '@/database/models/ChatGroup';
import ChatMessage from '@/database/models/ChatMessage';
import { getSession } from '../auth/session';
import mongoose from 'mongoose';

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-min-32-chars-long'
);

/**
 * Ensures user is authenticated (supports both Staff 'session' and Student 'auth-token').
 */
export async function verifyAuth() {
    const session = await getSession();
    if (session) return session;

    // Fallback: Check for Student auth-token
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token');

    if (token) {
        try {
            const { payload } = await jwtVerify(token.value, SECRET_KEY) as any;
            if (payload.studentId) {
                return {
                    userId: payload.studentId,
                    usn: payload.usn,
                    userType: 'student',
                    role: 'STUDENT',
                } as any;
            }
        } catch (e) {
            console.error('Student token verification failed in chat server actions:', e);
        }
    }

    throw new Error('Unauthorized');
}

/**
 * 0. getMyProfile()
 * Fetches the current user profile (Staff or Student) for Socket UI initialization.
 */
export async function getMyProfile() {
    try {
        const session = await verifyAuth();
        await connectToDatabase();

        if (session.userType === 'staff') {
            const user = await User.findById(session.userId).select('fullName role department email').lean() as any;
            return { success: true, profile: { _id: user._id, fullName: user.fullName, role: user.role, usn: user.email, type: 'staff' } };
        } else {
            const student = await Student.findById(session.userId).select('studentName usn department').lean() as any;
            return { success: true, profile: { _id: student._id, fullName: student.studentName, usn: student.usn, role: 'STUDENT', type: 'student' } };
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 1. getHierarchyDirectory()
 * Fetches all staff users grouped by their roles for the Left Sidebar.
 */
export async function getHierarchyDirectory() {
    try {
        await verifyAuth();
        await connectToDatabase();

        const staffUsers = await User.find({
            role: { $in: ['PRINCIPAL', 'HOD', 'OFFICER', 'FACULTY'] },
            isActive: true
        }).select('_id fullName role department email profilePicture').lean();

        // Group them
        const directory = {
            PRINCIPAL: staffUsers.filter(u => u.role === 'PRINCIPAL'),
            HOD: staffUsers.filter(u => u.role === 'HOD'),
            OFFICER: staffUsers.filter(u => u.role === 'OFFICER'),
            FACULTY: staffUsers.filter(u => u.role === 'FACULTY'),
        };

        return { success: true, directory: JSON.parse(JSON.stringify(directory)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 2. searchUserByUSN(usn)
 * Looks up a student profile by USN, returns their linked User ID to start a chat.
 */
export async function searchUserByUSN(usn: string) {
    try {
        await verifyAuth();
        await connectToDatabase();

        const student = await Student.findOne({ usn: usn.toUpperCase() }).lean() as any;

        if (!student) {
            return { success: false, error: 'Student not found or account not activated.' };
        }

        const userMock = {
            _id: student._id,
            fullName: student.studentName,
            department: student.department,
            email: student.email,
            profileImage: student.profilePicture,
            role: 'STUDENT'
        };

        return { success: true, user: JSON.parse(JSON.stringify(userMock)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 3. createGroup(name, memberIds, department, studentUsns)
 * Validates the caller's RBAC/CR status before saving to ChatGroup.
 * Only users with the role PRINCIPAL, HOD, OFFICER, FACULTY, OR a Student who has isCR: true can create groups.
 */
export async function createGroup(name: string, appMembers: string[], department?: string, studentUsns?: string[]) {
    try {
        const session = await verifyAuth();
        await connectToDatabase();

        // RBAC Check
        let canCreate = false;

        if (session.role && ['PRINCIPAL', 'HOD', 'OFFICER', 'FACULTY'].includes(session.role)) {
            canCreate = true;
        } else if (session.userType === 'student') {
            // Check if student is a CR
            const student = await Student.findById(session.userId).lean();
            if (student && student.isCR) {
                canCreate = true;
            }
        }

        if (!canCreate) {
            return { success: false, error: 'Forbidden: You do not have permission to create chat groups.' };
        }

        // Ensure creator is in the members list
        const memberSet = new Set(appMembers);
        memberSet.add(session.userId.toString());

        // Resolve bulk student USNs to ObjectIds
        if (studentUsns && studentUsns.length > 0) {
            const cleanUsns = studentUsns.map(u => u.trim().toUpperCase()).filter(u => u.length > 0);
            const students = await Student.find({ usn: { $in: cleanUsns } }).select('_id').lean();
            students.forEach(s => memberSet.add(s._id.toString()));
        }

        const newGroup = await ChatGroup.create({
            name,
            createdBy: session.userId,
            department: department || (session as any).department || 'General',
            members: Array.from(memberSet)
        });

        return { success: true, group: JSON.parse(JSON.stringify(newGroup)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 4. sendMessage(payload)
 * Saves the message to the DB with strict TTL expiry.
 */
export async function sendMessage({
    receiverId,
    groupId,
    isGlobal,
    content
}: {
    receiverId?: string;
    groupId?: string;
    isGlobal?: boolean;
    content: string;
}) {
    try {
        const session = await verifyAuth();
        await connectToDatabase();

        if (!content || content.trim().length === 0) {
            return { success: false, error: 'Message cannot be empty.' };
        }

        // --- CRITICAL TTL LOGIC FOR MONGODB FREE TIER OPTIMIZATION ---
        // Global chat: Exactly 1 minute
        // Private/Group: Exactly 5 days
        const expiresAt = new Date();
        if (isGlobal) {
            expiresAt.setMinutes(expiresAt.getMinutes() + 1);
        } else {
            expiresAt.setDate(expiresAt.getDate() + 5);
        }

        const msg = await ChatMessage.create({
            senderId: session.userId,
            receiverId: receiverId || null,
            groupId: groupId || null,
            isGlobal: !!isGlobal,
            content: content.trim(),
            expiresAt
        });

        // Manually assemble the sender info since it could be User or Student
        let senderInfo: any = null;
        if (session.userType === 'staff') {
            const user = await User.findById(session.userId).select('fullName role department profilePicture').lean() as any;
            if (user) {
                senderInfo = { _id: user._id, fullName: user.fullName, role: user.role, department: user.department, profileImage: user.profilePicture };
            }
        } else {
            const student = await Student.findById(session.userId).select('studentName department profilePicture').lean() as any;
            if (student) {
                senderInfo = { _id: student._id, fullName: student.studentName, role: 'STUDENT', department: student.department, profileImage: student.profilePicture };
            }
        }

        const returnedMsg = {
            ...msg.toObject(),
            senderId: senderInfo || { fullName: 'Unknown' }
        };

        return { success: true, message: JSON.parse(JSON.stringify(returnedMsg)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 5. getUserGroups()
 * Fetch groups the current user is a member of.
 */
export async function getUserGroups() {
    try {
        const session = await verifyAuth();
        await connectToDatabase();

        const groups = await ChatGroup.find({ members: session.userId })
            .populate('createdBy', 'fullName')
            .sort({ updatedAt: -1 })
            .lean();

        return { success: true, groups: JSON.parse(JSON.stringify(groups)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 6. getChatHistory()
 * Fetch messages based on context.
 */
export async function getChatHistory(query: { receiverId?: string, groupId?: string, isGlobal?: boolean }) {
    try {
        const session = await verifyAuth();
        await connectToDatabase();

        let dbQuery: any = {};

        if (query.isGlobal) {
            dbQuery.isGlobal = true;
        } else if (query.groupId) {
            dbQuery.groupId = query.groupId;
        } else if (query.receiverId) {
            const mSender = new mongoose.Types.ObjectId(session.userId);
            const mReceiver = new mongoose.Types.ObjectId(query.receiverId);
            // Private chat logic: (sender=A and receiver=B) OR (sender=B and receiver=A)
            dbQuery.$or = [
                { senderId: mSender, receiverId: mReceiver },
                { senderId: mReceiver, receiverId: mSender }
            ];
            dbQuery.isGlobal = false;
        } else {
            return { success: false, error: 'Invalid query parameters.' };
        }

        // Fetch last 100 messages
        const messages = await ChatMessage.find(dbQuery)
            .sort({ createdAt: 1 }) // Chronological order
            .limit(100)
            .lean();

        // Mongoose populate fails here because senderId can be either a User or a Student. We map them manually.
        const senderIds = [...new Set(messages.map(m => String(m.senderId)))];

        const [users, students] = await Promise.all([
            User.find({ _id: { $in: senderIds } }).select('_id fullName role department profilePicture').lean(),
            Student.find({ _id: { $in: senderIds } }).select('_id studentName department profilePicture').lean()
        ]);

        const senderMap: Record<string, any> = {};
        users.forEach((u: any) => {
            senderMap[String(u._id)] = {
                _id: u._id,
                fullName: u.fullName,
                role: u.role,
                department: u.department,
                profileImage: u.profilePicture
            };
        });
        students.forEach((s: any) => {
            senderMap[String(s._id)] = {
                _id: s._id,
                fullName: s.studentName,
                role: 'STUDENT',
                department: s.department,
                profileImage: s.profilePicture
            };
        });

        const populatedMessages = messages.map(m => ({
            ...m,
            senderId: senderMap[String(m.senderId)] || { fullName: 'Unknown', role: 'Unknown' }
        }));

        return { success: true, messages: JSON.parse(JSON.stringify(populatedMessages)) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 7. getUnreadCounts()
 * Returns a map of unread private messages directed to the current user, keyed by sender ID.
 */
export async function getUnreadCounts() {
    try {
        const session = await verifyAuth();
        await connectToDatabase();

        const receiverObjectId = new mongoose.Types.ObjectId(session.userId);

        const counts = await ChatMessage.aggregate([
            { $match: { receiverId: receiverObjectId, isRead: false, isGlobal: false } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } }
        ]);

        const senderIds = counts.map(c => c._id);
        const [users, students] = await Promise.all([
            User.find({ _id: { $in: senderIds } }).select('_id fullName department email profilePicture role').lean() as unknown as any[],
            Student.find({ _id: { $in: senderIds } }).select('_id studentName department usn profilePicture').lean() as unknown as any[]
        ]);

        const unreadList = counts.map(c => {
            const idStr = String(c._id);
            const u = users.find(u => String(u._id) === idStr);
            const s = students.find(s => String(s._id) === idStr);

            let profile = null;
            if (u) {
                profile = { _id: idStr, fullName: u.fullName, department: u.department, usn: u.email, role: u.role, profilePicture: u.profilePicture };
            } else if (s) {
                profile = { _id: idStr, fullName: s.studentName, department: s.department, usn: s.usn, role: 'STUDENT', profilePicture: s.profilePicture };
            }

            return {
                senderId: idStr,
                count: c.count,
                profile: profile || { _id: idStr, fullName: 'Unknown Sender' }
            };
        });

        return { success: true, unread: unreadList };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * 8. markMessagesAsRead(senderId)
 * Marks all messages sent by `senderId` to the current user as read.
 */
export async function markMessagesAsRead(senderId: string) {
    try {
        const session = await verifyAuth();
        await connectToDatabase();

        const receiverObjectId = new mongoose.Types.ObjectId(session.userId);
        const senderObjectId = new mongoose.Types.ObjectId(senderId);

        await ChatMessage.updateMany(
            { senderId: senderObjectId, receiverId: receiverObjectId, isRead: false },
            { $set: { isRead: true } }
        );

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
