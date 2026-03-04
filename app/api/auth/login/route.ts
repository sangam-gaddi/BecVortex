import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import User from '@/database/models/User';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const { identifier, password } = await req.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/USN/Email and password are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // ── 1. Try Staff (User model) login first ──
    const staffUser = await User.findOne({
      username: identifier.toLowerCase(),
      isActive: true,
    });

    if (staffUser && staffUser.password) {
      const isValid = await verifyPassword(password, staffUser.password);
      if (isValid) {
        // Generate new session ID and save it
        const sessionId = crypto.randomUUID();
        staffUser.activeSessionId = sessionId;
        await staffUser.save();

        await createSession(staffUser._id.toString(), staffUser.username, {
          role: staffUser.role,
          department: staffUser.department || undefined,
          userType: 'staff',
          activeSessionId: sessionId,
        });

        return NextResponse.json({
          success: true,
          userType: 'staff',
          user: {
            username: staffUser.username,
            fullName: staffUser.fullName,
            email: staffUser.email,
            role: staffUser.role,
            department: staffUser.department,
          },
        });
      }
    }

    // ── 2. Fall back to Student model ──
    const student = await Student.findOne({
      $or: [
        { usn: identifier.toUpperCase() },
        { email: identifier.toLowerCase() }
      ],
      isRegistered: true
    });

    if (!student || !student.password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, student.password);

    if (isValid) {
      // Generate new session ID and save it
      const sessionId = crypto.randomUUID();
      student.activeSessionId = sessionId;
      await student.save();

      const userIdentifier = student.usn || student.csn || student._id.toString();

      await createSession(student._id.toString(), userIdentifier, {
        role: 'STUDENT',
        userType: 'student',
        activeSessionId: sessionId,
      });

      return NextResponse.json({
        success: true,
        userType: 'student',
        user: {
          usn: student.usn || null,
          csn: student.csn,
          name: student.studentName,
          email: student.email,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
