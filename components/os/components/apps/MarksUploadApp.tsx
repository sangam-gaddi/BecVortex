"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getMyFacultyProfile } from '@/lib/actions/faculty.actions';
import { getStudentsForSubjectGrade, bulkSaveMarks } from '@/lib/actions/grade.actions';
import { FileSpreadsheet, Loader2, Save, GraduationCap, Calculator, ChevronRight, CheckCircle2 } from 'lucide-react';

const EXAM_TYPES = [
    { id: 'cie1', label: 'CIE 1', maxRaw: 40, maxConv: 20 },
    { id: 'cie2', label: 'CIE 2', maxRaw: 40, maxConv: 20 },
    { id: 'assignment', label: 'Assignment', maxRaw: 20, maxConv: 10 },
    { id: 'see', label: 'Semester End Exam (SEE)', maxRaw: 100, maxConv: 50 },
];

export default function MarksUploadApp() {
    // Selection state
    const [faculty, setFaculty] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedExam, setSelectedExam] = useState<any>(null);

    // Data state
    const [students, setStudents] = useState<any[]>([]);
    const [marksForm, setMarksForm] = useState<Record<string, number>>({});

    // UI state
    const [loading, setLoading] = useState(true);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
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
            setClasses(res.assignedClasses || []);
        } else {
            setError(res.error || 'Failed to load profile.');
        }
        setLoading(false);
    };

    const handleSelectClass = async (cls: any) => {
        setSelectedClass(cls);
        setSelectedExam(null);
        setStudents([]);
        setMarksForm({});
        setSuccessMsg(null);
    };

    const handleSelectExam = async (exam: any) => {
        setSelectedExam(exam);
        setSuccessMsg(null);
        if (selectedClass) {
            fetchStudentsAndGrades(selectedClass.subjectCode, selectedClass.semester, exam.id);
        }
    };

    const fetchStudentsAndGrades = async (subjectCode: string, semester: number, examId: string) => {
        setFetchingStudents(true);
        setError(null);

        const res = await getStudentsForSubjectGrade(subjectCode, semester);
        if (res.success) {
            setStudents(res.students);

            // Populate form with existing raw marks
            const initialForm: Record<string, number> = {};
            res.students.forEach((s: any) => {
                const existingComponent = s.grade?.[examId];
                if (existingComponent && typeof existingComponent.rawMarks === 'number') {
                    initialForm[s._id] = existingComponent.rawMarks;
                }
            });
            setMarksForm(initialForm);
        } else {
            setError(res.error || 'Failed to fetch students.');
        }
        setFetchingStudents(false);
    };

    const handleMarkChange = (studentId: string, val: string) => {
        const num = parseInt(val, 10);
        setMarksForm(prev => {
            const next = { ...prev };
            if (isNaN(num)) {
                delete next[studentId];
            } else {
                next[studentId] = num;
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedClass || !selectedExam || students.length === 0) return;

        setSaving(true);
        setError(null);
        setSuccessMsg(null);

        // Prepare bulk data
        const marksData = students.map(s => ({
            studentId: s._id,
            rawMarks: marksForm[s._id] || 0 // Default 0 if absent/empty, or handle differently based on policy
        }));

        const res = await bulkSaveMarks(
            selectedClass.subjectCode,
            selectedClass.semester,
            selectedExam.id,
            marksData
        );

        if (res.success) {
            setSuccessMsg(`Successfully saved ${selectedExam.label} marks for ${students.length} students.`);
            // Refresh to get updated total/grade maps
            fetchStudentsAndGrades(selectedClass.subjectCode, selectedClass.semester, selectedExam.id);
        } else {
            setError(res.error || 'Failed to save marks.');
        }
        setSaving(false);
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

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white overflow-hidden">
                    {/* Header */}
                    <div className="bg-indigo-900/25 border-b border-indigo-500/15 p-5 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
                                <FileSpreadsheet className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold flex items-center gap-2">
                                    Marks Evaluator
                                    <span className="text-xs font-normal text-blue-400/80 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/20">
                                        BEC Regulations '24
                                    </span>
                                </h1>
                                {selectedClass ? (
                                    <p className="text-sm text-blue-300/60 mt-0.5 flex items-center gap-1.5">
                                        {selectedClass.subjectCode} (Sem {selectedClass.semester})
                                        {selectedExam && (
                                            <>
                                                <ChevronRight className="w-3 h-3" />
                                                <span className="text-white/80">{selectedExam.label}</span>
                                            </>
                                        )}
                                    </p>
                                ) : (
                                    <p className="text-sm text-blue-300/60 mt-0.5">Select a class to begin grading</p>
                                )}
                            </div>
                        </div>

                        {selectedClass && selectedExam && (
                            <button
                                onClick={handleSave}
                                disabled={saving || fetchingStudents}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save & Convert
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar: Class & Exam Selection */}
                        <div className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col shrink-0">
                            <div className="p-4 border-b border-white/5 font-semibold text-sm text-white/50 tracking-wider">
                                1. SELECT CLASS
                            </div>
                            <div className="p-2 space-y-1">
                                {classes.map((cls, idx) => (
                                    <button
                                        key={`cls-${idx}`}
                                        onClick={() => handleSelectClass(cls)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedClass === cls
                                                ? 'bg-blue-500/20 text-blue-300 pointer-events-none'
                                                : 'text-white/70 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="truncate">{cls.subjectDetails?.title || cls.subjectCode}</div>
                                        <div className="text-xs opacity-50 mt-0.5 font-mono">{cls.subjectCode} • Sem {cls.semester}</div>
                                    </button>
                                ))}
                            </div>

                            {selectedClass && (
                                <>
                                    <div className="p-4 border-y border-white/5 font-semibold text-sm text-white/50 tracking-wider bg-white/[0.01]">
                                        2. SELECT EXAM TYPE
                                    </div>
                                    <div className="p-2 space-y-1 flex-1 overflow-y-auto">
                                        {EXAM_TYPES.map(exam => (
                                            <button
                                                key={exam.id}
                                                onClick={() => handleSelectExam(exam)}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedExam?.id === exam.id
                                                        ? 'bg-emerald-500/20 text-emerald-300 pointer-events-none'
                                                        : 'text-white/70 hover:bg-white/5'
                                                    }`}
                                            >
                                                <span>{exam.label}</span>
                                                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono text-white/40">
                                                    /{exam.maxRaw}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Main Content: Grading Table */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-black/20 relative">
                            {!selectedClass || !selectedExam ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/20 p-10">
                                    <Calculator className="w-16 h-16 mb-4 opacity-20" />
                                    <h2 className="text-xl font-semibold mb-2">Grade Evaluator</h2>
                                    <p className="text-sm text-white/40 text-center max-w-sm">
                                        Select a class and an exam type from the sidebar to start entering raw marks.
                                        Conversion and total tallying is done automatically based on BEC regulations.
                                    </p>
                                </div>
                            ) : fetchingStudents ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto w-full p-6">
                                    {error && (
                                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                            {error}
                                        </div>
                                    )}
                                    {successMsg && (
                                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5" />
                                            {successMsg}
                                        </div>
                                    )}

                                    <div className="bg-[#151824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/[0.03] border-b border-white/5 text-xs text-white/40 uppercase tracking-widest">
                                                    <th className="px-6 py-4 font-semibold w-12 text-center border-r border-white/5">#</th>
                                                    <th className="px-6 py-4 font-semibold w-32">USN</th>
                                                    <th className="px-6 py-4 font-semibold border-r border-white/5">Student Name</th>
                                                    <th className="px-6 py-4 font-semibold w-40 text-center bg-blue-500/5">
                                                        Raw Marks<br />({selectedExam.maxRaw})
                                                    </th>
                                                    <th className="px-6 py-4 font-semibold w-40 text-center text-emerald-400/50">
                                                        Converted<br />({selectedExam.maxConv})
                                                    </th>
                                                    <th className="px-6 py-4 font-semibold w-40 text-center text-indigo-400/50 border-l border-white/5">
                                                        Current Total<br />(100)
                                                    </th>
                                                    <th className="px-6 py-4 font-semibold w-24 text-center">
                                                        Grade
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {students.map((student, idx) => {
                                                    const rawVal = marksForm[student._id] ?? '';

                                                    // Math for UI preview
                                                    const mathRaw = typeof rawVal === 'number' ? rawVal : 0;
                                                    const clampedRaw = Math.min(Math.max(0, mathRaw), selectedExam.maxRaw);
                                                    const previewConv = Math.ceil(clampedRaw / 2);

                                                    // Calculate total for preview (existing overall + this uncommitted change)
                                                    const g = student.grade || {};

                                                    let cie1 = g.cie1?.convertedMarks || 0;
                                                    let cie2 = g.cie2?.convertedMarks || 0;
                                                    let assmt = g.assignment?.convertedMarks || 0;
                                                    let see = g.see?.convertedMarks || 0;

                                                    // Substitute current exam preview
                                                    if (selectedExam.id === 'cie1') cie1 = previewConv;
                                                    if (selectedExam.id === 'cie2') cie2 = previewConv;
                                                    if (selectedExam.id === 'assignment') assmt = previewConv;
                                                    if (selectedExam.id === 'see') see = previewConv;

                                                    const previewTotal = Math.min(cie1 + cie2 + assmt + see, 100);

                                                    let lg = '-';
                                                    if (previewTotal >= 90) lg = 'O';
                                                    else if (previewTotal >= 80) lg = 'A+';
                                                    else if (previewTotal >= 70) lg = 'A';
                                                    else if (previewTotal >= 60) lg = 'B+';
                                                    else if (previewTotal >= 55) lg = 'B';
                                                    else if (previewTotal >= 50) lg = 'C';
                                                    else if (previewTotal >= 40) lg = 'P';
                                                    else if (previewTotal > 0) lg = 'F';

                                                    const isFailing = lg === 'F' && previewTotal > 0;

                                                    return (
                                                        <tr key={student._id} className="hover:bg-white/[0.01] transition-colors group">
                                                            <td className="px-6 py-4 text-center text-white/30 text-xs border-r border-white/5 font-mono">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-mono text-white/70">
                                                                {student.usn}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-medium text-white/90 border-r border-white/5">
                                                                {student.name}
                                                            </td>
                                                            <td className="px-6 py-3 text-center bg-blue-500/[0.02]">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={selectedExam.maxRaw}
                                                                    value={rawVal}
                                                                    onChange={(e) => handleMarkChange(student._id, e.target.value)}
                                                                    className="w-20 bg-black/40 border border-white/10 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-2 py-1.5 text-center font-mono text-sm transition-all"
                                                                    placeholder="0"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 text-center text-emerald-400 font-mono text-sm group-hover:bg-emerald-500/[0.02] transition-colors">
                                                                {previewConv}
                                                            </td>
                                                            <td className="px-6 py-4 text-center border-l border-white/5 group-hover:bg-indigo-500/[0.02] transition-colors">
                                                                <div className="flex flex-col items-center">
                                                                    <span className="font-mono text-indigo-300 font-bold">{previewTotal}</span>
                                                                    <div className="w-16 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-indigo-500 transition-all"
                                                                            style={{ width: `${previewTotal}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${isFailing ? 'bg-red-500/20 text-red-400' :
                                                                        lg !== '-' ? 'bg-white/10 text-white' : 'text-white/20'
                                                                    }`}>
                                                                    {lg}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {students.length === 0 && !fetchingStudents && (
                                                    <tr>
                                                        <td colSpan={7} className="px-6 py-12 text-center text-white/40">
                                                            No students found for this subject.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 text-center text-xs text-white/30 flex justify-center items-center gap-2">
                                        <CheckCircle2 className="w-3 h-3" /> Data auto-saves to VTU compliant Grade Schema
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
