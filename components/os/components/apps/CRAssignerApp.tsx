"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getMyFacultyProfile, getStudentsBySemesterForCR, assignCR, removeCR } from '@/lib/actions/faculty.actions';
import { Star, Loader2, Users, Search, AlertCircle, CheckCircle2, Crown, ShieldAlert } from 'lucide-react';

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function CRAssignerApp() {
    const [faculty, setFaculty] = useState<any>(null);
    const [selectedSem, setSelectedSem] = useState<number | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState('');

    // UI state
    const [loading, setLoading] = useState(true);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        const res = await getMyFacultyProfile();
        if (res.success) {
            setFaculty(res.faculty);
        } else {
            setError(res.error || 'Failed to load profile.');
        }
        setLoading(false);
    };

    const handleSelectSem = async (sem: number) => {
        setSelectedSem(sem);
        setSearch('');
        setError(null);
        setSuccessMsg(null);
        fetchStudents(sem);
    };

    const fetchStudents = async (sem: number) => {
        setFetchingStudents(true);
        const res = await getStudentsBySemesterForCR(sem);
        if (res.success) {
            setStudents(res.students);
        } else {
            setError(res.error || 'Failed to fetch students.');
        }
        setFetchingStudents(false);
    };

    const handleToggleCR = async (student: any) => {
        if (!selectedSem) return;

        setActioningId(student._id ? String(student._id) : null);
        setError(null);
        setSuccessMsg(null);

        const isCurrentlyCR = student.isCR;
        const res = isCurrentlyCR
            ? await removeCR(student._id)
            : await assignCR(student._id, selectedSem);

        if (res.success) {
            setSuccessMsg(res.message || 'Action completed successfully.');
            // Refresh list to show new CR state
            fetchStudents(selectedSem);
        } else {
            setError(res.error || 'Action failed.');
        }
        setActioningId(null);
    };

    const filteredStudents = students.filter(s =>
    (s.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        s.usn?.toLowerCase().includes(search.toLowerCase()))
    );

    const currentCR = students.find(s => s.isCR);

    if (loading) {
        return (
            <AppTemplate hasSidebar={false} content={
                <div className="h-full flex items-center justify-center bg-[#0f111a]">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            } />
        );
    }

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white overflow-hidden">
                    {/* Header */}
                    <div className="bg-purple-900/25 border-b border-purple-500/15 p-5 shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                                <Star className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold flex items-center gap-2">
                                    CR Assigner
                                    <span className="text-xs font-normal text-purple-400/80 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/20">
                                        Dept of {faculty?.department}
                                    </span>
                                </h1>
                                <p className="text-sm text-purple-300/60 mt-0.5">
                                    Appoint Class Representatives for each semester.
                                </p>
                            </div>
                        </div>

                        {selectedSem && currentCR && (
                            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/30 rounded-xl py-2 px-4">
                                <Crown className="w-5 h-5 text-purple-400" />
                                <div>
                                    <p className="text-[10px] text-purple-400/70 uppercase font-bold tracking-widest leading-none">Current CR (Sem {selectedSem})</p>
                                    <p className="text-sm font-semibold text-purple-200 mt-0.5">{currentCR.studentName}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar: Semester Selection */}
                        <div className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col shrink-0">
                            <div className="p-4 border-b border-white/5 font-semibold text-sm text-white/50 tracking-wider">
                                SELECT SEMESTER
                            </div>
                            <div className="p-2 space-y-1">
                                {SEMESTERS.map((sem) => (
                                    <button
                                        key={sem}
                                        onClick={() => handleSelectSem(sem)}
                                        className={`w-full flex justify-between items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${selectedSem === sem
                                            ? 'bg-purple-500/20 text-purple-300 pointer-events-none'
                                            : 'text-white/70 hover:bg-white/5'
                                            }`}
                                    >
                                        <span>Semester {sem}</span>
                                        <ChevronRight className={`w-4 h-4 ${selectedSem === sem ? 'opacity-100 text-purple-400' : 'opacity-0'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-black/20 relative">
                            {!selectedSem ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/20 p-10">
                                    <Users className="w-16 h-16 mb-4 opacity-20 text-purple-400" />
                                    <h2 className="text-xl font-semibold mb-2">Select a Semester</h2>
                                    <p className="text-sm text-white/40 max-w-sm text-center">
                                        Choose a semester to view all students in the {faculty?.department} department and appoint a CR.
                                    </p>
                                    <div className="mt-8 bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 max-w-md text-sm text-purple-300/70 flex items-start gap-3">
                                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-purple-400" />
                                        <p>CRs receive special OS privileges, allowing them to post announcements to their class and assist with minor administrative tasks.</p>
                                    </div>
                                </div>
                            ) : fetchingStudents ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                </div>
                            ) : (
                                <div className="h-full flex flex-col p-6">
                                    {error && (
                                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex gap-3 items-start shrink-0">
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            {error}
                                        </div>
                                    )}
                                    {successMsg && (
                                        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex gap-3 items-start shrink-0">
                                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                            {successMsg}
                                        </div>
                                    )}

                                    {/* Search Bar */}
                                    <div className="relative mb-6 shrink-0">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder={`Search students in Sem ${selectedSem}...`}
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            className="w-full bg-[#151824] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all shadow-lg"
                                        />
                                    </div>

                                    {/* Student List */}
                                    <div className="flex-1 overflow-y-auto bg-[#151824] border border-white/5 rounded-2xl shadow-2xl">
                                        {filteredStudents.length === 0 ? (
                                            <div className="p-10 text-center text-white/40">
                                                No students found for Semester {selectedSem} in {faculty?.department}.
                                            </div>
                                        ) : (
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 bg-[#1a1d2d] z-10 border-b border-white/5 shadow-sm">
                                                    <tr className="text-xs text-white/40 uppercase tracking-widest">
                                                        <th className="px-6 py-4 font-semibold w-20 text-center border-r border-white/5">Auto #</th>
                                                        <th className="px-6 py-4 font-semibold w-40">USN</th>
                                                        <th className="px-6 py-4 font-semibold">Student Name</th>
                                                        <th className="px-6 py-4 font-semibold w-40 text-center border-l border-white/5">Status</th>
                                                        <th className="px-6 py-4 font-semibold w-32 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {filteredStudents.map((student, idx) => (
                                                        <tr
                                                            key={student._id}
                                                            className={`transition-colors group ${student.isCR ? 'bg-purple-500/5 hover:bg-purple-500/10' : 'hover:bg-white/[0.02]'
                                                                }`}
                                                        >
                                                            <td className="px-6 py-4 text-center text-white/30 text-xs border-r border-white/5 font-mono">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-mono text-white/70">
                                                                {student.usn}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-medium text-white/90">
                                                                <div className="flex items-center gap-2">
                                                                    {student.studentName}
                                                                    {student.isCR && (
                                                                        <Crown className="w-4 h-4 text-amber-400 drop-shadow-md" />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center border-l border-white/5">
                                                                {student.isCR ? (
                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold tracking-wider uppercase">
                                                                        Active CR
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-white/20 text-xs">Student</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3 text-center">
                                                                <button
                                                                    onClick={() => handleToggleCR(student)}
                                                                    disabled={actioningId === student._id || (currentCR && currentCR._id !== student._id && !student.isCR)}
                                                                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all ${student.isCR
                                                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                                                                        : currentCR
                                                                            ? 'bg-transparent text-white/10 cursor-not-allowed border border-white/5'
                                                                            : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                                                        }`}
                                                                >
                                                                    {actioningId === student._id ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                                                    ) : student.isCR ? (
                                                                        'Revoke'
                                                                    ) : currentCR ? (
                                                                        'Locked'
                                                                    ) : (
                                                                        'Make CR'
                                                                    )}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    <div className="mt-4 text-center text-xs text-white/30 flex justify-center items-center gap-2">
                                        <Star className="w-3 h-3 text-purple-400/50" />
                                        Note: Revoking the current CR unlocks the ability to assign a new one.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            }
        />
    );
}
// Placeholder for ChevronRight component since it was missed in the lucide-react import
function ChevronRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m9 18 6-6-6-6" />
        </svg>
    )
}
