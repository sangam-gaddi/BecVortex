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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveUsnToId(usn: string): Promise<string | null> {
  await connectToDatabase();
  const student = await Student.findOne({ usn: usn.toUpperCase() }).select('_id').lean();
  return student ? (student as any)._id.toString() : null;
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
        return { success: result.success, data: result, error: result.error };
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
        return { success: result.success, data: result, error: result.error };
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
        return { success: result.success, data: result, error: result.error };
      }

      case 'assign_cr': {
        const result = await assignCR(args.studentId as string, args.semester as number);
        return { success: result.success, data: result, error: result.error };
      }

      case 'revoke_cr': {
        const result = await removeCR(args.studentId as string);
        return { success: result.success, data: result, error: result.error };
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
        return { success: result.success, data: result, error: result.error };
      }

      // ── Subjects ────────────────────────────────────────────────
      case 'bulk_assign_subjects': {
        const result = await bulkAssignSubjectsToCleanStudents(args.targetSemester as number);
        return { success: result.success, data: result, error: result.error };
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
          },
        };
      }

      // ── OS commands — handled client-side ──────────────────────
      case 'open_app': {
        return {
          success: true,
          data: { osCommand: { type: 'open_app', appId: args.appId as string } },
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
