import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
);

export interface SessionData {
  userId: string;
  usn: string;
  role?: string;        // MASTER | PRINCIPAL | HOD | OFFICER | FACULTY | STUDENT
  department?: string;  // Department code (nullable for MASTER/PRINCIPAL/STUDENT)
  userType: 'staff' | 'student';
  activeSessionId?: string; // To track and prevent concurrent logins
  iat: number;
  exp: number;
}

export async function createSession(
  userId: string,
  usn: string,
  options?: { role?: string; department?: string; userType?: 'staff' | 'student'; activeSessionId?: string }
) {
  const payload: Record<string, any> = {
    userId,
    usn,
    userType: options?.userType || 'student',
  };
  if (options?.role) payload.role = options.role;
  if (options?.department) payload.department = options.department;
  if (options?.activeSessionId) payload.activeSessionId = options.activeSessionId;

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();

  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });

  return token;
}

export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as SessionData;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');

  if (!sessionCookie) {
    return null;
  }

  return verifySession(sessionCookie.value);
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}