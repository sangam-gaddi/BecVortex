import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import User, { ROLES, DEPARTMENTS, type UserRole, type Department } from '@/database/models/User';
import { getSession } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { canCreateRole } from '@/lib/auth/rbac';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();

        if (!session || session.userType !== 'staff') {
            return NextResponse.json(
                { error: 'Unauthorized. Staff login required.' },
                { status: 401 }
            );
        }

        const callerRole = session.role as UserRole;
        if (!callerRole || !ROLES.includes(callerRole)) {
            return NextResponse.json(
                { error: 'Invalid caller role.' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { username, password, fullName, email, role, department } = body;

        // ── Validate required fields ──
        if (!username || !password || !fullName || !role) {
            return NextResponse.json(
                { error: 'username, password, fullName, and role are required.' },
                { status: 400 }
            );
        }

        const targetRole = role as UserRole;

        // ── Validate role enum ──
        if (!ROLES.includes(targetRole)) {
            return NextResponse.json(
                { error: `Invalid role. Must be one of: ${ROLES.join(', ')}` },
                { status: 400 }
            );
        }

        // ── RBAC Check: Can caller create this role? ──
        if (!canCreateRole(callerRole, targetRole)) {
            return NextResponse.json(
                { error: `Your role (${callerRole}) cannot create ${targetRole} accounts.` },
                { status: 403 }
            );
        }

        // ── Department validation ──
        // HOD, OFFICER, FACULTY require a department
        if (['HOD', 'OFFICER', 'FACULTY'].includes(targetRole)) {
            if (!department) {
                return NextResponse.json(
                    { error: `Department is required for ${targetRole} accounts.` },
                    { status: 400 }
                );
            }
            if (!DEPARTMENTS.includes(department as Department)) {
                return NextResponse.json(
                    { error: `Invalid department. Must be one of: ${DEPARTMENTS.join(', ')}` },
                    { status: 400 }
                );
            }
        }

        // ── HOD department enforcement ──
        // HODs can only create accounts within their own department
        if (callerRole === 'HOD') {
            if (department !== session.department) {
                return NextResponse.json(
                    { error: `As HOD, you can only create accounts in your department (${session.department}).` },
                    { status: 403 }
                );
            }
        }

        await connectToDatabase();

        // ── Check for duplicate username ──
        const existing = await User.findOne({ username: username.toLowerCase() });
        if (existing) {
            return NextResponse.json(
                { error: 'Username already exists.' },
                { status: 409 }
            );
        }

        // ── Create the account ──
        const hashedPassword = await hashPassword(password);

        const newUser = await User.create({
            username: username.toLowerCase().trim(),
            password: hashedPassword,
            fullName: fullName.trim(),
            email: email?.toLowerCase().trim() || undefined,
            role: targetRole,
            department: department || null,
            createdBy: session.userId,
            isActive: true,
        });

        return NextResponse.json({
            success: true,
            user: {
                id: newUser._id,
                username: newUser.username,
                fullName: newUser.fullName,
                role: newUser.role,
                department: newUser.department,
            },
        });

    } catch (error: any) {
        console.error('Create account error:', error);

        // Handle mongoose duplicate key
        if (error.code === 11000) {
            return NextResponse.json(
                { error: 'Username already exists.' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Account creation failed.' },
            { status: 500 }
        );
    }
}
