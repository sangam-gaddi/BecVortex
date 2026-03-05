"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { submitRegistrationRequest, getMyRegistrationRequests, getMyEnrolledSubjects } from '@/lib/actions/registration.actions';
import { getBranchSubjectsForSemester } from '@/lib/actions/subject.actions';
import {
    GraduationCap, BookOpen, AlertCircle, CheckCircle, Clock, Loader2,
    ChevronDown, ChevronUp, Award, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORY_COLORS: Record<string, string> = {
    BSC: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
    ESC: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
    ETC: 'bg-orange-500/15 text-orange-300 border-orange-500/25',
    PLC: 'bg-pink-500/15 text-pink-300 border-pink-500/25',
    HSSC: 'bg-teal-500/15 text-teal-300 border-teal-500/25',
};

export default function CourseRegistrationApp({ userDepartment, userSemester, userBacklogs }: { userDepartment?: string, userSemester?: number, userBacklogs?: string[] }) {
    // --- State ---
    const [appState, setAppState] = useState<'loading' | 'enrolled' | 'pending' | 'register'>('loading');
    const [enrolledSubjects, setEnrolledSubjects] = useState<any[]>([]);
    const [regularSubjects, setRegularSubjects] = useState<any[]>([]);
    const [backlogSubjects, setBacklogSubjects] = useState<any[]>([]);
    const [selectedBacklogs, setSelectedBacklogs] = useState<string[]>([]);
    const [existingRequest, setExistingRequest] = useState<any>(null);
    const [studentInfo, setStudentInfo] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const branch = userDepartment || 'CS';
    const semester = userSemester || 1;
    const backlogsArray = userBacklogs || [];

    useEffect(() => { initApp(); }, []);

    const initApp = async () => {
        // 1. Fetch Student Profile & Enrollment Status
        const enrolledRes = await getMyEnrolledSubjects();
        if (!enrolledRes.success || !enrolledRes.student) {
            setAppState('register');
            toast.error("Failed to load student profile");
            return;
        }

        const student = enrolledRes.student;
        setStudentInfo(student);

        // Extract true branch and semester from the backend
        const dynamicBranch = student.department || branch;
        const dynamicSemester = student.currentSemester || semester;

        if (enrolledRes.registeredCodes && enrolledRes.registeredCodes.length > 0) {
            setEnrolledSubjects(enrolledRes.registeredSubjects || []);
            setAppState('enrolled');
            return;
        }

        // 2. Check for a pending request
        const reqRes = await getMyRegistrationRequests();
        if (reqRes.success && reqRes.requests.length > 0) {
            const currentSemReq = reqRes.requests.find((r: any) => r.semester === dynamicSemester && r.status === 'PENDING');
            if (currentSemReq) {
                setExistingRequest(currentSemReq);
                setAppState('pending');
                return;
            }
        }

        // 3. Show registration form
        try {
            const subjects = await getBranchSubjectsForSemester(dynamicBranch, dynamicSemester);
            setRegularSubjects(subjects);
            const studentBacklogs = enrolledRes.backlogs || backlogsArray;
            setBacklogSubjects(studentBacklogs.map((code: string) => ({ subjectCode: code })));
        } catch {
            toast.error("Failed to load registration data.");
        }
        setAppState('register');
    };

    const toggleBacklog = (code: string) => {
        setSelectedBacklogs(prev => {
            if (prev.includes(code)) return prev.filter(c => c !== code);
            if (prev.length >= 2) {
                toast.error("Maximum 2 backlogs per semester. Deselect one first.");
                return prev;
            }
            return [...prev, code];
        });
    };

    const handleSubmit = () => {
        // Styled toast confirm — no native browser popups
        toast(
            (t) => (
                <div className="flex flex-col gap-3 min-w-[240px]">
                    <p className="font-bold text-white text-sm">Submit Registration Request?</p>
                    <p className="text-xs text-white/60 leading-relaxed">
                        This will send your enrollment ticket for Semester <strong className="text-white">{semester}</strong> to your Department Officer.
                        It <strong className="text-amber-400">cannot be edited</strong> once submitted.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                setSubmitting(true);
                                const res = await submitRegistrationRequest({
                                    regularSubjects: regularSubjects.map((s: any) => s.subjectCode),
                                    requestedBacklogs: selectedBacklogs,
                                    semester,
                                    branch
                                });
                                if (res.success) {
                                    toast.success(String(res.message || 'Registration submitted!'));
                                    initApp();
                                } else {
                                    toast.error(String(res.error || 'Failed to submit request.'));
                                }
                                setSubmitting(false);
                            }}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg font-bold transition-colors"
                        >
                            ✓ Yes, Submit
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

    // ── Group enrolled subjects by category ──
    const groupedEnrolled = enrolledSubjects.reduce((acc, s) => {
        const cat = s.category || 'OTHER';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(s);
        return acc;
    }, {} as Record<string, any[]>);

    const totalCredits = enrolledSubjects.reduce((sum, s) => sum + (s.credits || 0), 0);

    if (appState === 'loading') {
        return (
            <AppTemplate hasSidebar={false} content={
                <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            } />
        );
    }

    // ── ENROLLED VIEW ───────────────────────────────────────────────────────────
    if (appState === 'enrolled') {
        return (
            <AppTemplate hasSidebar={false} content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white">
                    {/* Header */}
                    <div className="bg-emerald-900/25 border-b border-emerald-500/15 p-5 shrink-0">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white flex items-center gap-2">
                                        My Enrolled Courses
                                        <span className="text-xs font-normal text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25">Semester {studentInfo?.currentSemester || semester}</span>
                                    </h1>
                                    <p className="text-sm text-emerald-300/60 mt-0.5">
                                        {studentInfo?.name} · <span className="font-mono">{studentInfo?.usn}</span> · Branch: <strong>{studentInfo?.department}</strong>
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 text-center shrink-0">
                                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                                    <div className="text-xl font-bold text-white">{enrolledSubjects.length}</div>
                                    <div className="text-xs text-white/40">Subjects</div>
                                </div>
                                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                                    <div className="text-xl font-bold text-emerald-400">{totalCredits}</div>
                                    <div className="text-xs text-white/40">Credits</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300/70 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                            Subjects were directly enrolled by your Department Subject Registration Officer. No action required.
                        </div>
                    </div>

                    {/* Subject List grouped by category */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                        {(Object.entries(groupedEnrolled) as [string, any[]][]).map(([category, subs]) => {
                            const isOpen = expandedCategory !== category; // default open
                            const catCredits = subs.reduce((s, sub) => s + (sub.credits || 0), 0);

                            return (
                                <div key={category} className="border border-white/5 rounded-2xl overflow-hidden">
                                    <button
                                        onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/8 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${CATEGORY_COLORS[category] || 'bg-gray-500/15 text-gray-300 border-gray-500/25'}`}>
                                                {category}
                                            </span>
                                            <span className="text-white font-semibold text-sm">{subs.length} Subject{subs.length !== 1 ? 's' : ''}</span>
                                            <span className="text-white/40 text-xs flex items-center gap-1">
                                                <Award className="w-3 h-3" /> {catCredits} credits
                                            </span>
                                        </div>
                                        {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                                    </button>

                                    {isOpen && (
                                        <div className="p-3 bg-black/20 space-y-2">
                                            {subs.map((sub: any) => (
                                                <div key={sub._id || sub.subjectCode} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3 hover:border-white/10 transition-colors">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="font-mono text-xs text-white/50">{sub.subjectCode}</span>
                                                        </div>
                                                        <p className="text-sm font-medium text-white">{sub.title}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-white">{sub.credits}</div>
                                                        <div className="text-xs text-white/40">Credits</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* If subject codes exist but details weren't found in Subject collection */}
                        {enrolledSubjects.length === 0 && (
                            <div className="text-center py-10 text-white/40 border border-dashed border-white/10 rounded-xl">
                                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Subjects have been assigned but details are not in the Subject Directory yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            } />
        );
    }

    // ── PENDING REQUEST VIEW ─────────────────────────────────────────────────────
    if (appState === 'pending') {
        return (
            <AppTemplate hasSidebar={false} content={
                <div className="h-full flex flex-col items-center justify-center bg-[#0f111a] text-white p-8">
                    <div className="max-w-md w-full text-center">
                        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-10 h-10 text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Request Pending Review</h2>
                        <p className="text-white/50 mb-8">
                            Your registration request for Semester {existingRequest?.semester} has been routed to the{' '}
                            <span className="text-amber-400 font-semibold">{existingRequest?.branch} Subject Registration Officer</span>.
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs text-white/40 mb-1">Standard Subjects</p>
                                <p className="text-2xl font-bold">{existingRequest?.regularSubjects?.length ?? 0}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs text-white/40 mb-1">Requested Backlogs</p>
                                <p className="text-2xl font-bold">{existingRequest?.requestedBacklogs?.length ?? 0}</p>
                            </div>
                        </div>
                        {existingRequest?.requestedBacklogs?.length > 0 && (
                            <div className="mt-4 p-4 bg-amber-900/20 border border-amber-500/20 rounded-xl text-left">
                                <p className="text-xs text-amber-400 font-semibold mb-2 uppercase tracking-wider">Backlog Subjects Requested</p>
                                <div className="flex flex-wrap gap-2">
                                    {existingRequest.requestedBacklogs.map((code: string) => (
                                        <span key={code} className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-xs font-mono rounded-lg border border-amber-500/30">{code}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            } />
        );
    }

    // ── REGISTRATION FORM VIEW ───────────────────────────────────────────────────
    return (
        <AppTemplate hasSidebar={false} content={
            <div className="h-full flex flex-col bg-[#0f111a] text-white">
                {/* Header */}
                <div className="bg-blue-900/20 border-b border-blue-500/10 p-5 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">Course Registration</h1>
                            <p className="text-xs text-blue-300/60">Generate your subject enrollment ticket for Semester {semester}.</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Regular Subjects */}
                    <div>
                        <h2 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-400" /> Standard Subjects ({regularSubjects.length})
                        </h2>
                        {regularSubjects.length === 0 ? (
                            <div className="text-center py-6 text-white/30 border border-dashed border-white/10 rounded-xl text-sm">
                                No standard subjects found for {branch} · Semester {semester}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {regularSubjects.map(sub => (
                                    <div key={sub.subjectCode} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                                        <div>
                                            <span className="text-xs font-mono text-white/40">{sub.subjectCode}</span>
                                            <p className="text-sm font-medium text-white">{sub.title}</p>
                                        </div>
                                        <span className="text-xs text-white/40">{sub.credits} cr</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Backlogs */}
                    {backlogSubjects.length > 0 && (
                        <div>
                            <h2 className="text-sm font-semibold text-amber-400/80 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Backlog Subjects (Select max 2)
                            </h2>
                            <div className="space-y-2">
                                {backlogSubjects.map((sub: any) => {
                                    const isSelected = selectedBacklogs.includes(sub.subjectCode);
                                    return (
                                        <button
                                            key={sub.subjectCode}
                                            onClick={() => toggleBacklog(sub.subjectCode)}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${isSelected ? 'bg-amber-500/15 border-amber-500/40' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                                        >
                                            <span className="text-sm font-mono">{sub.subjectCode}</span>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-amber-400 bg-amber-500' : 'border-white/20'}`}>
                                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Submit Footer */}
                <div className="p-5 border-t border-white/5 bg-black/20 shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || regularSubjects.length === 0}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                        Submit Registration Request
                    </button>
                </div>
            </div>
        } />
    );
}
