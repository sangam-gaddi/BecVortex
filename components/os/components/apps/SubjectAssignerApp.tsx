"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getStudentsForBranch, bulkAssignSubjectsToCleanStudents, getOfficerSessionInfo } from '@/lib/actions/subject.actions';
import { Users, User, Play, Loader2, CheckCircle, Search, ShieldAlert, ChevronDown, ChevronUp, AlertTriangle, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubjectAssignerApp() {
    const [semester, setSemester] = useState(1);
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [bulkAssigning, setBulkAssigning] = useState(false);
    const [activeBranch, setActiveBranch] = useState<string>('...');
    const [sessionError, setSessionError] = useState<string | null>(null);
    // Track which student cards have their subjects expanded
    const [expandedStudents, setExpandedStudents] = useState<Record<string, boolean>>({});

    useEffect(() => {
        getOfficerSessionInfo().then((res) => {
            if (res.success && res.department) {
                setActiveBranch(res.department);
            } else {
                setActiveBranch('N/A');
                setSessionError(res.error || 'Could not verify officer session.');
            }
        });
    }, []);

    const handleFetchStudents = async () => {
        setLoading(true);
        setExpandedStudents({});
        const res = await getStudentsForBranch(semester);
        if (res.success) {
            if (res.officerBranch) setActiveBranch(res.officerBranch);
            setStudents(res.students ?? []);
            if ((res.students ?? []).length === 0) {
                toast('No students found in this branch for Sem ' + semester, { icon: '🔍' });
            } else {
                toast.success(`Found ${res.students?.length ?? 0} students in ${res.officerBranch || activeBranch} — Sem ${semester}`, { duration: 3000 });
            }
        } else {
            toast.error(String(res.error || 'Failed to fetch students'));
        }
        setLoading(false);
    };

    const handleBulkAssign = () => {
        const cleanCount = students.filter(s => (!s.backlogs || s.backlogs.length === 0) && (!s.registeredSubjects || s.registeredSubjects.length === 0)).length;
        // Toast-based confirm dialog instead of native alert
        toast(
            (t) => (
                <div className="flex flex-col gap-3 min-w-[260px]">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                        <p className="font-bold text-white text-sm">Confirm Bulk Assignment</p>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                        This will assign standard Sem <strong className="text-white">{semester}</strong> subjects to <strong className="text-emerald-400">{cleanCount} clean</strong> students in branch <strong className="text-blue-400">{activeBranch}</strong>.
                        Students with backlogs are automatically skipped.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                setBulkAssigning(true);
                                const assignToast = toast.loading(`Assigning subjects to ${cleanCount} students...`);
                                const res = await bulkAssignSubjectsToCleanStudents(semester);
                                toast.dismiss(assignToast);
                                setBulkAssigning(false);
                                if (res.success) {
                                    toast.success(res.message, { duration: 5000 });
                                    handleFetchStudents();
                                } else {
                                    toast.error(String(res.error || 'Bulk assignment failed.'));
                                }
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-bold transition-colors"
                        >
                            ✓ Confirm & Assign
                        </button>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ),
            {
                duration: 15000,
                style: { background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '16px' }
            }
        );
    };

    const toggleStudentExpand = (id: string) => {
        setExpandedStudents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (sessionError) {
        return (
            <AppTemplate hasSidebar={false} content={
                <div className="flex items-center justify-center h-full text-white/50">
                    <div className="text-center">
                        <ShieldAlert className="w-16 h-16 mx-auto mb-4 opacity-30 text-red-400" />
                        <p className="text-lg text-red-300">Authorization Error</p>
                        <p className="text-sm text-white/40 mt-2">{sessionError}</p>
                    </div>
                </div>
            } />
        );
    }

    const cleanCount = students.filter(s => (!s.backlogs || s.backlogs.length === 0) && (!s.registeredSubjects || s.registeredSubjects.length === 0)).length;
    const assignedCount = students.filter(s => s.registeredSubjects && s.registeredSubjects.length > 0).length;
    const backlogCount = students.filter(s => s.backlogs && s.backlogs.length > 0).length;

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white">
                    {/* Header */}
                    <div className="bg-emerald-900/20 border-b border-emerald-500/10 p-5 flex justify-between items-start shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-400/30">
                                <Users className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold">Standard Subject Assigner</h1>
                                <p className="text-xs text-emerald-300/60">Bulk allocate semester courses to clean students.</p>
                                <div className="mt-1.5 inline-flex items-center gap-2 px-2 py-1 bg-white/5 rounded-md border border-white/10">
                                    <span className="text-xs text-white/40">Active Branch:</span>
                                    <span className="text-xs font-bold text-emerald-400">{activeBranch}</span>
                                </div>
                            </div>
                        </div>
                        {students.length > 0 && (
                            <div className="flex gap-3 text-xs text-center">
                                <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl">
                                    <div className="font-bold text-blue-400 text-lg">{cleanCount}</div>
                                    <div className="text-white/40">Clean</div>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                                    <div className="font-bold text-emerald-400 text-lg">{assignedCount}</div>
                                    <div className="text-white/40">Assigned</div>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                                    <div className="font-bold text-amber-400 text-lg">{backlogCount}</div>
                                    <div className="text-white/40">Backlog</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="p-4 border-b border-white/5 flex items-end gap-3 shrink-0 bg-black/20">
                        <div>
                            <label className="text-xs text-white/50 mb-1 block">Target Semester</label>
                            <select
                                value={semester}
                                onChange={e => setSemester(Number(e.target.value))}
                                className="bg-black/60 border border-white/10 rounded-lg px-4 py-2 text-sm outline-none focus:border-emerald-500 [&>option]:bg-gray-900"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={handleFetchStudents}
                            disabled={loading}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Find Students
                        </button>

                        <div className="flex-1" />

                        {students.length > 0 && cleanCount > 0 && (
                            <button
                                onClick={handleBulkAssign}
                                disabled={bulkAssigning}
                                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                            >
                                {bulkAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                Bulk Assign to {cleanCount} Clean Students
                            </button>
                        )}
                    </div>

                    {/* Student List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {students.length === 0 && !loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 border-2 border-dashed border-white/5 rounded-2xl p-10">
                                <User className="w-12 h-12 mb-4 opacity-50" />
                                <p>Select a semester and click Find Students.</p>
                            </div>
                        ) : (
                            students.map((student) => {
                                const hasBacklogs = student.backlogs && student.backlogs.length > 0;
                                const isAssigned = student.registeredSubjects && student.registeredSubjects.length > 0;
                                const isExpanded = expandedStudents[student._id];

                                return (
                                    <div key={student._id} className={`rounded-xl border overflow-hidden transition-all ${hasBacklogs ? 'border-amber-500/25 bg-amber-900/10' : isAssigned ? 'border-emerald-500/25 bg-emerald-900/10' : 'border-white/10 bg-white/5'}`}>
                                        {/* Student Row */}
                                        <div className="flex items-center justify-between p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border ${hasBacklogs ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : isAssigned ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                    {student.studentName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                                                        {student.studentName}
                                                        {isAssigned && !hasBacklogs && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                                    </h3>
                                                    <p className="text-xs text-white/40 font-mono">{student.usn || student.csn}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {hasBacklogs ? (
                                                    <span className="text-xs px-2.5 py-1 bg-amber-500/15 text-amber-400 rounded-lg border border-amber-500/20">
                                                        ⚠ {student.backlogs.length} Backlog{student.backlogs.length > 1 ? 's' : ''} — Skip
                                                    </span>
                                                ) : isAssigned ? (
                                                    <button
                                                        onClick={() => toggleStudentExpand(student._id)}
                                                        className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                                                    >
                                                        <BookOpen className="w-3 h-3" />
                                                        {student.registeredSubjects.length} Subjects
                                                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                    </button>
                                                ) : (
                                                    <span className="text-xs px-2.5 py-1 bg-blue-500/15 text-blue-400 rounded-lg border border-blue-500/20">
                                                        Clean — Ready
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expandable Subject Codes */}
                                        {isAssigned && isExpanded && (
                                            <div className="px-4 pb-4 pt-0">
                                                <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                                                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2.5">Assigned Subjects</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {student.registeredSubjects.map((code: string) => (
                                                            <span key={code} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 text-xs font-mono rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                                                                {code}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {hasBacklogs && student.backlogs.length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-white/5">
                                                            <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Backlogs</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {student.backlogs.map((code: string) => (
                                                                    <span key={code} className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-mono rounded-lg border border-amber-500/20">
                                                                        {code}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            }
        />
    );
}
