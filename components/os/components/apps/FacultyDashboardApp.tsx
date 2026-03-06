"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getMyFacultyProfile } from '@/lib/actions/faculty.actions';
import {
    BookOpen,
    GraduationCap,
    Loader2,
    Layers,
    Users,
    Building2,
    Award,
    BadgeCheck,
} from 'lucide-react';

const SEM_GRADIENTS = [
    '',
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700',
    'from-teal-500 to-teal-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-emerald-500 to-emerald-700',
    'from-amber-500 to-amber-700',
    'from-red-500 to-red-700',
];

const SEM_BORDER = [
    '',
    'border-blue-500/30',
    'border-purple-500/30',
    'border-teal-500/30',
    'border-orange-500/30',
    'border-pink-500/30',
    'border-emerald-500/30',
    'border-amber-500/30',
    'border-red-500/30',
];

const SEM_GLOW = [
    '',
    'shadow-blue-500/10',
    'shadow-purple-500/10',
    'shadow-teal-500/10',
    'shadow-orange-500/10',
    'shadow-pink-500/10',
    'shadow-emerald-500/10',
    'shadow-amber-500/10',
    'shadow-red-500/10',
];

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function FacultyDashboardApp() {
    const [loading, setLoading] = useState(true);
    const [faculty, setFaculty] = useState<any>(null);
    const [hodName, setHodName] = useState<string | null>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        const res = await getMyFacultyProfile();
        if (res.success) {
            setFaculty(res.faculty);
            setHodName(res.hodName || null);
            setClasses(res.assignedClasses || []);
        } else {
            setError(res.error || 'Failed to load your profile.');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <AppTemplate hasSidebar={false} content={
                <div className="h-full flex items-center justify-center bg-[#0f111a]">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            } />
        );
    }

    if (error) {
        return (
            <AppTemplate hasSidebar={false} content={
                <div className="h-full flex items-center justify-center bg-[#0f111a]">
                    <div className="text-center">
                        <Layers className="w-16 h-16 mx-auto mb-4 opacity-30 text-red-400" />
                        <p className="text-red-300">{error}</p>
                    </div>
                </div>
            } />
        );
    }

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white overflow-y-auto">

                    {/* ── Faculty ID Card ── */}
                    <div className="shrink-0 p-5 pb-0">
                        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#1c2040] to-[#111526]">
                            {/* Dot-grid texture */}
                            <div
                                className="absolute inset-0 opacity-[0.035]"
                                style={{
                                    backgroundImage: `radial-gradient(circle, white 1px, transparent 0)`,
                                    backgroundSize: '28px 28px',
                                }}
                            />
                            {/* Ambient glows */}
                            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-purple-600/8 blur-3xl pointer-events-none" />

                            <div className="relative z-10 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/20">
                                        <span className="text-2xl font-bold text-white tracking-wide">
                                            {faculty?.name ? getInitials(faculty.name) : '?'}
                                        </span>
                                    </div>
                                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#111526] flex items-center justify-center">
                                        <BadgeCheck className="w-3.5 h-3.5 text-white" />
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <h1 className="text-xl font-bold text-white leading-tight">{faculty?.name}</h1>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                            Faculty
                                        </span>
                                    </div>
                                    <p className="text-xs font-mono text-white/35 mb-5 tracking-widest">{faculty?.employeeId}</p>

                                    <div className="flex flex-wrap gap-3">
                                        {/* Department chip */}
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                                            <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            <div>
                                                <p className="text-[10px] text-white/30 uppercase tracking-wider leading-none mb-0.5">Department</p>
                                                <p className="text-sm font-semibold text-white leading-none">{faculty?.department}</p>
                                            </div>
                                        </div>

                                        {/* HOD chip */}
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                                            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                            <div>
                                                <p className="text-[10px] text-white/30 uppercase tracking-wider leading-none mb-0.5">HOD</p>
                                                <p className="text-sm font-semibold text-white leading-none">{hodName || 'Not assigned'}</p>
                                            </div>
                                        </div>

                                        {/* Subjects count chip */}
                                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                                            <BookOpen className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                            <div>
                                                <p className="text-[10px] text-white/30 uppercase tracking-wider leading-none mb-0.5">Subjects</p>
                                                <p className="text-sm font-semibold text-white leading-none">{classes.length} Assigned</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom accent stripe */}
                            <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-transparent" />
                        </div>
                    </div>

                    {/* ── Section title ── */}
                    <div className="px-5 pt-6 pb-3 shrink-0 flex items-center gap-3">
                        <GraduationCap className="w-4 h-4 text-white/25" />
                        <h2 className="text-[11px] font-semibold text-white/25 uppercase tracking-widest">
                            Assigned Subjects
                        </h2>
                        <div className="flex-1 h-px bg-white/5" />
                    </div>

                    {/* ── Subjects Grid ── */}
                    <div className="flex-1 overflow-y-auto px-5 pb-5">
                        {classes.length === 0 ? (
                            <div className="h-48 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-2xl">
                                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                <h2 className="text-base font-semibold mb-1">No Subjects Assigned Yet</h2>
                                <p className="text-sm text-white/30">Your HOD will assign teaching subjects to you.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {classes.map((cls: any, idx: number) => {
                                    const details = cls.subjectDetails;
                                    const semGrad = SEM_GRADIENTS[cls.semester] || 'from-gray-500 to-gray-700';
                                    const semBorder = SEM_BORDER[cls.semester] || 'border-gray-500/30';
                                    const semGlow = SEM_GLOW[cls.semester] || 'shadow-gray-500/10';

                                    return (
                                        <div
                                            key={`${cls.subjectCode}-${cls.semester}-${idx}`}
                                            className={`rounded-2xl border ${semBorder} overflow-hidden bg-[#151824] flex flex-col shadow-xl ${semGlow}`}
                                        >
                                            {/* Gradient header */}
                                            <div className={`bg-gradient-to-br ${semGrad} p-5 relative`}>
                                                <div className="absolute top-3.5 right-3.5 flex gap-1.5">
                                                    <span className="px-2.5 py-1 bg-black/30 backdrop-blur-sm rounded-full text-[11px] font-bold text-white/90">
                                                        Sem {cls.semester}
                                                    </span>
                                                    {cls.section && (
                                                        <span className="px-2.5 py-1 bg-black/30 backdrop-blur-sm rounded-full text-[11px] font-bold text-white/90">
                                                            {cls.section}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center mb-3">
                                                    <BookOpen className="w-5 h-5 text-white/80" />
                                                </div>
                                                <p className="text-[11px] font-mono text-white/70 tracking-widest uppercase font-semibold">
                                                    {cls.subjectCode}
                                                </p>
                                            </div>

                                            {/* Body */}
                                            <div className="p-4 flex-1 flex flex-col">
                                                <h3 className="font-bold text-white text-sm leading-snug mb-4 line-clamp-2">
                                                    {details?.title || cls.subjectCode}
                                                </h3>

                                                <div className="mt-auto flex flex-wrap gap-2">
                                                    {details?.credits !== undefined && (
                                                        <span className="flex items-center gap-1.5 text-[11px] text-white/45 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                                                            <Layers className="w-3 h-3" />
                                                            {details.credits} Credits
                                                        </span>
                                                    )}
                                                    {details?.category && (
                                                        <span className="flex items-center gap-1.5 text-[11px] text-white/45 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                                                            <Users className="w-3 h-3" />
                                                            {details.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            }
        />
    );
}
