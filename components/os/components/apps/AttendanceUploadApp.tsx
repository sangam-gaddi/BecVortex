"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getMyFacultyProfile } from '@/lib/actions/faculty.actions';
import { getStudentsForAttendance, submitRapidAttendance, getAttendanceHistory } from '@/lib/actions/attendance.actions';
import { CalendarCheck, Loader2, Save, Users, History, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AttendanceUploadApp() {
    // Selection state
    const [faculty, setFaculty] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any>(null);

    // Data state
    const [students, setStudents] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);

    // Form state
    const [topicTaught, setTopicTaught] = useState('');
    const [sessionType, setSessionType] = useState('Regular Class');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [timeSlot, setTimeSlot] = useState('08:00 AM - 09:00 AM');
    const [selectedAbsentIds, setSelectedAbsentIds] = useState<string[]>([]);
    const [tab, setTab] = useState<'new' | 'review' | 'history'>('new');

    const TIME_SLOTS = [
        '08:00 AM - 09:00 AM',
        '09:00 AM - 10:00 AM',
        '10:30 AM - 11:30 AM',
        '11:30 AM - 12:30 PM',
        '02:00 PM - 03:00 PM',
        '03:00 PM - 04:00 PM',
        '04:00 PM - 05:00 PM'
    ];

    const SESSION_TYPES = ['Regular Class', 'Extra Class', 'Remedial Class', 'Lab Session'];

    // UI state
    const [loading, setLoading] = useState(true);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(false);
    const [submitting, setSubmitting] = useState(false);
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
        setTab('new');
        setSuccessMsg(null);
        setError(null);
        setTopicTaught('');
        setSelectedAbsentIds([]);
        fetchStudents(cls);
    };

    const fetchStudents = async (cls: any) => {
        setFetchingStudents(true);
        const res = await getStudentsForAttendance(cls.subjectCode, cls.semester);
        if (res.success) {
            setStudents(res.students);
        } else {
            setError(res.error || 'Failed to fetch students.');
        }
        setFetchingStudents(false);
    };

    const fetchHistory = async () => {
        if (!selectedClass) return;
        setFetchingHistory(true);
        const res = await getAttendanceHistory(selectedClass.subjectCode, selectedClass.semester);
        if (res.success) {
            setHistory(res.history);
        } else {
            setError(res.error || 'Failed to fetch history.');
        }
        setFetchingHistory(false);
    };

    const handleTabChange = (t: 'new' | 'review' | 'history') => {
        setTab(t);
        setSuccessMsg(null);
        setError(null);
        if (t === 'history') {
            fetchHistory();
        }
    };

    const handleReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass) return;
        if (!topicTaught.trim() || !timeSlot.trim() || !date) {
            setError('Topic, Date, and Time Slot are required.');
            return;
        }
        setTab('review');
    };

    const handleSubmit = async () => {
        if (!selectedClass) return;

        setSubmitting(true);
        setError(null);
        setSuccessMsg(null);

        const res = await submitRapidAttendance({
            subjectCode: selectedClass.subjectCode,
            semester: selectedClass.semester,
            topicTaught: `${sessionType}: ${topicTaught}`,
            date: new Date(date),
            timeSlot,
            absentStudentIds: selectedAbsentIds
        });

        if (res.success) {
            setSuccessMsg(res.message || 'Attendance logged successfully.');
            setSelectedAbsentIds([]);
            setTopicTaught(''); // Reset for next class
            setTab('new');
        } else {
            setError(res.error || 'Failed to submit attendance.');
        }
        setSubmitting(false);
    };

    if (loading) {
        return (
            <AppTemplate hasSidebar={false} content={
                <div className="h-full flex items-center justify-center bg-[#0f111a]">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
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
                    <div className="bg-emerald-900/25 border-b border-emerald-500/15 p-5 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                                <CalendarCheck className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold flex items-center gap-2">
                                    Rapid Attendance
                                    <span className="text-xs font-normal text-emerald-400/80 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        Absent-Only Mode
                                    </span>
                                </h1>
                                {selectedClass ? (
                                    <p className="text-sm text-emerald-300/60 mt-0.5 font-mono">
                                        {selectedClass.subjectCode} • Sem {selectedClass.semester}
                                    </p>
                                ) : (
                                    <p className="text-sm text-emerald-300/60 mt-0.5">Select a class to log attendance</p>
                                )}
                            </div>
                        </div>

                        {selectedClass && (
                            <div className="flex bg-black/40 border border-white/10 rounded-xl p-1">
                                <button
                                    onClick={() => handleTabChange('new')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'new' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white/70'
                                        }`}
                                >
                                    Log Session
                                </button>
                                <button
                                    onClick={() => handleTabChange('history')}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === 'history' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white/70'
                                        }`}
                                >
                                    History
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Sidebar: Class Selection */}
                        <div className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col shrink-0">
                            <div className="p-4 border-b border-white/5 font-semibold text-sm text-white/50 tracking-wider">
                                MY CLASSES
                            </div>
                            <div className="p-2 space-y-1 overflow-y-auto">
                                {classes.map((cls, idx) => (
                                    <button
                                        key={`cls-${idx}`}
                                        onClick={() => handleSelectClass(cls)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedClass === cls
                                            ? 'bg-emerald-500/20 text-emerald-300 pointer-events-none'
                                            : 'text-white/70 hover:bg-white/5'
                                            }`}
                                    >
                                        <div className="truncate">{cls.subjectDetails?.title || cls.subjectCode}</div>
                                        <div className="text-xs opacity-50 mt-0.5 font-mono">Sem {cls.semester} {cls.section ? `· Sec ${cls.section}` : ''}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col overflow-y-auto bg-black/20 p-6">
                            {!selectedClass ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/20">
                                    <Users className="w-16 h-16 mb-4 opacity-20" />
                                    <h2 className="text-xl font-semibold mb-2">Select a Class</h2>
                                    <p className="text-sm text-white/40 max-w-sm text-center">
                                        Choose a class from the sidebar to rapidly log attendance for today's session.
                                    </p>
                                </div>
                            ) : fetchingStudents ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                                </div>
                            ) : tab === 'new' ? (
                                <div className="max-w-3xl mx-auto w-full">
                                    {error && (
                                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex gap-3 items-start">
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            {error}
                                        </div>
                                    )}
                                    {successMsg && (
                                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex gap-3 items-start">
                                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                            {successMsg}
                                        </div>
                                    )}

                                    <form onSubmit={handleReview} className="bg-[#151824] border border-white/5 rounded-2xl p-6 shadow-2xl">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                                            <div>
                                                <label className="block text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">Session Type</label>
                                                <select
                                                    value={sessionType}
                                                    onChange={(e) => setSessionType(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none px-4 py-3 text-sm text-white appearance-none"
                                                >
                                                    {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">Date</label>
                                                <input
                                                    type="date"
                                                    value={date}
                                                    onChange={(e) => setDate(e.target.value)}
                                                    required
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none px-4 py-3 text-sm text-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">Time Slot</label>
                                                <select
                                                    value={timeSlot}
                                                    onChange={(e) => setTimeSlot(e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none px-4 py-3 text-sm text-white appearance-none"
                                                >
                                                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <label className="block text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">Topic Taught</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Introduction to Operating Systems, Process Scheduling"
                                                value={topicTaught}
                                                onChange={(e) => setTopicTaught(e.target.value)}
                                                required
                                                className="w-full bg-black/40 border border-white/10 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none px-4 py-3 text-sm text-white"
                                            />
                                        </div>

                                        <div className="mb-8">
                                            <label className="flex items-center justify-between text-xs uppercase tracking-wider text-white/50 mb-4 font-semibold">
                                                <span>Select Absent Students</span>
                                                <span className="text-emerald-400/50 normal-case tracking-normal">{selectedAbsentIds.length} Absent / {students.length - selectedAbsentIds.length} Present</span>
                                            </label>

                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                {students.map((student) => {
                                                    const isAbsent = selectedAbsentIds.includes(student._id.toString());
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={student._id}
                                                            onClick={() => {
                                                                const id = student._id.toString();
                                                                setSelectedAbsentIds(prev =>
                                                                    prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
                                                                );
                                                            }}
                                                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${isAbsent
                                                                ? 'bg-red-500/10 border-red-500/30'
                                                                : 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10'
                                                                }`}
                                                        >
                                                            <span className={`text-xs font-mono mb-1 ${isAbsent ? 'text-red-400' : 'text-emerald-400/50'}`}>{student.usn}</span>
                                                            <span className={`text-sm font-medium line-clamp-1 ${isAbsent ? 'text-red-200' : 'text-white/80'}`}>{student.studentName}</span>
                                                            <span className={`text-[10px] mt-2 px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold ${isAbsent ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                                                                }`}>
                                                                {isAbsent ? 'Absent' : 'Present'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all"
                                        >
                                            Review & Verify Attendance
                                        </button>
                                    </form>
                                </div>
                            ) : tab === 'review' ? (
                                <div className="max-w-3xl mx-auto w-full flex flex-col h-full bg-[#151824] border border-white/5 rounded-2xl p-6 shadow-2xl">
                                    <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                        Verify Attendance Details
                                    </h2>

                                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-black/40 rounded-xl border border-white/5">
                                        <div><span className="text-white/40 text-xs uppercase block">Session</span><span className="text-sm">{sessionType}</span></div>
                                        <div><span className="text-white/40 text-xs uppercase block">Topic</span><span className="text-sm">{topicTaught}</span></div>
                                        <div><span className="text-white/40 text-xs uppercase block">Date & Time</span><span className="text-sm">{date} | {timeSlot}</span></div>
                                        <div><span className="text-white/40 text-xs uppercase block">Stats</span><span className="text-sm"><span className="text-emerald-400 font-bold">{students.length - selectedAbsentIds.length}</span> Present, <span className="text-red-400 font-bold">{selectedAbsentIds.length}</span> Absent</span></div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl mb-6">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-[#1a1d2d] z-10 border-b border-white/5 shadow-sm">
                                                <tr className="text-xs text-white/40 uppercase tracking-widest">
                                                    <th className="px-6 py-4 font-semibold w-32 border-r border-white/5">USN</th>
                                                    <th className="px-6 py-4 font-semibold">Student Name</th>
                                                    <th className="px-6 py-4 font-semibold w-32 text-center border-l border-white/5">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 bg-black/40">
                                                {students.map((student) => {
                                                    const isAbsent = selectedAbsentIds.includes(student._id.toString());
                                                    return (
                                                        <tr key={student._id}>
                                                            <td className="px-6 py-3 text-sm font-mono text-white/70 border-r border-white/5">{student.usn}</td>
                                                            <td className="px-6 py-3 text-sm font-medium text-white/90">{student.studentName}</td>
                                                            <td className="px-6 py-3 text-center border-l border-white/5">
                                                                {isAbsent ? (
                                                                    <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-md">Absent</span>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md">Present</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setTab('new')}
                                            disabled={submitting}
                                            className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-all"
                                        >
                                            Go Back
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25 transition-all"
                                        >
                                            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            Confirm & Submit Attendance
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="max-w-4xl mx-auto w-full">
                                    {fetchingHistory ? (
                                        <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                                    ) : history.length === 0 ? (
                                        <div className="text-center p-10 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                            <p className="text-white/40 font-medium">No previous sessions found for this class.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {history.map((record, i) => (
                                                <div key={i} className="bg-[#151824] border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-lg">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="font-semibold text-white">{new Date(record.date).toLocaleDateString()}</span>
                                                            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-md">{record.timeSlot}</span>
                                                        </div>
                                                        <p className="text-sm text-white/70">{record.topicTaught}</p>
                                                    </div>
                                                    <div className="flex gap-4 items-center">
                                                        <div className="text-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                                            <div className="text-lg font-bold text-emerald-400 leading-none">{record.presentCount}</div>
                                                            <div className="text-[10px] text-emerald-400/50 uppercase mt-1 tracking-wider">Present</div>
                                                        </div>
                                                        <div className="text-center px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
                                                            <div className="text-lg font-bold text-red-400 leading-none">{record.absentCount}</div>
                                                            <div className="text-[10px] text-red-400/50 uppercase mt-1 tracking-wider">Absent</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            }
        />
    );
}
