import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AccessToken, type AccessTokenOptions, type VideoGrant, RoomServiceClient } from 'livekit-server-sdk';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';

// Fee structure (mirrored from lib/data/feeStructure.ts for agent context)
const FEE_STRUCTURE = [
  { id: 'tuition', name: 'Tuition Fee', total: 75000, dueDate: '2025-01-30' },
  { id: 'development', name: 'Development Fee', total: 15000, dueDate: '2025-01-30' },
  { id: 'hostel', name: 'Hostel Fee', total: 45000, dueDate: '2025-02-15' },
  { id: 'examination', name: 'Examination Fee', total: 5000, dueDate: '2025-02-28' },
];

// LiveKit credentials from environment
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Connection details type
export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// Disable caching
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    // Validate environment variables
    if (!LIVEKIT_URL) {
      throw new Error('LIVEKIT_URL is not configured. Please add it to .env.local');
    }
    if (!API_KEY) {
      throw new Error('LIVEKIT_API_KEY is not configured. Please add it to .env.local');
    }
    if (!API_SECRET) {
      throw new Error('LIVEKIT_API_SECRET is not configured. Please add it to .env.local');
    }

    // Get authenticated student data
    let studentName = 'Student';
    let studentUsn = 'unknown';
    let paidFees: string[] = [];
    let department = '';
    let semester = '';

    // Try to get session from cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (sessionCookie) {
      const session = await verifySession(sessionCookie.value);
      if (session) {
        await connectToDatabase();
        const student = await Student.findOne({ usn: session.usn }).lean();
        if (student) {
          studentName = (student as any).studentName || 'Student';
          studentUsn = (student as any).usn || 'unknown';
          paidFees = (student as any).paidFees || [];
          department = (student as any).department || '';
          semester = (student as any).semester || '';
        }
      }
    }

    // Calculate pending and paid fees for agent context
    const pendingFees = FEE_STRUCTURE.filter(f => !paidFees.includes(f.id));
    const paidFeesData = FEE_STRUCTURE.filter(f => paidFees.includes(f.id));
    const totalPending = pendingFees.reduce((sum, f) => sum + f.total, 0);
    const totalPaid = paidFeesData.reduce((sum, f) => sum + f.total, 0);

    // Generate unique room and participant identifiers
    const roomName = `billdesk_voice_${Date.now()}`;
    const participantIdentity = `student_${studentUsn}_${Math.floor(Math.random() * 10000)}`;

    // Room metadata with full student context for agent
    const roomMetadata = {
      studentName,
      studentUsn,
      department,
      semester,
      paidFees,
      pendingFees: pendingFees.map(f => ({ id: f.id, name: f.name, amount: f.total, dueDate: f.dueDate })),
      paidFeesData: paidFeesData.map(f => ({ id: f.id, name: f.name, amount: f.total })),
      totalPending,
      totalPaid,
    };

    // Create the room with agent dispatch using RoomServiceClient
    const roomService = new RoomServiceClient(
      LIVEKIT_URL.replace('wss://', 'https://'),
      API_KEY,
      API_SECRET
    );

    // Create room with agent dispatch
    try {
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 60 * 5, // 5 minutes
        maxParticipants: 2,
        metadata: JSON.stringify(roomMetadata),
        // Request agent dispatch
        agentConfig: {
          agents: [
            {
              agentName: '', // Empty string to match any agent
            }
          ]
        }
      });
      console.log('Room created with student data:', roomName, { studentName, studentUsn, pendingCount: pendingFees.length });
    } catch (e) {
      console.log('Room may already exist or agent config not supported:', e);
    }

    // Create participant token
    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: studentName },
      roomName
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName: studentName,
    };

    console.log('Connection details created:', { roomName, participantIdentity });

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Voice connection error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    );
  }
}

async function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string
): Promise<string> {
  const at = new AccessToken(API_KEY!, API_SECRET!, {
    ...userInfo,
    ttl: '15m', // Token expires in 15 minutes
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };

  at.addGrant(grant);

  return at.toJwt();
}
