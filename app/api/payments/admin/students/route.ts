import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import Payment from '@/database/models/Payment';
import CustomFee from '@/database/models/CustomFee';

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
 * GET /api/payments/admin/students?sem=3&usn=2BK22CS001
 * Returns list of students with their fee status.
 */
export async function GET(req: NextRequest) {
  try {
    await verifyFeeOfficer();
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const usn = searchParams.get('usn')?.toUpperCase();
    const sem = searchParams.get('sem');

    let query: any = {};
    if (usn) query.usn = { $regex: usn, $options: 'i' };
    if (sem) query.semester = sem;

    const students = await Student.find(query)
      .select('usn studentName department semester paidFees paymentCategory')
      .sort({ semester: 1, usn: 1 })
      .limit(100)
      .lean();

    // Enrich with custom fees and payment history for each student
    const usns = students.map((s: any) => s.usn);
    const customFees = await CustomFee.find({ studentUsn: { $in: usns } }).lean();
    const payments = await Payment.find({ usn: { $in: usns }, status: 'completed' })
      .sort({ createdAt: -1 })
      .lean();

    const customFeeMap: Record<string, any[]> = {};
    customFees.forEach((cf: any) => {
      if (!customFeeMap[cf.studentUsn]) customFeeMap[cf.studentUsn] = [];
      customFeeMap[cf.studentUsn].push(cf);
    });

    const paymentMap: Record<string, any[]> = {};
    payments.forEach((p: any) => {
      if (!paymentMap[p.usn]) paymentMap[p.usn] = [];
      paymentMap[p.usn].push(p);
    });

    const enriched = students.map((s: any) => ({
      ...s,
      customFees: customFeeMap[s.usn] || [],
      payments: paymentMap[s.usn] || [],
    }));

    return NextResponse.json({ students: JSON.parse(JSON.stringify(enriched)) });
  } catch (error: any) {
    const status = error.message?.includes('Not auth') ? 401 : error.message?.includes('Insufficient') || error.message?.includes('Not authorized') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Failed' }, { status });
  }
}
