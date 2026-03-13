/**
 * VORA Tool Executor
 * Maps tool names → real server actions / DB operations.
 * Called exclusively from the /api/agent/chat route handler (server-side only).
 * NOT a Next.js Server Action file — do not add 'use server'.
 */

import { VoraToolCall, VoraToolResult, VoraSession } from './types';
import { canUseTool } from './rbac';
import { connectToDatabase } from '@/database/mongoose';
import Student from '@/database/models/Student';
import User from '@/database/models/User';
import Payment from '@/database/models/Payment';
import CustomFee from '@/database/models/CustomFee';
import { canCreateRole, ROLES, DEPARTMENTS } from '@/lib/auth/rbac-constants';
import { hashPassword } from '@/lib/auth/password';
import type { UserRole, Department } from '@/lib/auth/rbac-constants';

// Server actions (callable from server-side route handlers)
import { saveStudentMarks }                     from '@/lib/actions/grade.actions';
import { submitRapidAttendance }                 from '@/lib/actions/attendance.actions';
import {
  getOfficerPendingRequests,
  processRegistrationRequest,
  submitRegistrationRequest,
}                                                from '@/lib/actions/registration.actions';
import {
  getDepartmentFaculties,
  assignSubjectToFaculty,
  assignCR,
  removeCR,
}                                                from '@/lib/actions/faculty.actions';
import { registerStudent }                       from '@/lib/actions/admission.actions';
import { bulkAssignSubjectsToCleanStudents }      from '@/lib/actions/subject.actions';

const STANDARD_FEE_MAP: Record<string, { name: string; amount: number }> = {
  tuition: { name: 'Tuition Fee', amount: 75000 },
  development: { name: 'Development Fee', amount: 15000 },
  hostel: { name: 'Hostel Fee', amount: 45000 },
  examination: { name: 'Examination Fee', amount: 5000 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveUsnToId(usn: string): Promise<string | null> {
  await connectToDatabase();
  const student = await Student.findOne({ usn: usn.toUpperCase() }).select('_id').lean();
  return student ? (student as any)._id.toString() : null;
}

async function getCurrentStudentBySession(session: VoraSession) {
  await connectToDatabase();
  const student = await Student.findOne({ usn: session.usn.toUpperCase() }).lean();
  return student as any;
}

function matchReceipt(payment: any, token: string): boolean {
  const query = token.toUpperCase();
  const queryCompact = query.replace(/[^A-Z0-9]/g, '');
  const idPrefix = payment._id?.toString?.().substring(0, 8)?.toUpperCase() ?? '';
  const candidates = [
    payment._id?.toString?.() ?? '',
    idPrefix,
    payment.transactionHash ?? '',
    payment.challanId ?? '',
    payment.bankReferenceId ?? '',
    payment.receiptNo ?? '',
    payment.receiptData?.receiptNo ?? '',
    payment.reference ?? '',
  ].map((v) => String(v).toUpperCase());
  return candidates.some((v) => {
    const compact = v.replace(/[^A-Z0-9]/g, '');
    return v === query || v.includes(query) || compact === queryCompact || compact.includes(queryCompact);
  });
}

function normalizeAppId(appId: string): string {
  const raw = String(appId || '').trim().toLowerCase();
  if (!raw) return raw;

  const aliases: Record<string, string> = {
    'becbilldesk': 'bec-pay',
    'billdesk': 'bec-pay',
    'feereceiptdownload': 'download-receipts',
    'fee-receipt-download': 'download-receipts',
    'fee-receipt-downloader': 'download-receipts',
    'fee-receipt-downloader-app': 'download-receipts',
    'my-receipts': 'download-receipts',
    'receipt-download': 'download-receipts',
  };

  return aliases[raw] ?? raw;
}

// ── Main executor ─────────────────────────────────────────────────────────────

export async function executeToolCall(
  toolCall: VoraToolCall,
  session: VoraSession
): Promise<VoraToolResult> {
  const { name, arguments: args } = toolCall;

  // RBAC guard — first line of defence
  if (!canUseTool(name, session.role)) {
    return {
      success: false,
      error: `Access denied: your role (${session.role}) cannot use the '${name}' tool.`,
    };
  }

  try {
    switch (name) {

      // ── Grade ───────────────────────────────────────────────────
      case 'upload_marks': {
        await connectToDatabase();
        const studentDoc = await Student.findOne(
          { usn: (args.studentUsn as string).toUpperCase() }
        ).select('_id currentSemester usn').lean();
        if (!studentDoc) {
          return { success: false, error: `No student found with USN "${args.studentUsn}".` };
        }
        const studentId  = (studentDoc as any)._id.toString();
        // Always use the student's actual enrolled semester — never trust the LLM's guess
        const resolvedSemester: number = (studentDoc as any).currentSemester ?? (args.semester as number);
        const result = await saveStudentMarks(
          studentId,
          args.subjectCode as string,
          resolvedSemester,
          args.examType as 'cie1' | 'cie2' | 'assignment' | 'see',
          args.rawMarks as number
        );
        return {
          success: result.success ?? true,
          data: {
            ...result,
            usn: (args.studentUsn as string).toUpperCase(),
            semesterUsed: resolvedSemester,
            osCommand: { type: 'open_app', appId: 'marks-upload' },
          },
          error: (result as any).error,
        };
      }

      // ── Attendance ──────────────────────────────────────────────
      case 'mark_absent': {
        const absentUsns = (args.absentStudentUsns as string[]) ?? [];
        const absentStudentIds: string[] = [];
        for (const usn of absentUsns) {
          const id = await resolveUsnToId(usn);
          if (id) absentStudentIds.push(id);
        }
        const result = await submitRapidAttendance({
          subjectCode:      args.subjectCode as string,
          semester:         args.semester as number,
          topicTaught:      args.topicTaught as string,
          date:             new Date(args.date as string),
          timeSlot:         args.timeSlot as string,
          absentStudentIds,
        });
        return {
          success: result.success,
          data: {
            ...result,
            osCommand: { type: 'open_app', appId: 'attendance-upload' },
          },
          error: result.error,
        };
      }

      // ── Registration ────────────────────────────────────────────
      case 'list_pending_registrations': {
        const result = await getOfficerPendingRequests();
        return { success: result.success, data: (result as any).requests ?? result, error: result.error };
      }

      case 'approve_registration': {
        const result = await processRegistrationRequest(
          args.requestId as string,
          'APPROVED',
          args.remarks as string | undefined
        );
        return { success: result.success, data: result, error: result.error };
      }

      case 'reject_registration': {
        const result = await processRegistrationRequest(
          args.requestId as string,
          'REJECTED',
          args.remarks as string | undefined
        );
        return { success: result.success, data: result, error: result.error };
      }

      case 'submit_registration': {
        const result = await submitRegistrationRequest({
          regularSubjects:   args.regularSubjects as string[],
          requestedBacklogs: (args.requestedBacklogs as string[]) ?? [],
          semester:          args.semester as number,
          branch:            args.branch as string,
        });
        return {
          success: result.success,
          data: {
            ...result,
            osCommand: { type: 'open_app', appId: 'course-registration' },
          },
          error: result.error,
        };
      }

      // ── Student context / fees / receipts ──────────────────────
      case 'get_my_student_context': {
        const student = await getCurrentStudentBySession(session);
        if (!student) return { success: false, error: 'Student profile not found for current session.' };
        return {
          success: true,
          data: {
            usn: student.usn,
            studentName: student.studentName,
            department: student.department,
            semester: student.semester,
            currentSemester: student.currentSemester,
            paymentCategory: student.paymentCategory,
            registeredSubjects: student.registeredSubjects ?? [],
            backlogs: student.backlogs ?? [],
            paidFees: student.paidFees ?? [],
            osCommand: { type: 'open_app', appId: 'bec-portal' },
          },
        };
      }

      case 'get_my_fee_overview': {
        const student = await getCurrentStudentBySession(session);
        if (!student) return { success: false, error: 'Student profile not found for current session.' };

        const paidFeeIds = new Set<string>((student.paidFees ?? []).map((f: string) => f.toLowerCase()));
        const standardFees = Object.entries(STANDARD_FEE_MAP).map(([id, def]) => ({
          id,
          name: def.name,
          amount: def.amount,
          status: paidFeeIds.has(id) ? 'paid' : 'pending',
        }));

        const customFees = await CustomFee.find({ studentUsn: student.usn }).sort({ createdAt: -1 }).lean();
        const payments = await Payment.find({ usn: student.usn }).sort({ createdAt: -1 }).limit(20).lean();

        return {
          success: true,
          data: {
            usn: student.usn,
            standardFees,
            customFees,
            recentPayments: payments,
            osCommand: { type: 'open_app', appId: 'bec-pay' },
          },
        };
      }

      case 'calculate_my_selected_fees': {
        const student = await getCurrentStudentBySession(session);
        if (!student) return { success: false, error: 'Student profile not found for current session.' };

        const feeIds = ((args.feeIds as string[]) ?? []).map((f) => f.toLowerCase());
        const invalid = feeIds.filter((id) => !STANDARD_FEE_MAP[id]);
        if (invalid.length > 0) {
          return { success: false, error: `Invalid fee IDs: ${invalid.join(', ')}.` };
        }

        const selected = feeIds.map((id) => ({ id, ...STANDARD_FEE_MAP[id] }));
        const total = selected.reduce((sum, f) => sum + f.amount, 0);
        const paidSet = new Set<string>((student.paidFees ?? []).map((f: string) => f.toLowerCase()));
        const alreadyPaid = selected.filter((f) => paidSet.has(f.id)).map((f) => f.id);

        return {
          success: true,
          data: {
            feeIds,
            selected,
            total,
            alreadyPaid,
            osCommand: { type: 'open_app', appId: 'bec-pay' },
          },
        };
      }

      case 'open_payment_for_selected_fees': {
        const student = await getCurrentStudentBySession(session);
        if (!student) return { success: false, error: 'Student profile not found for current session.' };

        const feeIds = ((args.feeIds as string[]) ?? []).map((f) => f.toLowerCase());
        if (feeIds.length === 0) return { success: false, error: 'At least one fee ID is required.' };

        const invalid = feeIds.filter((id) => !STANDARD_FEE_MAP[id]);
        if (invalid.length > 0) {
          return { success: false, error: `Invalid fee IDs: ${invalid.join(', ')}.` };
        }

        const total = feeIds.reduce((sum, id) => sum + STANDARD_FEE_MAP[id].amount, 0);
        return {
          success: true,
          data: {
            usn: student.usn,
            feeIds,
            total,
            message: 'Payment app opened. Continue with payment flow.',
            osCommand: { type: 'open_app', appId: 'bec-pay' },
          },
        };
      }

      case 'verify_my_fee_receipt': {
        const student = await getCurrentStudentBySession(session);
        if (!student) return { success: false, error: 'Student profile not found for current session.' };

        const token = String(args.receiptId || args.receipt_id || '').trim();
        if (!token) return { success: false, error: 'receiptId is required.' };

        const usnRegex = new RegExp(`^${String(student.usn).trim()}$`, 'i');
        const payments = await Payment.find({ usn: usnRegex }).sort({ createdAt: -1 }).lean();
        const payment = (payments as any[]).find((p) => matchReceipt(p, token));

        if (!payment) {
          return { success: false, error: `No receipt/payment found for identifier "${token}" in your account.` };
        }

        return {
          success: true,
          data: {
            paymentId: payment._id?.toString?.(),
            receiptNo: payment._id?.toString?.().substring(0, 8)?.toUpperCase?.(),
            amount: payment.amount,
            status: payment.status,
            paymentMethod: payment.paymentMethod,
            feeIds: payment.feeIds,
            createdAt: payment.createdAt,
            reference: payment.transactionHash || payment.challanId || payment.bankReferenceId || payment._id?.toString?.(),
            osCommand: { type: 'open_app', appId: 'fee-check' },
          },
        };
      }

      case 'download_my_fee_receipt': {
        const student = await getCurrentStudentBySession(session);
        if (!student) return { success: false, error: 'Student profile not found for current session.' };

        const token = String(args.receiptId || args.receipt_id || '').trim();
        if (!token) return { success: false, error: 'receiptId is required.' };

        const usnRegex = new RegExp(`^${String(student.usn).trim()}$`, 'i');
        const payments = await Payment.find({ usn: usnRegex }).sort({ createdAt: -1 }).lean();
        const payment = (payments as any[]).find((p) => matchReceipt(p, token));

        if (!payment) {
          return { success: false, error: `No receipt/payment found for identifier "${token}" in your account.` };
        }

        return {
          success: true,
          data: {
            paymentId: payment._id?.toString?.(),
            receiptNo: payment._id?.toString?.().substring(0, 8)?.toUpperCase?.(),
            amount: payment.amount,
            paymentMethod: payment.paymentMethod,
            createdAt: payment.createdAt,
            feeIds: payment.feeIds,
            message: 'Receipt located. Opening My Receipts app for download.',
            osCommand: { type: 'open_app', appId: 'download-receipts' },
          },
        };
      }

      // ── Faculty management ──────────────────────────────────────
      case 'list_department_faculty': {
        const result = await getDepartmentFaculties();
        return { success: result.success, data: (result as any).faculties ?? result, error: result.error };
      }

      case 'assign_teaching': {
        const result = await assignSubjectToFaculty(
          args.facultyId   as string,
          args.subjectCode as string,
          args.semester    as number,
          args.section     as string | undefined
        );
        return {
          success: result.success,
          data: {
            ...result,
            osCommand: { type: 'open_app', appId: 'teaching-assigner' },
          },
          error: result.error,
        };
      }

      case 'assign_cr': {
        const result = await assignCR(args.studentId as string, args.semester as number);
        return {
          success: result.success,
          data: {
            ...result,
            osCommand: { type: 'open_app', appId: 'cr-assigner' },
          },
          error: result.error,
        };
      }

      case 'revoke_cr': {
        const result = await removeCR(args.studentId as string);
        return {
          success: result.success,
          data: {
            ...result,
            osCommand: { type: 'open_app', appId: 'cr-assigner' },
          },
          error: result.error,
        };
      }

      // ── Admission ───────────────────────────────────────────────
      case 'admit_student': {
        const result = await registerStudent({
          studentName:     args.studentName     as string,
          department:      args.department      as string,
          semester:        args.semester        as string,
          degree:          (args.degree         as string) || 'B.E.',
          stdType:         'Regular',
          casteCat:        'General',
          entryType:       args.entryType       as 'Regular 1st Year' | 'Lateral Entry - Diploma' | 'Lateral Entry - B.Sc.',
          paymentCategory: args.paymentCategory as 'KCET' | 'COMEDK' | 'Management' | 'NRI',
          email:           args.email           as string | undefined,
          phone:           args.phone           as string | undefined,
        });
        return {
          success: result.success,
          data: {
            ...result,
            osCommand: { type: 'open_app', appId: 'admit-app' },
          },
          error: result.error,
        };
      }

      // ── Subjects ────────────────────────────────────────────────
      case 'bulk_assign_subjects': {
        const result = await bulkAssignSubjectsToCleanStudents(args.targetSemester as number);
        return {
          success: result.success,
          data: {
            ...result,
            osCommand: { type: 'open_app', appId: 'subject-assigner' },
          },
          error: result.error,
        };
      }

      // ── Account creation (inline — avoids HTTP round-trip) ──────
      case 'create_account': {
        await connectToDatabase();

        const targetRole = args.role as string;
        if (!ROLES.includes(targetRole as UserRole)) {
          return { success: false, error: `Invalid role "${targetRole}". Must be one of: ${ROLES.join(', ')}.` };
        }

        if (!canCreateRole(session.role as UserRole, targetRole as UserRole)) {
          return {
            success: false,
            error: `Your role (${session.role}) is not allowed to create ${targetRole} accounts.`,
          };
        }

        const dept = args.department as string | undefined;
        if (['HOD', 'OFFICER', 'FACULTY'].includes(targetRole)) {
          if (!dept) {
            return { success: false, error: `Department is required when creating a ${targetRole} account.` };
          }
          if (!DEPARTMENTS.includes(dept as Department)) {
            return { success: false, error: `Invalid department "${dept}".` };
          }
        }

        const username = (args.username as string).toLowerCase().trim();
        const existing = await User.findOne({ username });
        if (existing) {
          return { success: false, error: `Username "${username}" is already taken.` };
        }

        const hashed = await hashPassword(args.password as string);
        const newUser = await User.create({
          username,
          password:   hashed,
          fullName:   args.fullName as string,
          email:      args.email as string | undefined,
          role:       targetRole,
          department: dept,
          createdBy:  session.userId,
          isActive:   true,
        });

        return {
          success: true,
          data: {
            message:  `Account created for ${args.fullName} (${targetRole}).`,
            userId:   newUser._id.toString(),
            username: newUser.username,
            reminder: 'Please ask the user to change their password after first login.',
            osCommand: { type: 'open_app', appId: 'account-manager' },
          },
        };
      }

      // ── OS commands — handled client-side ──────────────────────
      case 'open_app': {
        const appId = normalizeAppId(String(args.appId as string));
        return {
          success: true,
          data: { osCommand: { type: 'open_app', appId } },
        };
      }

      case 'close_app': {
        return {
          success: true,
          data: { osCommand: { type: 'close_app', appId: args.appId as string } },
        };
      }

      default:
        return { success: false, error: `Unknown tool: "${name}".` };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Tool execution failed.';
    return { success: false, error: message };
  }
}
