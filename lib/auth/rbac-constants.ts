/**
 * Shared RBAC constants and types.
 * This file is safe for client-side use (no mongoose/server deps).
 */

// ── Role Hierarchy ──
export const ROLES = ['MASTER', 'PRINCIPAL', 'HOD', 'OFFICER', 'FACULTY'] as const;
export type UserRole = typeof ROLES[number];

// ── Departments ──
export const DEPARTMENTS = [
    'EXAMINATION',
    'FEE_SECTION',
    'ADMISSION',
    'SCHOLARSHIP',
    'CS',
    'IS',
    'EC',
    'AI_ML',
    'EE',
    'MECH_CIVIL',
] as const;
export type Department = typeof DEPARTMENTS[number];

// Human-readable labels
export const DEPARTMENT_LABELS: Record<Department, string> = {
    EXAMINATION: 'Examination Department',
    FEE_SECTION: 'Fee Section',
    ADMISSION: 'Admission',
    SCHOLARSHIP: 'Scholarship',
    CS: 'Computer Science',
    IS: 'Information Science',
    EC: 'Electronics & Communication',
    AI_ML: 'AI & Machine Learning',
    EE: 'Electrical Engineering',
    MECH_CIVIL: 'Mechanical & Civil Engineering',
};

// ── Creation Permission Matrix ──
const CREATION_PERMISSIONS: Record<string, UserRole[]> = {
    MASTER: ['PRINCIPAL'],
    PRINCIPAL: ['HOD'],
    HOD: ['OFFICER', 'FACULTY'],
    OFFICER: [],
    FACULTY: [],
};

export function canCreateRole(callerRole: UserRole, targetRole: UserRole): boolean {
    const allowed = CREATION_PERMISSIONS[callerRole];
    if (!allowed) return false;
    return allowed.includes(targetRole);
}

export const ROLE_LEVEL: Record<UserRole, number> = {
    MASTER: 0,
    PRINCIPAL: 1,
    HOD: 2,
    OFFICER: 3,
    FACULTY: 3,
};

export function requireRole(
    sessionRole: string | undefined,
    ...allowedRoles: UserRole[]
): asserts sessionRole is UserRole {
    if (!sessionRole || !allowedRoles.includes(sessionRole as UserRole)) {
        throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }
}

export const ALL_ROLES: UserRole[] = ['MASTER', 'PRINCIPAL', 'HOD', 'OFFICER', 'FACULTY'];
