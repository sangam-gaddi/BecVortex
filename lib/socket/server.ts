import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { NextApiResponse } from 'next';
import { connectToDatabase } from '@/database/mongoose';
import ChatMessage from '@/database/models/ChatMessage';
import User from '@/database/models/User';
import Student from '@/database/models/Student';

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HTTPServer & {
      io?: SocketIOServer;
    };
  };
};

const ONE_MINUTE_MS = 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

async function resolveIdentity(usnOrId?: string) {
  if (!usnOrId) return null;
  const usn = usnOrId.toUpperCase();

  const student = await Student.findOne({ usn }).select('_id studentName department profilePicture usn').lean();
  if (student) {
    return {
      id: String(student._id),
      name: student.studentName,
      role: 'STUDENT',
      department: student.department,
      profileImage: student.profilePicture,
      usn: student.usn,
    };
  }

  const staff = await User.findOne({ $or: [{ username: usn.toLowerCase() }, { email: usn.toLowerCase() }] })
    .select('_id fullName role department profilePicture username email')
    .lean();

  if (staff) {
    return {
      id: String(staff._id),
      name: staff.fullName,
      role: staff.role,
      department: staff.department,
      profileImage: staff.profilePicture,
      usn: staff.email || staff.username,
    };
  }

  return null;
}

export const initSocketIO = (res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    console.log('🔌 Initializing Socket.io server...');

    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    res.socket.server.io = io;

    // Track active socket IDs to their respective USNs
    const onlineUsers = new Map<string, string>();

    io.on('connection', (socket) => {
      console.log('✅ Client connected:', socket.id);

      // User joins with their USN
      socket.on('join', async (data: { usn: string; name: string }) => {
        try {
          await connectToDatabase();

          const identity = await resolveIdentity(data.usn);
          socket.data.usn = data.usn;
          socket.data.name = data.name;
          socket.data.userId = identity?.id;

          socket.join('global');
          socket.join(`user:${data.usn}`);

          onlineUsers.set(socket.id, data.usn);
          console.log(`👤 ${data.name} (${data.usn}) joined`);

          io.emit('user-online', { usn: data.usn, name: data.name });
          io.emit('online-users', Array.from(new Set(onlineUsers.values())));
        } catch (err) {
          console.error('Join failed:', err);
        }
      });

      // Send global message (persist + emit)
      socket.on('send-global-message', async (data: { message: string }) => {
        try {
          await connectToDatabase();
          const sender = await resolveIdentity(socket.data.usn);
          if (!sender) return;

          const expiresAt = new Date(Date.now() + ONE_MINUTE_MS);
          const saved = await ChatMessage.create({
            senderId: sender.id,
            receiverId: null,
            groupId: null,
            isGlobal: true,
            content: data.message,
            expiresAt,
          });

          const payload = {
            _id: saved._id,
            senderUsn: sender.usn,
            senderName: sender.name,
            content: data.message,
            message: data.message,
            timestamp: saved.createdAt,
          };

          io.to('global').emit('new-global-message', payload);
        } catch (err) {
          console.error('Send global failed:', err);
        }
      });

      // Send private message (persist + emit)
      socket.on('send-private-message', async (data: { recipientUsn: string; message: string }) => {
        try {
          await connectToDatabase();
          const sender = await resolveIdentity(socket.data.usn);
          const recipient = await resolveIdentity(data.recipientUsn);
          if (!sender || !recipient) return;

          const expiresAt = new Date(Date.now() + FIVE_DAYS_MS);
          const saved = await ChatMessage.create({
            senderId: sender.id,
            receiverId: recipient.id,
            groupId: null,
            isGlobal: false,
            content: data.message,
            expiresAt,
          });

          const messageData = {
            _id: saved._id,
            senderUsn: sender.usn,
            senderName: sender.name,
            recipientUsn: recipient.usn,
            content: data.message,
            message: data.message,
            timestamp: saved.createdAt,
          };

          io.to(`user:${data.recipientUsn}`).emit('new-private-message', messageData);
          socket.emit('new-private-message', messageData);
        } catch (err) {
          console.error('Send private failed:', err);
        }
      });

      // Group created – notify all connected clients to re-fetch their groups
      socket.on('group-created', () => {
        socket.broadcast.emit('group-created');
      });

      // Typing indicators
      socket.on('typing-global', () => {
        socket.to('global').emit('user-typing-global', {
          usn: socket.data.usn,
          name: socket.data.name,
        });
      });

      socket.on('typing-private', (data: { recipientUsn: string }) => {
        io.to(`user:${data.recipientUsn}`).emit('user-typing-private', {
          usn: socket.data.usn,
          name: socket.data.name,
        });
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log(' Client disconnected:', socket.id);

        if (socket.data.usn) {
          onlineUsers.delete(socket.id);
          io.emit('user-offline', { usn: socket.data.usn });
          io.emit('online-users', Array.from(new Set(onlineUsers.values())));
        }
      });
    });

    console.log(' Socket.io server initialized');
  } else {
    console.log(' Socket.io server already running');
  }

  return res.socket.server.io;
};
