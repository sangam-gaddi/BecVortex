"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { AppTemplate } from './AppTemplate';
import { getMyFacultyProfile } from '@/lib/actions/faculty.actions';
import { getStudentsForSubjectGrade, bulkSaveMarks } from '@/lib/actions/grade.actions';
import {
    FileSpreadsheet, Loader2, Save, GraduationCap, Calculator,
    ChevronRight, CheckCircle2, Download, BarChart2, TrendingUp, Award, Table2,
} from 'lucide-react';

const EXAM_TYPES = [
    { id: 'cie1',       label: 'CIE 1',                   maxRaw: 40,  maxConv: 20 },
    { id: 'cie2',       label: 'CIE 2',                   maxRaw: 40,  maxConv: 20 },
    { id: 'assignment', label: 'Assignment',               maxRaw: 20,  maxConv: 10 },
    { id: 'see',        label: 'Semester End Exam (SEE)',  maxRaw: 100, maxConv: 50 },
];

const GRADE_ORDER = ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'];
const GRADE_COLOR: Record<string, string> = {
    O: 'text-yellow-300 bg-yellow-500/20',
    'A+': 'text-emerald-300 bg-emerald-500/20',
    A: 'text-emerald-400 bg-emerald-500/15',
    'B+': 'text-blue-300 bg-blue-500/20',
    B: 'text-blue-400 bg-blue-500/15',
    C: 'text-indigo-300 bg-indigo-500/20',
    P: 'text-orange-400 bg-orange-500/15',
    F: 'text-red-400 bg-red-500/20',
    '-': 'text-white/20',
};

function gradeLabel(total: number): string {
    if (total >= 90) return 'O';
    if (total >= 80) return 'A+';
    if (total >= 70) return 'A';
    if (total >= 60) return 'B+';
    if (total >= 55) return 'B';
    if (total >= 50) return 'C';
    if (total >= 40) return 'P';
    if (total > 0) return 'F';
    return '-';
}

function previewTotal(student: any, examId: string, rawVal: number, maxRaw: number) {
    const conv = Math.ceil(Math.min(Math.max(0, rawVal), maxRaw) / 2);
    const g = student.grade || {};
    let c1 = g.cie1?.convertedMarks || 0;
    let c2 = g.cie2?.convertedMarks || 0;
    let as = g.assignment?.convertedMarks || 0;
    let se = g.see?.convertedMarks || 0;
    if (examId === 'cie1')       c1 = conv;
    if (examId === 'cie2')       c2 = conv;
    if (examId === 'assignment') as = conv;
    if (examId === 'see')        se = conv;
    return { conv, total: Math.min(c1 + c2 + as + se, 100) };
}

export default function MarksUploadApp() {
    const [faculty, setFaculty] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [marksForm, setMarksForm] = useState<Record<string, number>>({});
    const [innerTab, setInnerTab] = useState<'entry' | 'summary'>('entry');

    const [loading, setLoading] = useState(true);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        setLoading(true);
        const res = await getMyFacultyProfile();
        if (res.success) { setFaculty(res.faculty); setClasses(res.assignedClasses || []); }
        else setError(res.error || 'Failed to load profile.');
        setLoading(false);
    };

    const handleSelectClass = (cls: any) => {
        setSelectedClass(cls); setSelectedExam(null); setStudents([]);
        setMarksForm({}); setSuccessMsg(null); setInnerTab('entry');
    };

    const handleSelectExam = (exam: any) => {
        setSelectedExam(exam); setSuccessMsg(null);
        if (selectedClass) fetchStudentsAndGrades(selectedClass.subjectCode, selectedClass.semester, exam.id);
    };

    const fetchStudentsAndGrades = async (subjectCode: string, semester: number, examId: string) => {
        setFetchingStudents(true); setError(null);
        const res = await getStudentsForSubjectGrade(subjectCode, semester);
        if (res.success) {
            setStudents(res.students);
            const init: Record<string, number> = {};
            res.students.forEach((s: any) => {
                const ec = s.grade?.[examId];
                if (ec && typeof ec.rawMarks === 'number') init[s._id] = ec.rawMarks;
            });
            setMarksForm(init);
        } else setError(res.error || 'Failed to fetch students.');
        setFetchingStudents(false);
    };

    const handleMarkChange = (studentId: string, val: string) => {
        const num = parseInt(val, 10);
        setMarksForm(prev => {
            const next = { ...prev };
            if (isNaN(num)) delete next[studentId];
            else next[studentId] = num;
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedClass || !selectedExam || students.length === 0) return;
        setSaving(true); setError(null); setSuccessMsg(null);
        const marksData = students.map(s => ({ studentId: s._id, rawMarks: marksForm[s._id] || 0 }));
        const res = await bulkSaveMarks(selectedClass.subjectCode, selectedClass.semester, selectedExam.id, marksData);
        if (res.success) {
            setSuccessMsg(`Saved ${selectedExam.label} marks for ${students.length} students.`);
            fetchStudentsAndGrades(selectedClass.subjectCode, selectedClass.semester, selectedExam.id);
        } else setError(res.error || 'Failed to save marks.');
        setSaving(false);
    };

    // ── Statistics (live, computed from marksForm) ──────────────────────────
    const stats = useMemo(() => {
        if (!selectedExam || students.length === 0) return null;
        const raws = students.map(s => {
            const v = marksForm[s._id];
            return typeof v === 'number' ? v : (s.grade?.[selectedExam.id]?.rawMarks ?? null);
        });
        const defined = raws.filter((m): m is number => m !== null);
        if (defined.length === 0) return null;
        const convs = defined.map(m => Math.ceil(Math.min(Math.max(0, m), selectedExam.maxRaw) / 2));
        const avg = convs.reduce((a, b) => a + b, 0) / convs.length;
        const passMark = Math.ceil(selectedExam.maxConv * 0.4);
        return {
            avg: avg.toFixed(1),
            min: Math.min(...convs),
            max: Math.max(...convs),
            passing: convs.filter(m => m >= passMark).length,
            failing: convs.filter(m => m < passMark && m > 0).length,
            notEntered: students.length - defined.length,
            total: students.length,
        };
    }, [students, marksForm, selectedExam]);

    // ── Grade distribution (based on current preview totals) ────────────────
    const gradeDist = useMemo(() => {
        if (!selectedExam || students.length === 0) return null;
        const dist: Record<string, number> = {};
        GRADE_ORDER.forEach(g => { dist[g] = 0; });
        dist['-'] = 0;
        students.forEach(student => {
            const raw = typeof marksForm[student._id] === 'number' ? marksForm[student._id] : 0;
            const { total } = previewTotal(student, selectedExam.id, raw, selectedExam.maxRaw);
            dist[gradeLabel(total)]++;
        });
        return dist;
    }, [students, marksForm, selectedExam]);

    // ── CSV Export ───────────────────────────────────────────────────────────
    const exportCSV = () => {
        if (!selectedClass || !selectedExam || students.length === 0) return;
        const rows: any[][] = [
            ['#', 'USN', 'Name', `Raw (/${selectedExam.maxRaw})`, `Converted (/${selectedExam.maxConv})`, 'Total (100)', 'Grade'],
            ...students.map((s, i) => {
                const raw = typeof marksForm[s._id] === 'number' ? marksForm[s._id] : 0;
                const { conv, total } = previewTotal(s, selectedExam.id, raw, selectedExam.maxRaw);
                return [i + 1, s.usn, s.name, raw, conv, total, gradeLabel(total)];
            }),
        ];
        const csv = rows.map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Marks_${selectedClass.subjectCode}_${selectedExam.label.replace(/ /g, '_')}_Sem${selectedClass.semester}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return (
        <AppTemplate hasSidebar={false} content={
            <div className="h-full flex items-center justify-center bg-[#0f111a]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        } />
    );

    return (
        <AppTemplate hasSidebar={false} content={
            <div className="h-full flex flex-col bg-[#0f111a] text-white overflow-hidden">

                {/* ─── Header ─── */}
                <div className="bg-indigo-900/25 border-b border-indigo-500/15 p-5 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                            <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                Marks Evaluator
                                <span className="text-xs font-normal text-blue-400/80 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/20">BEC Regulations '24</span>
                            </h1>
                            {selectedClass ? (
                                <p className="text-sm text-blue-300/60 mt-0.5 flex items-center gap-1.5 font-mono">
                                    {selectedClass.subjectCode} (Sem {selectedClass.semester})
                                    {selectedExam && <><ChevronRight className="w-3 h-3" /><span className="text-white/80">{selectedExam.label}</span></>}
                                </p>
                            ) : (
                                <p className="text-sm text-blue-300/60 mt-0.5">Select a class to begin grading</p>
                            )}
                        </div>
                    </div>
                    {selectedClass && selectedExam && (
                        <div className="flex items-center gap-3">
                            <button onClick={exportCSV}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 rounded-xl text-sm font-semibold transition-all">
                                <Download className="w-4 h-4" /> Export CSV
                            </button>
                            <button onClick={handleSave} disabled={saving || fetchingStudents}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save &amp; Convert
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* ─── Sidebar ─── */}
                    <div className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col shrink-0">
                        <div className="p-4 border-b border-white/5 text-[11px] font-bold text-white/30 tracking-widest uppercase">1. Select Class</div>
                        <div className="p-2 space-y-1">
                            {classes.map((cls, idx) => (
                                <button key={idx} onClick={() => handleSelectClass(cls)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedClass === cls ? 'bg-blue-500/20 text-blue-300 pointer-events-none' : 'text-white/70 hover:bg-white/5'}`}>
                                    <div className="truncate">{cls.subjectDetails?.title || cls.subjectCode}</div>
                                    <div className="text-xs opacity-50 mt-0.5 font-mono">{cls.subjectCode} · Sem {cls.semester}</div>
                                </button>
                            ))}
                        </div>
                        {selectedClass && (
                            <>
                                <div className="p-4 border-y border-white/5 text-[11px] font-bold text-white/30 tracking-widest uppercase bg-white/[0.01]">2. Exam Type</div>
                                <div className="p-2 space-y-1 flex-1 overflow-y-auto">
                                    {EXAM_TYPES.map(exam => (
                                        <button key={exam.id} onClick={() => handleSelectExam(exam)}
                                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedExam?.id === exam.id ? 'bg-emerald-500/20 text-emerald-300 pointer-events-none' : 'text-white/70 hover:bg-white/5'}`}>
                                            <span>{exam.label}</span>
                                            <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono text-white/40">/{exam.maxRaw}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* ─── Main Content ─── */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-black/20 relative">
                        {!selectedClass || !selectedExam ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/20 p-10">
                                <Calculator className="w-16 h-16 mb-4 opacity-20" />
                                <h2 className="text-xl font-semibold mb-2">Grade Evaluator</h2>
                                <p className="text-sm text-white/40 text-center max-w-sm">
                                    Select a class and exam type from the sidebar.
                                    Conversion and totals are computed automatically per BEC regulations.
                                </p>
                            </div>
                        ) : fetchingStudents ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">

                                {/* ── Stats Bar ── */}
                                {stats && (
                                    <div className="shrink-0 px-6 pt-5 pb-0">
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                                            <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 text-center">
                                                <div className="text-2xl font-black text-blue-400">{stats.avg}</div>
                                                <div className="text-[10px] text-white/30 mt-1 uppercase tracking-widest font-bold">Avg Conv.</div>
                                            </div>
                                            <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 text-center">
                                                <div className="text-2xl font-black text-emerald-400">{stats.max}</div>
                                                <div className="text-[10px] text-white/30 mt-1 uppercase tracking-widest font-bold">Highest</div>
                                            </div>
                                            <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 text-center">
                                                <div className="text-2xl font-black text-red-400">{stats.min}</div>
                                                <div className="text-[10px] text-white/30 mt-1 uppercase tracking-widest font-bold">Lowest</div>
                                            </div>
                                            <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 text-center">
                                                <div className="text-2xl font-black text-emerald-400">{stats.passing}</div>
                                                <div className="text-[10px] text-white/30 mt-1 uppercase tracking-widest font-bold">Passing</div>
                                            </div>
                                            <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 text-center">
                                                <div className="text-2xl font-black text-red-400">{stats.failing}</div>
                                                <div className="text-[10px] text-white/30 mt-1 uppercase tracking-widest font-bold">Failing</div>
                                            </div>
                                        </div>

                                        {/* Grade Distribution */}
                                        {gradeDist && (
                                            <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 mb-5">
                                                <div className="flex items-center gap-2 mb-3 text-[11px] text-white/30 uppercase tracking-widest font-bold">
                                                    <BarChart2 className="w-3.5 h-3.5" /> Grade Distribution (Preview Totals)
                                                </div>
                                                <div className="flex items-end gap-3 flex-wrap">
                                                    {GRADE_ORDER.filter(g => (gradeDist[g] || 0) > 0).map(g => {
                                                        const cnt = gradeDist[g] || 0;
                                                        const pct = Math.round((cnt / stats.total) * 100);
                                                        return (
                                                            <div key={g} className="flex flex-col items-center gap-1">
                                                                <span className="text-xs font-black text-white/60">{cnt}</span>
                                                                <div className="w-10 flex flex-col justify-end bg-white/5 rounded-lg overflow-hidden" style={{ height: '48px' }}>
                                                                    <div className={`w-full rounded-lg transition-all ${g === 'F' ? 'bg-red-500/60' : g === 'P' ? 'bg-orange-500/60' : g === 'O' ? 'bg-yellow-500/70' : 'bg-blue-500/60'}`}
                                                                        style={{ height: `${Math.max(8, pct / 100 * 48)}px` }} />
                                                                </div>
                                                                <span className={`text-[11px] font-black rounded-md px-1.5 py-0.5 ${GRADE_COLOR[g] || 'text-white/30'}`}>{g}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {stats.notEntered > 0 && (
                                                        <div className="ml-auto text-xs text-white/25 italic self-end pb-1">
                                                            {stats.notEntered} student{stats.notEntered > 1 ? 's' : ''} without marks
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Inner Tabs */}
                                        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1 w-fit mb-4">
                                            <button onClick={() => setInnerTab('entry')}
                                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${innerTab === 'entry' ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/70'}`}>
                                                <FileSpreadsheet className="w-3.5 h-3.5" /> Grade Entry
                                            </button>
                                            <button onClick={() => setInnerTab('summary')}
                                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${innerTab === 'summary' ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white/70'}`}>
                                                <Table2 className="w-3.5 h-3.5" /> All Grades Summary
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto px-6 pb-6">
                                    {error && <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}
                                    {successMsg && (
                                        <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5" />{successMsg}
                                        </div>
                                    )}

                                    {innerTab === 'entry' ? (
                                        /* ─── GRADE ENTRY TABLE ─── */
                                        <div className="bg-[#151824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white/[0.03] border-b border-white/5 text-xs text-white/40 uppercase tracking-widest">
                                                        <th className="px-5 py-4 font-semibold w-10 text-center border-r border-white/5">#</th>
                                                        <th className="px-5 py-4 font-semibold w-28">USN</th>
                                                        <th className="px-5 py-4 font-semibold border-r border-white/5">Student Name</th>
                                                        <th className="px-5 py-4 font-semibold w-36 text-center bg-blue-500/5">
                                                            Raw Marks<br /><span className="font-normal text-blue-400/50 text-[10px] normal-case tracking-normal">(out of {selectedExam.maxRaw})</span>
                                                        </th>
                                                        <th className="px-5 py-4 font-semibold w-36 text-center text-emerald-400/50">
                                                            Converted<br /><span className="font-normal text-[10px] normal-case tracking-normal">(/{selectedExam.maxConv})</span>
                                                        </th>
                                                        <th className="px-5 py-4 font-semibold w-36 text-center text-indigo-400/50 border-l border-white/5">
                                                            Total<br /><span className="font-normal text-[10px] normal-case tracking-normal">(/100)</span>
                                                        </th>
                                                        <th className="px-5 py-4 font-semibold w-20 text-center"><Award className="w-3.5 h-3.5 inline-block mb-0.5" /> Grade</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {students.map((student, idx) => {
                                                        const rawVal = marksForm[student._id] ?? '';
                                                        const mathRaw = typeof rawVal === 'number' ? rawVal : 0;
                                                        const { conv, total } = previewTotal(student, selectedExam.id, mathRaw, selectedExam.maxRaw);
                                                        const lg = gradeLabel(total);
                                                        const isFailing = lg === 'F';
                                                        const pct = total / 100;
                                                        const barColor = total >= 75 ? 'bg-emerald-500' : total >= 50 ? 'bg-blue-500' : total > 0 ? 'bg-orange-500' : 'bg-white/10';

                                                        // colour-code raw input
                                                        const inputPct = mathRaw / selectedExam.maxRaw;
                                                        const inputBorder = rawVal === ''
                                                            ? 'border-white/10'
                                                            : inputPct >= 0.75 ? 'border-emerald-500/50'
                                                                : inputPct >= 0.4 ? 'border-blue-500/50'
                                                                : 'border-red-500/50';

                                                        return (
                                                            <tr key={student._id} className="hover:bg-white/[0.01] transition-colors group">
                                                                <td className="px-5 py-4 text-center text-white/25 text-xs border-r border-white/5 font-mono">{idx + 1}</td>
                                                                <td className="px-5 py-4 text-sm font-mono text-white/70">{student.usn}</td>
                                                                <td className="px-5 py-4 text-sm font-medium text-white/90 border-r border-white/5">{student.name}</td>
                                                                <td className="px-4 py-3 text-center bg-blue-500/[0.02]">
                                                                    <input
                                                                        type="number" min="0" max={selectedExam.maxRaw}
                                                                        value={rawVal}
                                                                        onChange={e => handleMarkChange(student._id, e.target.value)}
                                                                        className={`w-20 bg-black/40 border ${inputBorder} rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-2 py-1.5 text-center font-mono text-sm transition-all`}
                                                                        placeholder="0"
                                                                    />
                                                                </td>
                                                                <td className="px-5 py-4 text-center text-emerald-400 font-mono text-sm">{conv}</td>
                                                                <td className="px-5 py-4 text-center border-l border-white/5">
                                                                    <div className="flex flex-col items-center gap-1.5">
                                                                        <span className="font-mono text-indigo-300 font-bold text-base">{total}</span>
                                                                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                            <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct * 100}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-4 text-center">
                                                                    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-black ${GRADE_COLOR[lg] || 'text-white/20'}`}>
                                                                        {lg}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {students.length === 0 && (
                                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-white/30">No students found for this subject.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        /* ─── ALL GRADES SUMMARY ─── */
                                        <div className="bg-[#151824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                                            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 text-sm font-bold text-white/60">
                                                <TrendingUp className="w-4 h-4 text-indigo-400" />
                                                Complete Grade Ledger — All Exam Components
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse min-w-[800px]">
                                                    <thead>
                                                        <tr className="bg-white/[0.03] border-b border-white/5 text-[10px] text-white/40 uppercase tracking-widest">
                                                            <th className="px-5 py-4 font-bold w-10 text-center border-r border-white/5">#</th>
                                                            <th className="px-5 py-4 font-bold w-28">USN</th>
                                                            <th className="px-5 py-4 font-bold border-r border-white/5">Name</th>
                                                            <th className="px-5 py-4 font-bold text-center text-blue-400/60 w-24">CIE 1<br /><span className="normal-case tracking-normal font-normal text-[9px] text-white/20">{/* */}(/20)</span></th>
                                                            <th className="px-5 py-4 font-bold text-center text-purple-400/60 w-24">CIE 2<br /><span className="normal-case tracking-normal font-normal text-[9px] text-white/20">(/20)</span></th>
                                                            <th className="px-5 py-4 font-bold text-center text-teal-400/60 w-24">Asgn.<br /><span className="normal-case tracking-normal font-normal text-[9px] text-white/20">(/10)</span></th>
                                                            <th className="px-5 py-4 font-bold text-center text-orange-400/60 w-24">SEE<br /><span className="normal-case tracking-normal font-normal text-[9px] text-white/20">(/50)</span></th>
                                                            <th className="px-5 py-4 font-bold text-center border-l border-white/5 w-24">Total<br /><span className="normal-case tracking-normal font-normal text-[9px] text-white/20">(/100)</span></th>
                                                            <th className="px-5 py-4 font-bold text-center w-20">Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5">
                                                        {students.map((student, idx) => {
                                                            const g = student.grade || {};
                                                            const c1 = g.cie1?.convertedMarks || 0;
                                                            const c2 = g.cie2?.convertedMarks || 0;
                                                            const as = g.assignment?.convertedMarks || 0;
                                                            const se = g.see?.convertedMarks || 0;
                                                            const total = Math.min(c1 + c2 + as + se, 100);
                                                            const lg = gradeLabel(total);
                                                            
                                                            const cellVal = (v: number, max: number) => v > 0 ? (
                                                                <span className={`font-mono font-bold ${v / max >= 0.75 ? 'text-emerald-400' : v / max >= 0.4 ? 'text-blue-300' : 'text-red-400'}`}>{v}</span>
                                                            ) : <span className="text-white/20 font-mono">—</span>;

                                                            return (
                                                                <tr key={student._id} className="hover:bg-white/[0.01] transition-colors">
                                                                    <td className="px-5 py-3.5 text-center text-white/25 text-xs border-r border-white/5 font-mono">{idx + 1}</td>
                                                                    <td className="px-5 py-3.5 text-sm font-mono text-white/70">{student.usn}</td>
                                                                    <td className="px-5 py-3.5 text-sm font-medium text-white/90 border-r border-white/5">{student.name}</td>
                                                                    <td className="px-5 py-3.5 text-center text-sm">{cellVal(c1, 20)}</td>
                                                                    <td className="px-5 py-3.5 text-center text-sm">{cellVal(c2, 20)}</td>
                                                                    <td className="px-5 py-3.5 text-center text-sm">{cellVal(as, 10)}</td>
                                                                    <td className="px-5 py-3.5 text-center text-sm">{cellVal(se, 50)}</td>
                                                                    <td className="px-5 py-3.5 text-center border-l border-white/5">
                                                                        <div className="flex flex-col items-center gap-1">
                                                                            <span className="font-mono font-black text-indigo-300 text-base">{total > 0 ? total : '—'}</span>
                                                                            {total > 0 && (
                                                                                <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                                    <div className={`h-full transition-all ${total >= 75 ? 'bg-emerald-500' : total >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                                                        style={{ width: `${total}%` }} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-5 py-3.5 text-center">
                                                                        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-black ${GRADE_COLOR[lg] || 'text-white/20'}`}>{lg}</span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {students.length === 0 && (
                                                            <tr><td colSpan={9} className="px-6 py-12 text-center text-white/30">No students found.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-4 text-center text-xs text-white/25 flex justify-center items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3" /> Data persists to VTU-compliant Grade Schema
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        } />
    );
}