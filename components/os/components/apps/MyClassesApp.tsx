"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getMyFacultyProfile } from '@/lib/actions/faculty.actions';
import { BookOpen, GraduationCap, Loader2, Layers, Users } from 'lucide-react';

const SEM_GRADIENTS = [
    '',
    'from-blue-600 to-blue-800',
    'from-purple-600 to-purple-800',
    'from-teal-600 to-teal-800',
    'from-orange-600 to-orange-800',
    'from-pink-600 to-pink-800',
    'from-emerald-600 to-emerald-800',
    'from-amber-600 to-amber-800',
    'from-red-600 to-red-800',
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

export default function MyClassesApp() {
    const [loading, setLoading] = useState(true);
    const [faculty, setFaculty] = useState<any>(null);
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
                <div className="h-full flex items-center justify-center bg-[#0f111a] text-white/50">
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
                <div className="h-full flex flex-col bg-[#0f111a] text-white">
                    {/* Header */}
                    <div className="bg-indigo-900/25 border-b border-indigo-500/15 p-5 shrink-0">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                                    <GraduationCap className="w-6 h-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold flex items-center gap-2">
                                        My Classes
                                        <span className="text-xs font-normal text-indigo-400/80 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/20">
                                            {faculty?.department || '?'} Dept
                                        </span>
                                    </h1>
                                    <p className="text-sm text-indigo-300/60 mt-0.5">
                                        {faculty?.name} · <span className="font-mono text-xs">{faculty?.employeeId}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="text-center bg-white/5 border border-white/10 px-5 py-2 rounded-xl">
                                <div className="text-2xl font-bold text-indigo-400">{classes.length}</div>
                                <div className="text-xs text-white/40">Subjects</div>
                            </div>
                        </div>
                    </div>

                    {/* Classes Grid */}
                    <div className="flex-1 overflow-y-auto p-5">
                        {classes.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-2xl p-10">
                                <BookOpen className="w-14 h-14 mb-4 opacity-30" />
                                <h2 className="text-lg font-semibold mb-1">No Classes Assigned Yet</h2>
                                <p className="text-sm text-white/30">Your HOD will assign teaching subjects to you.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {classes.map((cls: any, idx: number) => {
                                    const details = cls.subjectDetails;
                                    const semGrad = SEM_GRADIENTS[cls.semester] || 'from-gray-600 to-gray-800';
                                    const semBorder = SEM_BORDER[cls.semester] || 'border-gray-500/30';

                                    return (
                                        <div
                                            key={`${cls.subjectCode}-${cls.semester}-${idx}`}
                                            className={`rounded-2xl border ${semBorder} overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer group`}
                                        >
                                            {/* Gradient Header */}
                                            <div className={`bg-gradient-to-br ${semGrad} p-4 relative`}>
                                                <div className="absolute top-3 right-3 flex gap-1.5">
                                                    <span className="px-2 py-0.5 bg-black/30 rounded-full text-[10px] font-bold text-white/80 backdrop-blur-sm">
                                                        Sem {cls.semester}
                                                    </span>
                                                    {cls.section && (
                                                        <span className="px-2 py-0.5 bg-black/30 rounded-full text-[10px] font-bold text-white/80 backdrop-blur-sm">
                                                            Sec {cls.section}
                                                        </span>
                                                    )}
                                                </div>
                                                <BookOpen className="w-8 h-8 text-white/30 mb-2 group-hover:text-white/50 transition-colors" />
                                                <p className="text-xs font-mono text-white/60">{cls.subjectCode}</p>
                                            </div>

                                            {/* Card Body */}
                                            <div className="bg-[#0f111a] p-4">
                                                <h3 className="font-semibold text-white text-sm mb-2 leading-snug">
                                                    {details?.title || cls.subjectCode}
                                                </h3>
                                                <div className="flex items-center justify-between text-xs text-white/40">
                                                    <span className="flex items-center gap-1">
                                                        <Layers className="w-3 h-3" />
                                                        {details?.credits || '?'} Credits
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {details?.category || 'N/A'}
                                                    </span>
                                                </div>

                                                {/* Future hook: clickable to ClassroomManager */}
                                                <div className="mt-3 text-xs text-indigo-400/50 text-center py-2 border border-dashed border-indigo-500/15 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    🔜 Open Classroom (Coming Soon)
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
