"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import {
    getDepartmentFaculties,
    assignSubjectToFaculty,
    removeSubjectFromFaculty,
    getAssignableSubjects
} from '@/lib/actions/faculty.actions';
import {
    Users, UserCircle, Plus, X, Loader2, BookOpen, Layers,
    ChevronDown, ChevronUp, Search, GraduationCap, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const SEM_COLORS = [
    '', // 0 unused
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'bg-teal-500/20 text-teal-400 border-teal-500/30',
    'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'bg-pink-500/20 text-pink-400 border-pink-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-red-500/20 text-red-400 border-red-500/30',
];

export default function TeachingAssignerApp() {
    const [faculties, setFaculties] = useState<any[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [department, setDepartment] = useState('...');

    // Assign modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [availableSubjects, setAvailableSubjects] = useState<any[]>([]);
    const [assignSemester, setAssignSemester] = useState(1);
    const [assignSection, setAssignSection] = useState('');
    const [subjectSearch, setSubjectSearch] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [subjectsLoading, setSubjectsLoading] = useState(false);

    useEffect(() => { loadFaculties(); }, []);

    const loadFaculties = async () => {
        setLoading(true);
        const res = await getDepartmentFaculties();
        if (res.success) {
            setFaculties(res.faculties || []);
            if (res.department) setDepartment(res.department);
            // Re-select the same faculty if it was selected before
            if (selectedFaculty) {
                const updated = (res.faculties || []).find((f: any) => f._id === selectedFaculty._id);
                setSelectedFaculty(updated || null);
            }
        } else {
            toast.error(String(res.error || 'Failed to load faculties.'));
        }
        setLoading(false);
    };

    const openAssignModal = async () => {
        setShowAssignModal(true);
        setSubjectsLoading(true);
        setSubjectSearch('');
        const res = await getAssignableSubjects();
        if (res.success) {
            setAvailableSubjects(res.subjects || []);
        } else {
            toast.error(String(res.error || 'Failed to load subjects'));
        }
        setSubjectsLoading(false);
    };

    const handleAssign = async (subjectCode: string) => {
        if (!selectedFaculty) return;
        setAssigning(true);
        const res = await assignSubjectToFaculty(
            selectedFaculty._id,
            subjectCode,
            assignSemester,
            assignSection || undefined
        );
        if (res.success) {
            toast.success(String(res.message || 'Subject assigned!'));
            setShowAssignModal(false);
            loadFaculties();
        } else {
            toast.error(String(res.error || 'Assignment failed.'));
        }
        setAssigning(false);
    };

    const handleRemove = (subjectCode: string, semester: number) => {
        if (!selectedFaculty) return;

        toast(
            (t) => (
                <div className="flex flex-col gap-3 min-w-[220px]">
                    <p className="font-bold text-white text-sm">Remove Assignment?</p>
                    <p className="text-xs text-white/60">
                        Remove <span className="text-red-400 font-mono">{subjectCode}</span> (Sem {semester}) from <span className="text-white font-semibold">{selectedFaculty.name}</span>?
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                const res = await removeSubjectFromFaculty(selectedFaculty._id, subjectCode, semester);
                                if (res.success) {
                                    toast.success(String(res.message || 'Removed.'));
                                    loadFaculties();
                                } else {
                                    toast.error(String(res.error || 'Failed to remove.'));
                                }
                            }}
                            className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white text-xs rounded-lg font-bold"
                        >
                            ✕ Remove
                        </button>
                        <button onClick={() => toast.dismiss(t.id)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg">
                            Cancel
                        </button>
                    </div>
                </div>
            ),
            { duration: 10000, style: { background: '#1a1d2e', border: '1px solid rgba(239,68,68,0.3)', color: 'white', padding: '16px' } }
        );
    };

    const filteredSubjects = availableSubjects.filter(s =>
        s.semester === assignSemester &&
        (s.subjectCode.toLowerCase().includes(subjectSearch.toLowerCase()) ||
            s.title.toLowerCase().includes(subjectSearch.toLowerCase()))
    );

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="h-full flex bg-[#0f111a] text-white relative">
                    {/* Left Panel: Faculty List */}
                    <div className="w-72 shrink-0 border-r border-white/5 flex flex-col">
                        <div className="p-4 border-b border-white/5 bg-indigo-900/20">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                                    <Users className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold">Faculty Panel</h2>
                                    <p className="text-xs text-indigo-300/60">{department} Department</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                            ) : faculties.length === 0 ? (
                                <div className="text-center py-8 text-white/30 text-xs px-4">
                                    No faculty members found. Create FACULTY accounts in Account Manager first.
                                </div>
                            ) : (
                                faculties.map((f) => {
                                    const isSelected = selectedFaculty?._id === f._id;
                                    const classCount = f.assignedClasses?.length || 0;

                                    return (
                                        <button
                                            key={f._id}
                                            onClick={() => setSelectedFaculty(f)}
                                            className={`w-full text-left px-4 py-3 border-b border-white/5 transition-all flex items-center gap-3 ${isSelected ? 'bg-indigo-600/20 border-l-2 border-l-indigo-500' : 'hover:bg-white/5'}`}
                                        >
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border ${isSelected ? 'bg-indigo-500/30 text-indigo-300 border-indigo-500/40' : 'bg-white/5 text-white/60 border-white/10'}`}>
                                                {f.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{f.name}</p>
                                                <p className="text-xs text-white/40 font-mono">{f.employeeId}</p>
                                            </div>
                                            {classCount > 0 && (
                                                <span className="text-xs bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
                                                    {classCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Faculty Detail */}
                    <div className="flex-1 flex flex-col">
                        {!selectedFaculty ? (
                            <div className="flex-1 flex items-center justify-center text-white/20">
                                <div className="text-center">
                                    <UserCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                    <p className="text-sm">Select a faculty member to manage their teaching assignments.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Faculty Header */}
                                <div className="p-5 border-b border-white/5 bg-indigo-900/15 flex justify-between items-start shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center text-xl font-bold">
                                            {selectedFaculty.name?.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold">{selectedFaculty.name}</h2>
                                            <p className="text-xs text-white/40 font-mono">{selectedFaculty.employeeId} · {selectedFaculty.department} Dept</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={openAssignModal}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                    >
                                        <Plus className="w-4 h-4" /> Assign Subject
                                    </button>
                                </div>

                                {/* Assigned Classes Grid */}
                                <div className="flex-1 overflow-y-auto p-5">
                                    {(selectedFaculty.assignedClasses?.length || 0) === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-2xl p-8">
                                            <BookOpen className="w-12 h-12 mb-4 opacity-40" />
                                            <p className="text-sm mb-1">No subjects assigned yet.</p>
                                            <p className="text-xs text-white/30">Click "Assign Subject" to add teaching responsibilities.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {selectedFaculty.assignedClasses.map((cls: any, idx: number) => (
                                                <div key={`${cls.subjectCode}-${cls.semester}-${idx}`} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:border-indigo-500/20 transition-all group relative">
                                                    <button
                                                        onClick={() => handleRemove(cls.subjectCode, cls.semester)}
                                                        className="absolute top-3 right-3 p-1.5 rounded-lg text-white/0 group-hover:text-white/30 hover:!text-red-400 hover:bg-red-400/10 transition-all"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-mono text-xs text-white/50">{cls.subjectCode}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${SEM_COLORS[cls.semester] || 'bg-gray-500/20 text-gray-400'}`}>
                                                            Sem {cls.semester}
                                                        </span>
                                                        {cls.section && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-white/40 border border-white/10">
                                                                Sec {cls.section}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium text-white/80">{cls.subjectCode}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Assign Modal (Overlay) */}
                    {showAssignModal && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                            <div className="bg-[#1a1d2e] border border-white/10 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                                {/* Modal Header */}
                                <div className="p-5 border-b border-white/5 flex justify-between items-center shrink-0">
                                    <div>
                                        <h3 className="font-bold text-white">Assign Subject</h3>
                                        <p className="text-xs text-white/40">Assigning to: <span className="text-indigo-400 font-semibold">{selectedFaculty?.name}</span></p>
                                    </div>
                                    <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                        <X className="w-4 h-4 text-white/50" />
                                    </button>
                                </div>

                                {/* Semester + Section selector */}
                                <div className="px-5 pt-4 flex gap-3 shrink-0">
                                    <div className="flex-1">
                                        <label className="text-xs text-white/50 mb-1 block">Semester</label>
                                        <select
                                            value={assignSemester}
                                            onChange={e => setAssignSemester(Number(e.target.value))}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm [&>option]:bg-gray-900"
                                        >
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs text-white/50 mb-1 block">Section</label>
                                        <input
                                            value={assignSection}
                                            onChange={e => setAssignSection(e.target.value.toUpperCase())}
                                            placeholder="A"
                                            maxLength={2}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Search */}
                                <div className="px-5 pt-3">
                                    <div className="relative">
                                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-white/40" />
                                        <input
                                            placeholder="Search subjects..."
                                            value={subjectSearch}
                                            onChange={e => setSubjectSearch(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 outline-none focus:border-indigo-500/50 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Subject List */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                    {subjectsLoading ? (
                                        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                                    ) : filteredSubjects.length === 0 ? (
                                        <div className="text-center py-8 text-white/30 text-xs">
                                            No subjects found for Semester {assignSemester}.
                                        </div>
                                    ) : (
                                        filteredSubjects.map(sub => (
                                            <button
                                                key={sub._id}
                                                onClick={() => handleAssign(sub.subjectCode)}
                                                disabled={assigning}
                                                className="w-full text-left bg-white/5 border border-white/5 rounded-xl px-4 py-3 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all flex justify-between items-center disabled:opacity-50"
                                            >
                                                <div>
                                                    <p className="text-xs font-mono text-white/40">{sub.subjectCode}</p>
                                                    <p className="text-sm font-medium text-white">{sub.title}</p>
                                                </div>
                                                <div className="text-right shrink-0 ml-3">
                                                    <p className="text-xs text-white/40">{sub.credits} cr</p>
                                                    <p className="text-xs text-indigo-400 font-semibold">{sub.category}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            }
        />
    );
}
