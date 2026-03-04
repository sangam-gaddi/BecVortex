/**
 * Server-side RBAC utilities.
 * Re-exports from the shared constants file.
 */
export {
    ROLES,
    DEPARTMENTS,
    DEPARTMENT_LABELS,
    canCreateRole,
    requireRole,
    ROLE_LEVEL,
    ALL_ROLES,
} from '@/lib/auth/rbac-constants';

export type { UserRole, Department } from '@/lib/auth/rbac-constants';
