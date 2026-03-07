import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import CustomFee from '@/database/models/CustomFee';
import Student from '@/database/models/Student';

const FEE_OFFICER_DEPTS = ['FEE_SECTION', 'EXAMINATION'];

async function verifyFeeOfficer() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) throw new Error('Not authenticated');
  const session = await verifySession(sessionCookie.value);
  if (!session || session.userType !== 'staff') throw new Error('Not authenticated');
  if (session.role !== 'OFFICER' && session.role !== 'HOD' && session.role !== 'MASTER') {
    throw new Error('Insufficient role');
  }
  if (!FEE_OFFICER_DEPTS.includes(session.department || '') && session.role !== 'MASTER') {
    throw new Error('Not authorized: must be from Fee Section or Examination dept');
  }
  return session;
}

/**
 * POST /api/payments/admin/custom-fees
 * Add a custom fee for a student.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifyFeeOfficer();
    const body = await req.json();
    const { studentUsn, category, name, amount, dueDate, description } = body;

    if (!studentUsn || !name || !amount) {
      return NextResponse.json({ error: 'Missing required fields: studentUsn, name, amount' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    await connectToDatabase();

    // Verify student exists
    const student = await Student.findOne({ usn: studentUsn.toUpperCase() }).lean();
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const feeId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const customFee = await CustomFee.create({
      studentUsn: studentUsn.toUpperCase(),
      feeId,
      category: category || 'custom',
      name: name.trim(),
      amount,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      isPaid: false,
      addedBy: session.userId || 'officer',
      description: description?.trim(),
    });

    return NextResponse.json({ success: true, customFee: JSON.parse(JSON.stringify(customFee)) });
  } catch (error: any) {
    const status = error.message?.includes('Not auth') ? 401 : error.message?.includes('Insufficient') || error.message?.includes('Not authorized') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed' }, { status });
  }
}

/**
 * PATCH /api/payments/admin/custom-fees
 * Update an existing custom fee (mark paid, change amount, etc.)
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await verifyFeeOfficer();
    const body = await req.json();
    const { feeId, ...updates } = body;

    if (!feeId) {
      return NextResponse.json({ error: 'feeId required' }, { status: 400 });
    }

    // Only allow certain fields to be updated
    const allowedUpdates: any = {};
    if (updates.name !== undefined) allowedUpdates.name = updates.name.trim();
    if (updates.amount !== undefined) allowedUpdates.amount = updates.amount;
    if (updates.category !== undefined) allowedUpdates.category = updates.category;
    if (updates.dueDate !== undefined) allowedUpdates.dueDate = updates.dueDate ? new Date(updates.dueDate) : undefined;
    if (updates.description !== undefined) allowedUpdates.description = updates.description;
    if (updates.isPaid !== undefined) allowedUpdates.isPaid = updates.isPaid;

    await connectToDatabase();

    const updated = await CustomFee.findOneAndUpdate(
      { feeId },
      { $set: allowedUpdates },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Custom fee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customFee: JSON.parse(JSON.stringify(updated)) });
  } catch (error: any) {
    const status = error.message?.includes('Not auth') ? 401 : error.message?.includes('Insufficient') || error.message?.includes('Not authorized') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed' }, { status });
  }
}

/**
 * DELETE /api/payments/admin/custom-fees?feeId=...
 * Remove a custom fee.
 */
export async function DELETE(req: NextRequest) {
  try {
    await verifyFeeOfficer();
    const { searchParams } = new URL(req.url);
    const feeId = searchParams.get('feeId');
    if (!feeId) return NextResponse.json({ error: 'feeId required' }, { status: 400 });

    await connectToDatabase();
    await CustomFee.deleteOne({ feeId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const status = error.message?.includes('Not auth') ? 401 : error.message?.includes('Insufficient') || error.message?.includes('Not authorized') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed' }, { status });
  }
}
