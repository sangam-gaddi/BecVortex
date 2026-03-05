import { VoraTool, VoraRole } from './types';

/**
 * Complete tool registry.
 * requiredRoles are tightly matched to the underlying server-action role guards
 * to avoid silent RBAC failures at the action layer.
 */
export const TOOL_REGISTRY: VoraTool[] = [
  // ── Grade ─────────────────────────────────────────────────────────
  {
    name: 'upload_marks',
    description:
      'Upload marks for a single student in a subject. VTU conversion is applied automatically: ' +
      'cie1/cie2 are out of 40 and stored as /20; assignment is out of 20 and stored as /10; ' +
      'see is out of 100 and stored as-is. Provide the student USN — it will be resolved automatically.',
    parameters: {
      studentUsn:  { type: 'string', description: 'Student USN (e.g. 2BA23CS001)', required: true },
      subjectCode: { type: 'string', description: 'Subject code (e.g. 23CS41)', required: true },
      semester:    { type: 'number', description: 'Semester number 1–8. If unsure, omit — the system will auto-resolve from the student record.', required: false },
      examType:    { type: 'string', description: 'Exam type: cie1 | cie2 | assignment | see', required: true, enum: ['cie1', 'cie2', 'assignment', 'see'] },
      rawMarks:    { type: 'number', description: 'Raw marks as entered on paper (max 40 for cie1/cie2, 20 for assignment, 100 for see)', required: true },
    },
    requiredRoles: ['FACULTY'],
  },

  // ── Attendance ────────────────────────────────────────────────────
  {
    name: 'mark_absent',
    description:
      'Record attendance for a class period. Pass the USNs of absent students — all other enrolled ' +
      'students are automatically marked present.',
    parameters: {
      subjectCode:        { type: 'string', description: 'Subject code', required: true },
      semester:           { type: 'number', description: 'Semester number', required: true },
      topicTaught:        { type: 'string', description: 'Topic covered in this period', required: true },
      date:               { type: 'string', description: 'Date of the class in YYYY-MM-DD format', required: true },
      timeSlot:           { type: 'string', description: 'Time slot, e.g. "09:00-10:00"', required: true },
      absentStudentUsns:  { type: 'array',  description: 'Array of USNs for absent students', required: true, items: { type: 'string' } },
    },
    requiredRoles: ['FACULTY'],
  },

  // ── Registration ──────────────────────────────────────────────────
  {
    name: 'list_pending_registrations',
    description: 'List all student semester registration requests that are pending OFFICER approval.',
    parameters: {},
    requiredRoles: ['OFFICER'],
  },
  {
    name: 'approve_registration',
    description: 'Approve a pending student semester registration request by its request ID.',
    parameters: {
      requestId: { type: 'string', description: 'MongoDB ObjectId of the registration request', required: true },
      remarks:   { type: 'string', description: 'Optional approval remarks', required: false },
    },
    requiredRoles: ['OFFICER'],
  },
  {
    name: 'reject_registration',
    description: 'Reject a pending student semester registration request by its request ID.',
    parameters: {
      requestId: { type: 'string', description: 'MongoDB ObjectId of the registration request', required: true },
      remarks:   { type: 'string', description: 'Reason for rejection (recommended)', required: false },
    },
    requiredRoles: ['OFFICER'],
  },
  {
    name: 'submit_registration',
    description: 'Submit a semester registration request for the current student.',
    parameters: {
      semester:          { type: 'number', description: 'Semester to register for', required: true },
      branch:            { type: 'string', description: 'Branch/department code e.g. CS, EC, ME', required: true },
      regularSubjects:   { type: 'array',  description: 'Array of regular subject codes to enroll in', required: true, items: { type: 'string' } },
      requestedBacklogs: { type: 'array',  description: 'Array of backlog subject codes (max 2, optional)', required: false, items: { type: 'string' } },
    },
    requiredRoles: ['STUDENT'],
  },

  // ── Faculty management ────────────────────────────────────────────
  {
    name: 'list_department_faculty',
    description: 'List all faculty members in your department.',
    parameters: {},
    requiredRoles: ['HOD'],
  },
  {
    name: 'assign_teaching',
    description: 'Assign a subject to a faculty member for a given semester.',
    parameters: {
      facultyId:   { type: 'string', description: 'MongoDB ObjectId of the faculty user', required: true },
      subjectCode: { type: 'string', description: 'Subject code to assign', required: true },
      semester:    { type: 'number', description: 'Semester number', required: true },
      section:     { type: 'string', description: 'Section identifier (optional)', required: false },
    },
    requiredRoles: ['HOD'],
  },
  {
    name: 'assign_cr',
    description: 'Designate a student as Class Representative (CR) for a semester.',
    parameters: {
      studentId: { type: 'string', description: 'MongoDB ObjectId of the student to make CR', required: true },
      semester:  { type: 'number', description: 'Semester for which to assign CR', required: true },
    },
    requiredRoles: ['HOD'],
  },
  {
    name: 'revoke_cr',
    description: 'Remove the CR designation from a student.',
    parameters: {
      studentId: { type: 'string', description: 'MongoDB ObjectId of the student to remove CR from', required: true },
    },
    requiredRoles: ['HOD'],
  },

  // ── Admission ─────────────────────────────────────────────────────
  {
    name: 'admit_student',
    description:
      'Register a new student admission into the college. ' +
      'Only accessible to the ADMISSION department OFFICER.',
    parameters: {
      studentName:     { type: 'string', description: 'Full name of the student', required: true },
      department:      { type: 'string', description: 'Branch code: CV | ME | EE | CS | EC | IP | IS | BT | AI | AU | UE', required: true, enum: ['CV', 'ME', 'EE', 'CS', 'EC', 'IP', 'IS', 'BT', 'AI', 'AU', 'UE'] },
      semester:        { type: 'string', description: '"1" for Regular 1st Year, "3" for Lateral Entry', required: true, enum: ['1', '3'] },
      entryType:       { type: 'string', description: 'Entry type', required: true, enum: ['Regular 1st Year', 'Lateral Entry - Diploma', 'Lateral Entry - B.Sc.'] },
      paymentCategory: { type: 'string', description: 'Fee category', required: true, enum: ['KCET', 'COMEDK', 'Management', 'NRI'] },
      degree:          { type: 'string', description: 'Degree name, defaults to B.E.', required: false },
      email:           { type: 'string', description: 'Student email (optional)', required: false },
      phone:           { type: 'string', description: 'Student phone number (optional)', required: false },
    },
    requiredRoles: ['OFFICER'],
  },

  // ── Subjects ──────────────────────────────────────────────────────
  {
    name: 'bulk_assign_subjects',
    description:
      'Bulk-assign standard VTU subjects to all students in a target semester who have none yet.',
    parameters: {
      targetSemester: { type: 'number', description: 'Semester number to assign subjects to (1–8)', required: true },
    },
    requiredRoles: ['OFFICER'],
  },

  // ── Accounts ──────────────────────────────────────────────────────
  {
    name: 'create_account',
    description:
      'Create a new staff account. Hierarchy applies: MASTER→PRINCIPAL, PRINCIPAL→HOD, HOD→OFFICER/FACULTY. ' +
      'Warn the user to change the initial password after creation.',
    parameters: {
      username:   { type: 'string', description: 'Login username', required: true },
      password:   { type: 'string', description: 'Initial password', required: true },
      fullName:   { type: 'string', description: 'Full name of the new user', required: true },
      role:       { type: 'string', description: 'Role: MASTER | PRINCIPAL | HOD | OFFICER | FACULTY', required: true, enum: ['MASTER', 'PRINCIPAL', 'HOD', 'OFFICER', 'FACULTY'] },
      department: { type: 'string', description: 'Department code (required for HOD/OFFICER/FACULTY)', required: false, enum: ['CV', 'ME', 'EE', 'CS', 'EC', 'IP', 'IS', 'BT', 'AI', 'AU', 'UE', 'ADMISSION', 'SCHOLARSHIP'] },
      email:      { type: 'string', description: 'Email address (optional)', required: false },
    },
    requiredRoles: ['MASTER', 'PRINCIPAL', 'HOD'],
  },

  // ── OS shortcuts ──────────────────────────────────────────────────
  {
    name: 'open_app',
    description:
      'Open an application window in the BEC OS. ' +
      'Use the exact appId. Available apps and their IDs:\n' +
      '  bec-chat (chat), bec-pay (payments), bec-portal (student portal),\n' +
      '  account-manager (create staff accounts), admit-app (admit students),\n' +
      '  subject-directory (browse subjects), subject-assigner (bulk assign subjects),\n' +
      '  re-registration (approve student registrations), course-registration (student registration),\n' +
      '  teaching-assigner (assign subjects to faculty), faculty-dashboard (faculty overview),\n' +
      '  marks-upload (upload marks), attendance-upload (record attendance),\n' +
      '  cr-assigner (assign class rep), dev-center (developer tools),\n' +
      '  finder (file manager), settings, notepad, calendar, music, photos, browser, terminal',
    parameters: {
      appId: { type: 'string', description: 'Exact application ID from the list above', required: true },
    },
    requiredRoles: ['MASTER', 'PRINCIPAL', 'HOD', 'OFFICER', 'FACULTY', 'STUDENT'],
  },
  {
    name: 'close_app',
    description: 'Close an open application window in the BEC OS by its app ID.',
    parameters: {
      appId: { type: 'string', description: 'Exact application ID to close (same IDs as open_app)', required: true },
    },
    requiredRoles: ['MASTER', 'PRINCIPAL', 'HOD', 'OFFICER', 'FACULTY', 'STUDENT'],
  },
];

/**
 * Convert a TOOL_REGISTRY subset into the Ollama tool-calling wire format.
 */
export function toOllamaTools(tools: VoraTool[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object' as const,
        properties: Object.fromEntries(
          Object.entries(t.parameters).map(([key, param]) => {
            const prop: Record<string, unknown> = {
              type: param.type,
              description: param.description,
            };
            if (param.enum)  prop.enum  = param.enum;
            if (param.items) prop.items = param.items;
            return [key, prop];
          })
        ),
        required: Object.entries(t.parameters)
          .filter(([, p]) => p.required)
          .map(([k]) => k),
      },
    },
  }));
}
