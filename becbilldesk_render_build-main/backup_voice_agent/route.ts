import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant, RoomServiceClient } from 'livekit-server-sdk';

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

    // Parse request body for optional student info
    let studentName = 'Student';
    let studentUsn = 'unknown';

    try {
      const body = await req.json();
      studentName = body?.studentName || 'Student';
      studentUsn = body?.studentUsn || 'unknown';
    } catch {
      // Body parsing failed, use defaults
    }

    // Generate unique room and participant identifiers
    const roomName = `billdesk_voice_${Date.now()}`;
    const participantIdentity = `student_${studentUsn}_${Math.floor(Math.random() * 10000)}`;

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
        metadata: JSON.stringify({ studentName, studentUsn }),
        // Request agent dispatch
        agentConfig: {
          agents: [
            {
              agentName: '', // Empty string to match any agent
            }
          ]
        }
      });
      console.log('Room created with agent dispatch:', roomName);
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
