import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth/session';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import HallTicket from '@/database/models/HallTicket';

const FEE_OFFICER_DEPTS = ['FEE_SECTION', 'EXAMINATION'];

// The two mandatory fee IDs a student must have paid
const REQUIRED_FEES = ['tuition', 'examination'];

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
    throw new Error('Not authorized: must be from Fee Section or Examination department');
  }
  return session;
}

/**
 * GET /api/hall-ticket/admin?usn=&sem=&examMonth=
 * Returns students with their hall-ticket eligibility status.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await verifyFeeOfficer();
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const usnFilter   = searchParams.get('usn')?.toUpperCase().trim();
    const semFilter   = searchParams.get('sem');
    const examMonth   = searchParams.get('examMonth');

    const query: Record<string, any> = {};
    if (usnFilter)  query.usn      = { $regex: usnFilter, $options: 'i' };
    if (semFilter)  query.semester = semFilter;

    const students = await Student.find(query)
      .select('usn studentName department semester degree paidFees registeredSubjects')
      .sort({ semester: 1, usn: 1 })
      .limit(200)
      .lean();

    // Fetch existing hall tickets for the student set (optionally filtered by examMonth)
    const usns = students.map((s: any) => s.usn);
    const htQuery: Record<string, any> = { usn: { $in: usns } };
    if (examMonth) htQuery.examMonth = examMonth;

    const hallTickets = await HallTicket.find(htQuery).lean();
    const htMap: Record<string, any> = {};
    hallTickets.forEach((ht: any) => {
      // key: usn+examMonth; store most-recent if multiple (shouldn't happen due to unique index)
      htMap[`${ht.usn}::${ht.examMonth}`] = ht;
    });

    const enriched = students.map((s: any) => {
      const paidFees: string[] = s.paidFees || [];
      const hasTuition     = paidFees.includes('tuition');
      const hasExamination = paidFees.includes('examination');
      const eligible       = hasTuition && hasExamination;
      const htKey          = examMonth ? `${s.usn}::${examMonth}` : null;
      const hallTicket     = htKey ? (htMap[htKey] || null) : null;

      return {
        usn:          s.usn,
        studentName:  s.studentName,
        department:   s.department,
        semester:     s.semester,
        degree:       s.degree || 'B.E.',
        paidFees,
        registeredSubjects: s.registeredSubjects || [],
        hasTuition,
        hasExamination,
        eligible,
        hallTicket: hallTicket ? {
          _id:         String(hallTicket._id),
          examMonth:   hallTicket.examMonth,
          isValid:     hallTicket.isValid,
          generatedAt: hallTicket.generatedAt,
          generatedBy: hallTicket.generatedBy,
          subjects:    hallTicket.subjects,
        } : null,
      };
    });

    return NextResponse.json({ students: JSON.parse(JSON.stringify(enriched)) });
  } catch (err: any) {
    const status = err.message?.includes('Not auth') ? 401
      : err.message?.includes('Insufficient') || err.message?.includes('Not authorized') ? 403
      : 500;
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}

/**
 * POST /api/hall-ticket/admin
 * Generate a hall ticket for a student (officer action).
 * Body: { usn, examMonth, subjects?: [{subjectCode, subjectName, internalMarks?}] }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifyFeeOfficer();
    await connectToDatabase();

    const body = await req.json();
    const { usn, examMonth, subjects } = body;

    if (!usn || !examMonth) {
      return NextResponse.json({ error: 'usn and examMonth are required' }, { status: 400 });
    }

    const student = await Student.findOne({ usn: usn.toUpperCase() })
      .select('usn studentName department semester degree paidFees registeredSubjects')
      .lean() as any;

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // ── RBAC: verify fee eligibility ──────────────────────────────────────────
    const paidFees: string[] = student.paidFees || [];
    const missingFees = REQUIRED_FEES.filter(f => !paidFees.includes(f));
    if (missingFees.length > 0) {
      const names = missingFees.map(f => f === 'tuition' ? 'Tuition Fee' : 'Examination Fee');
      return NextResponse.json(
        { error: `Cannot generate hall ticket. Pending fees: ${names.join(', ')}` },
        { status: 422 }
      );
    }

    // Build subject list from registered subjects if not provided
    const subjectList = subjects && subjects.length > 0
      ? subjects
      : (student.registeredSubjects || []).map((code: string) => ({
          subjectCode: code,
          subjectName: code,  // fallback; the officer UI can pass names
        }));

    // Upsert — if one exists for the same usn+examMonth, update it
    const hallTicket = await HallTicket.findOneAndUpdate(
      { usn: student.usn, examMonth },
      {
        usn:         student.usn,
        studentName: student.studentName,
        department:  student.department,
        semester:    student.semester,
        degree:      student.degree || 'B.E.',
        examMonth,
        subjects:    subjectList,
        generatedBy: session.userId || 'officer',
        generatedAt: new Date(),
        isValid:     true,
        verifiedFees: { tuition: true, examination: true },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(
      { message: 'Hall ticket generated successfully', hallTicket: JSON.parse(JSON.stringify(hallTicket)) },
      { status: 201 }
    );
  } catch (err: any) {
    const status = err.message?.includes('Not auth') ? 401
      : err.message?.includes('Insufficient') || err.message?.includes('Not authorized') ? 403
      : 500;
    return NextResponse.json({ error: err.message || 'Failed to generate hall ticket' }, { status });
  }
}

/**
 * PATCH /api/hall-ticket/admin
 * Revoke or re-validate a hall ticket.
 * Body: { hallTicketId, isValid: boolean }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await verifyFeeOfficer();
    await connectToDatabase();

    const body = await req.json();
    const { hallTicketId, isValid } = body;

    if (!hallTicketId || typeof isValid !== 'boolean') {
      return NextResponse.json({ error: 'hallTicketId and isValid (boolean) are required' }, { status: 400 });
    }

    const updated = await HallTicket.findByIdAndUpdate(
      hallTicketId,
      { isValid },
      { new: true }
    );
    if (!updated) return NextResponse.json({ error: 'Hall ticket not found' }, { status: 404 });

    return NextResponse.json({
      message: `Hall ticket ${isValid ? 're-validated' : 'revoked'} successfully`,
      hallTicket: JSON.parse(JSON.stringify(updated)),
    });
  } catch (err: any) {
    const status = err.message?.includes('Not auth') ? 401
      : err.message?.includes('Insufficient') || err.message?.includes('Not authorized') ? 403
      : 500;
    return NextResponse.json({ error: err.message || 'Failed' }, { status });
  }
}
