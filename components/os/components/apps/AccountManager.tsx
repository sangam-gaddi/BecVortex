"use client";
import { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { useI18n } from '@/components/os/i18n/index';
import { DEPARTMENTS, DEPARTMENT_LABELS, canCreateRole, type Department, type UserRole } from '@/lib/auth/rbac-constants';
import { UserPlus, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Role-specific creation options
const CREATION_MAP: Record<string, { targetRoles: UserRole[]; needsDept: boolean }> = {
    MASTER: { targetRoles: ['PRINCIPAL'], needsDept: false },
    PRINCIPAL: { targetRoles: ['HOD'], needsDept: true },
    HOD: { targetRoles: ['OFFICER', 'FACULTY'], needsDept: false }, // dept auto-set from caller
};

interface AccountManagerProps {
    owner?: string;
    userRole?: string;
    userDepartment?: string;
}

export function AccountManager({ owner, userRole, userDepartment }: AccountManagerProps) {
    console.log('[AccountManager DEBUG] received props:', { owner, userRole, userDepartment });

    const { t } = useI18n();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        email: '',
        role: '' as string,
        department: '' as string,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    // Read session data fallback in case Window props injection drops it
    const [activeRole, setActiveRole] = useState(userRole);
    const [activeDept, setActiveDept] = useState(userDepartment);

    useEffect(() => {
        if (!activeRole && typeof window !== 'undefined') {
            const storedRole = sessionStorage.getItem('bec-vortex-role');
            if (storedRole) setActiveRole(storedRole);
        }
        if (!activeDept && typeof window !== 'undefined') {
            const storedDept = sessionStorage.getItem('bec-vortex-department');
            if (storedDept) setActiveDept(storedDept);
        }
    }, [activeRole, activeDept]);

    const creationConfig = CREATION_MAP[activeRole || ''];
    const targetRoles = creationConfig?.targetRoles || [];
    const needsDeptPicker = creationConfig?.needsDept || false;

    const handleSubmit = async () => {
        if (!formData.username || !formData.password || !formData.fullName || !formData.role) {
            setResult({ success: false, message: 'Please fill all required fields.' });
            return;
        }

        setIsSubmitting(true);
        setResult(null);

        try {
            const payload: any = {
                username: formData.username,
                password: formData.password,
                fullName: formData.fullName,
                email: formData.email || undefined,
                role: formData.role,
            };

            // Department handling
            if (activeRole === 'HOD') {
                // HOD creates in their own department
                payload.department = activeDept;
            } else if (needsDeptPicker && formData.department) {
                payload.department = formData.department;
            }

            const res = await fetch('/api/admin/create-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (res.ok) {
                setResult({ success: true, message: `✅ ${data.user.role} account "${data.user.username}" created successfully!` });
                setFormData({ username: '', password: '', fullName: '', email: '', role: '', department: '' });
            } else {
                setResult({ success: false, message: data.error || 'Failed to create account.' });
            }
        } catch (err) {
            setResult({ success: false, message: 'Network error. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!creationConfig || targetRoles.length === 0) {
        return (
            <AppTemplate
                hasSidebar={false}
                content={
                    <div className="flex items-center justify-center h-full text-white/50">
                        <div className="text-center">
                            <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
                            <p className="text-lg">Your role does not have account creation privileges.</p>
                        </div>
                    </div>
                }
            />
        );
    }

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="p-6 overflow-y-auto h-full">
                    <div className="max-w-lg mx-auto">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                                <UserPlus className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Account Manager</h1>
                                <p className="text-sm text-white/50">
                                    Create {targetRoles.join(' / ')} accounts
                                </p>
                            </div>
                        </div>

                        {/* Role Selector */}
                        <div className="mb-4">
                            <label className="block text-sm text-white/70 mb-2">Account Type *</label>
                            <div className="flex gap-2">
                                {targetRoles.map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => setFormData(prev => ({ ...prev, role }))}
                                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${formData.role === role
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                            }`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-white/70 mb-1.5">Username *</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-blue-500/50 transition-colors"
                                    placeholder="e.g. john.doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-white/70 mb-1.5">Full Name *</label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-blue-500/50 transition-colors"
                                    placeholder="e.g. Dr. John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-white/70 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-blue-500/50 transition-colors"
                                    placeholder="e.g. john@bec.edu"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-white/70 mb-1.5">Password *</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 outline-none focus:border-blue-500/50 transition-colors"
                                    placeholder="Set a secure password"
                                />
                            </div>

                            {/* Department Picker (for PRINCIPAL creating HOD) */}
                            {needsDeptPicker && (
                                <div>
                                    <label className="block text-sm text-white/70 mb-1.5">Department *</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white outline-none focus:border-blue-500/50 transition-colors [&>option]:bg-gray-900"
                                    >
                                        <option value="">Select department...</option>
                                        {DEPARTMENTS.map((dept) => (
                                            <option key={dept} value={dept}>
                                                {DEPARTMENT_LABELS[dept]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* HOD auto-department indicator */}
                            {userRole === 'HOD' && userDepartment && (
                                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                    <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span className="text-sm text-amber-300">
                                        Account will be created in your department: <strong>{DEPARTMENT_LABELS[userDepartment as Department] || userDepartment}</strong>
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Result Message */}
                        {result && (
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${result.success
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/10 border border-red-500/20 text-red-300'
                                }`}>
                                {result.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                                {result.message}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.role || !formData.username || !formData.password || !formData.fullName}
                            className="w-full mt-6 py-3 px-6 rounded-xl font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <UserPlus className="w-4 h-4" />
                                    Create Account
                                </>
                            )}
                        </button>
                    </div>
                </div>
            }
        />
    );
}
