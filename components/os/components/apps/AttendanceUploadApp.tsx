"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getMyFacultyProfile } from '@/lib/actions/faculty.actions';
import {
    getStudentsForAttendance,
    submitRapidAttendance,
    getAttendanceHistory,
    getOverallAttendanceBook,
} from '@/lib/actions/attendance.actions';
import {
    CalendarCheck, Loader2, Save, Users, History, CheckCircle2, AlertCircle,
    Clock, ChevronDown, ChevronUp, Download, BookOpen,
} from 'lucide-react';


function to12h(t: string) {
    if (!t) return '';
    const [hh, mm] = t.split(':');
    let h = parseInt(hh, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h.toString().padStart(2, '0')}:${mm} ${ampm}`;
}

export default function AttendanceUploadApp() {
    const [faculty, setFaculty] = useState<any>(null);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [bookData, setBookData] = useState<{ students: any[]; sessions: any[] } | null>(null);

    const [topicTaught, setTopicTaught] = useState('');
    const [sessionType, setSessionType] = useState('Regular Class');
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [fromTime, setFromTime] = useState('08:00');
    const [toTime, setToTime] = useState('09:00');
    const [selectedAbsentIds, setSelectedAbsentIds] = useState<string[]>([]);
    const [tab, setTab] = useState<'new' | 'review' | 'history' | 'book'>('new');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const SESSION_TYPES = ['Regular Class', 'Extra Class', 'Remedial Class', 'Lab Session'];

    const [loading, setLoading] = useState(true);
    const [fetchingStudents, setFetchingStudents] = useState(false);
    const [fetchingHistory, setFetchingHistory] = useState(false);
    const [fetchingBook, setFetchingBook] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const timeSlot = fromTime && toTime ? `${to12h(fromTime)} - ${to12h(toTime)}` : '';

    useEffect(() => { loadProfile(); }, []);

    const loadProfile = async () => {
        setLoading(true);
        const res = await getMyFacultyProfile();
        if (res.success) { setFaculty(res.faculty); setClasses(res.assignedClasses || []); }
        else setError(res.error || 'Failed to load profile.');
        setLoading(false);
    };

    const handleSelectClass = async (cls: any) => {
        setSelectedClass(cls); setTab('new'); setSuccessMsg(null); setError(null);
        setTopicTaught(''); setSelectedAbsentIds([]); setHistory([]); setBookData(null);
        setExpandedIds(new Set());
        fetchStudents(cls);
    };

    const fetchStudents = async (cls: any) => {
        setFetchingStudents(true);
        const res = await getStudentsForAttendance(cls.subjectCode, cls.semester);
        if (res.success) setStudents(res.students); else setError(res.error || 'Failed to fetch students.');
        setFetchingStudents(false);
    };

    const fetchHistory = async () => {
        if (!selectedClass) return;
        setFetchingHistory(true);
        const res = await getAttendanceHistory(selectedClass.subjectCode, selectedClass.semester);
        if (res.success) setHistory(res.history); else setError(res.error || '');
        setFetchingHistory(false);
    };

    const fetchBook = async () => {
        if (!selectedClass) return;
        setFetchingBook(true);
        const res = await getOverallAttendanceBook(selectedClass.subjectCode, selectedClass.semester);
        if (res.success) setBookData({ students: res.students!, sessions: res.sessions! });
        else setError(res.error || '');
        setFetchingBook(false);
    };

    const handleTabChange = (t: 'new' | 'review' | 'history' | 'book') => {
        setTab(t); setSuccessMsg(null); setError(null);
        if (t === 'history' && history.length === 0) fetchHistory();
        if (t === 'book' && !bookData) fetchBook();
    };

    const handleReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topicTaught.trim() || !date || !timeSlot) { setError('Please fill all fields.'); return; }
        setTab('review');
    };

    const handleSubmit = async () => {
        if (!selectedClass) return;
        setSubmitting(true); setError(null); setSuccessMsg(null);
        const res = await submitRapidAttendance({
            subjectCode: selectedClass.subjectCode, semester: selectedClass.semester,
            topicTaught: `${sessionType}: ${topicTaught}`, date: new Date(date),
            timeSlot, absentStudentIds: selectedAbsentIds,
        });
        if (res.success) {
            setSuccessMsg(res.message || 'Attendance logged.');
            setSelectedAbsentIds([]); setTopicTaught(''); setTab('new');
            setHistory([]); setBookData(null);
        } else setError(res.error || 'Failed to submit.');
        setSubmitting(false);
    };

    const toggleExpand = (id: string) => setExpandedIds(prev => {
        const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
    });

    const downloadCSV = () => {
        if (!bookData) return;
        const { students: bStudents, sessions } = bookData;
        const hdr = [
            'USN', 'Name',
            ...sessions.map((s: any) =>
                `${new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} (${s.timeSlot})`
            ),
            'Present Count', 'Absent Count', 'Attendance %',
        ];
        const rows = bStudents.map((st: any) => {
            let p = 0, a = 0;
            const cells = sessions.map((s: any) => {
                if (s.presentIds.includes(st._id)) { p++; return 'P'; }
                if (s.absentIds.includes(st._id)) { a++; return 'A'; }
                return '-';
            });
            const tot = p + a;
            return [st.usn, st.name, ...cells, p, a, tot > 0 ? ((p / tot) * 100).toFixed(1) + '%' : '0%'];
        });
        const csv = [hdr, ...rows]
            .map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_${selectedClass?.subjectCode}_Sem${selectedClass?.semester}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return (
        <AppTemplate hasSidebar={false} content={
            <div className="h-full flex items-center justify-center bg-[#0f111a]">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        } />
    );

    return (
        <AppTemplate hasSidebar={false} content={
            <div className="h-full flex flex-col bg-[#0f111a] text-white overflow-hidden">

                {/* â”€â”€â”€ Header â”€â”€â”€ */}
                <div className="bg-emerald-900/25 border-b border-emerald-500/15 p-5 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                            <CalendarCheck className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                Attendance Manager
                                <span className="text-xs font-normal text-emerald-400/80 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/20">BEC Smart System</span>
                            </h1>
                            {selectedClass
                                ? <p className="text-sm text-emerald-300/60 mt-0.5 font-mono">{selectedClass.subjectCode} · {selectedClass.subjectDetails?.title || ''} · Sem {selectedClass.semester}</p>
                                : <p className="text-sm text-emerald-300/60 mt-0.5">Select a class to log attendance</p>}
                        </div>
                    </div>
                    {selectedClass && (
                        <div className="flex bg-black/40 border border-white/10 rounded-xl p-1">
                            {(['new', 'history', 'book'] as const).map(t => (
                                <button key={t} onClick={() => handleTabChange(t)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${(tab === t || (tab === 'review' && t === 'new')) ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/40 hover:text-white/70'}`}>
                                    {t === 'new' ? 'Log Session' : t === 'history' ? 'History' : 'Attendance Book'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* â”€â”€â”€ Sidebar â”€â”€â”€ */}
                    <div className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col shrink-0">
                        <div className="p-4 border-b border-white/5 text-[11px] font-bold text-white/30 tracking-widest uppercase">My Classes</div>
                        <div className="p-2 space-y-1 overflow-y-auto flex-1">
                            {classes.map((cls, i) => (
                                <button key={i} onClick={() => handleSelectClass(cls)}
                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedClass === cls ? 'bg-emerald-500/20 text-emerald-300 pointer-events-none' : 'text-white/70 hover:bg-white/5'}`}>
                                    <div className="truncate font-semibold">{cls.subjectDetails?.title || cls.subjectCode}</div>
                                    <div className="text-xs opacity-50 mt-0.5 font-mono">{cls.subjectCode} · Sem {cls.semester}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* â”€â”€â”€ Main Content â”€â”€â”€ */}
                    <div className="flex-1 flex flex-col overflow-y-auto bg-black/20 p-6">
                        {!selectedClass ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/20">
                                <Users className="w-20 h-20 mb-4 opacity-20" />
                                <h2 className="text-2xl font-bold mb-2">Select a Class</h2>
                                <p className="text-sm text-white/30 text-center max-w-xs">Choose a subject from the sidebar to log or review attendance.</p>
                            </div>
                        ) : fetchingStudents ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                        ) : tab === 'new' ? (

                            /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ LOG SESSION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                            <div className="max-w-4xl mx-auto w-full">
                                {error && <div className="mb-5 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex gap-3 items-start"><AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />{error}</div>}
                                {successMsg && <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex gap-3 items-start"><CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />{successMsg}</div>}

                                <form onSubmit={handleReview} className="bg-[#151824] border border-white/5 rounded-2xl p-8 shadow-2xl space-y-8">
                                    {/* Meta row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[11px] uppercase tracking-widest text-white/40 mb-3 font-bold">Session Type</label>
                                            <select value={sessionType} onChange={e => setSessionType(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl focus:border-emerald-500 outline-none px-4 py-3 text-sm text-white appearance-none">
                                                {SESSION_TYPES.map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] uppercase tracking-widest text-white/40 mb-3 font-bold">Date</label>
                                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                                                className="w-full bg-black/40 border border-white/10 rounded-xl focus:border-emerald-500 outline-none px-4 py-3 text-sm text-white" />
                                        </div>
                                    </div>

                                    {/* Time Selector */}
                                    <div className="p-5 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-2xl">
                                        <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-emerald-400/80 mb-5 font-bold">
                                            <Clock className="w-3.5 h-3.5" /> Session Time
                                        </label>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-semibold">From</p>
                                                <input type="time" value={fromTime} onChange={e => setFromTime(e.target.value)}
                                                    className="w-full bg-black/50 border border-emerald-500/25 rounded-xl focus:border-emerald-500 outline-none px-4 py-3 text-lg font-mono text-emerald-300 text-center tracking-widest" />
                                            </div>
                                            <div className="flex flex-col items-center gap-1 pt-7 shrink-0">
                                                <div className="w-7 h-0.5 bg-emerald-500/30" />
                                                <span className="text-emerald-500/40 text-[10px] font-black">TO</span>
                                                <div className="w-7 h-0.5 bg-emerald-500/30" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 font-semibold">To</p>
                                                <input type="time" value={toTime} onChange={e => setToTime(e.target.value)}
                                                    className="w-full bg-black/50 border border-emerald-500/25 rounded-xl focus:border-emerald-500 outline-none px-4 py-3 text-lg font-mono text-emerald-300 text-center tracking-widest" />
                                            </div>
                                            <div className="flex-1 pt-7 shrink-0">
                                                <div className="bg-black/60 border border-white/10 rounded-xl px-4 py-3.5 text-center">
                                                    <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1">Computed Slot</p>
                                                    <p className="text-sm font-mono font-bold text-white truncate">{timeSlot || '—'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Topic */}
                                    <div>
                                        <label className="block text-[11px] uppercase tracking-widest text-white/40 mb-3 font-bold">Topic Taught</label>
                                        <input type="text" placeholder="e.g. Introduction to Linked Lists, Ohm's Law, Process Scheduling"
                                            value={topicTaught} onChange={e => setTopicTaught(e.target.value)} required
                                            className="w-full bg-black/40 border border-white/10 rounded-xl focus:border-emerald-500 outline-none px-4 py-3 text-sm text-white" />
                                    </div>

                                    {/* Student Grid — ENLARGED */}
                                    <div>
                                        <div className="flex items-center justify-between mb-5">
                                            <label className="text-[11px] uppercase tracking-widest text-white/40 font-bold">
                                                Mark Absent <span className="normal-case tracking-normal font-normal text-white/20">(tap to toggle)</span>
                                            </label>
                                            <div className="flex items-center gap-2 text-sm font-semibold">
                                                <span className="text-red-400 font-mono text-base">{selectedAbsentIds.length}</span>
                                                <span className="text-white/30 text-xs">Absent /</span>
                                                <span className="text-emerald-400 font-mono text-base">{students.length - selectedAbsentIds.length}</span>
                                                <span className="text-white/30 text-xs">Present</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto pr-1">
                                            {students.map(student => {
                                                const absent = selectedAbsentIds.includes(student._id.toString());
                                                return (
                                                    <button type="button" key={student._id}
                                                        onClick={() => {
                                                            const id = student._id.toString();
                                                            setSelectedAbsentIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
                                                        }}
                                                        className={`flex flex-col items-center p-4 rounded-2xl border text-center transition-all duration-150 select-none ${absent
                                                            ? 'bg-red-500/15 border-red-500/40 shadow-md shadow-red-900/20'
                                                            : 'bg-emerald-500/[0.04] border-emerald-500/15 hover:bg-emerald-500/10 hover:border-emerald-500/25'}`}>
                                                        <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 text-base font-black ${absent ? 'bg-red-500/25 text-red-300' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                                            {student.studentName?.charAt(0)?.toUpperCase() || '?'}
                                                        </div>
                                                        <span className={`text-[11px] font-mono font-black tracking-wide mb-1.5 ${absent ? 'text-red-300/80' : 'text-emerald-400/60'}`}>{student.usn}</span>
                                                        <span className={`text-sm font-semibold leading-snug ${absent ? 'text-red-100' : 'text-white/80'}`}>{student.studentName}</span>
                                                        <span className={`mt-3 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-black ${absent ? 'bg-red-500/25 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                            {absent ? '✕  Absent' : '✓  Present'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button type="submit"
                                        className="w-full py-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-2xl text-sm font-bold tracking-wide transition-all">
                                        Review & Confirm →
                                    </button>
                                </form>
                            </div>

                        ) : tab === 'review' ? (

                            /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ REVIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                            <div className="max-w-4xl mx-auto w-full flex flex-col bg-[#151824] border border-white/5 rounded-2xl p-8 shadow-2xl gap-6">
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Verify Before Submitting
                                </h2>
                                {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex gap-3 items-start"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-black/40 rounded-2xl border border-white/5 text-sm">
                                    <div><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Session</p><p className="font-semibold">{sessionType}</p></div>
                                    <div><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Date</p><p className="font-mono">{date}</p></div>
                                    <div><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Time Slot</p><p className="font-mono text-xs">{timeSlot}</p></div>
                                    <div><p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Attendance</p>
                                        <p><span className="text-emerald-400 font-bold">{students.length - selectedAbsentIds.length}</span> P · <span className="text-red-400 font-bold">{selectedAbsentIds.length}</span> A</p></div>
                                </div>
                                <div>
                                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Topic Taught</p>
                                    <p className="text-sm bg-black/30 px-4 py-2.5 rounded-xl border border-white/5">{topicTaught}</p>
                                </div>
                                <div className="overflow-auto max-h-80 rounded-2xl border border-white/10 shadow-inner">
                                    <table className="w-full text-left">
                                        <thead className="sticky top-0 bg-[#1a1d2d] border-b border-white/5 text-[10px] text-white/40 uppercase tracking-widest">
                                            <tr>
                                                <th className="px-5 py-3 border-r border-white/5 w-32">USN</th>
                                                <th className="px-5 py-3">Student Name</th>
                                                <th className="px-5 py-3 text-center border-l border-white/5 w-28">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04] bg-black/30">
                                            {students.map(s => {
                                                const absent = selectedAbsentIds.includes(s._id.toString());
                                                return (
                                                    <tr key={s._id}>
                                                        <td className="px-5 py-3 text-sm font-mono text-white/60 border-r border-white/5">{s.usn}</td>
                                                        <td className="px-5 py-3 text-sm font-medium text-white/90">{s.studentName}</td>
                                                        <td className="px-5 py-3 text-center border-l border-white/5">
                                                            {absent
                                                                ? <span className="text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1 rounded-md">Absent</span>
                                                                : <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md">Present</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex gap-4">
                                    <button onClick={() => setTab('new')} disabled={submitting}
                                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all">← Edit</button>
                                    <button onClick={handleSubmit} disabled={submitting}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all">
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Confirm &amp; Submit
                                    </button>
                                </div>
                            </div>

                        ) : tab === 'history' ? (

                            /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ HISTORY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                            <div className="max-w-4xl mx-auto w-full space-y-4">
                                {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex gap-3 items-start"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
                                {fetchingHistory ? (
                                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                                ) : history.length === 0 ? (
                                    <div className="text-center p-14 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                        <p className="text-white/40">No sessions recorded yet.</p>
                                    </div>
                                ) : history.map((rec: any) => {
                                    const exp = expandedIds.has(rec._id);
                                    return (
                                        <div key={rec._id} className="bg-[#151824] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
                                            <button onClick={() => toggleExpand(rec._id)}
                                                className="w-full p-5 flex items-center justify-between hover:bg-white/[0.015] transition-colors text-left">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-3 flex-wrap mb-1">
                                                        <span className="font-bold text-white">
                                                            {new Date(rec.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-xs text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md font-mono">{rec.timeSlot}</span>
                                                    </div>
                                                    <p className="text-sm text-white/55 truncate">{rec.topicTaught}</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-center px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl min-w-[64px]">
                                                        <div className="text-2xl font-black text-emerald-400 leading-none">{rec.presentCount}</div>
                                                        <div className="text-[9px] text-emerald-400/50 mt-1 uppercase tracking-widest font-bold">Present</div>
                                                    </div>
                                                    <div className="text-center px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl min-w-[64px]">
                                                        <div className="text-2xl font-black text-red-400 leading-none">{rec.absentCount}</div>
                                                        <div className="text-[9px] text-red-400/50 mt-1 uppercase tracking-widest font-bold">Absent</div>
                                                    </div>
                                                    {exp ? <ChevronUp className="w-5 h-5 text-white/30 ml-1" /> : <ChevronDown className="w-5 h-5 text-white/30 ml-1" />}
                                                </div>
                                            </button>
                                            {exp && (
                                                <div className="border-t border-white/5 grid grid-cols-2 divide-x divide-white/5">
                                                    <div className="p-5">
                                                        <p className="text-[10px] uppercase tracking-widest text-emerald-400/60 font-bold mb-3">Present ({rec.presentStudents?.length ?? 0})</p>
                                                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                                                            {!rec.presentStudents?.length
                                                                ? <p className="text-white/20 text-xs italic">None</p>
                                                                : rec.presentStudents.map((s: any) => (
                                                                    <div key={s._id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/10">
                                                                        <span className="text-xs font-mono text-emerald-400/70 w-28 shrink-0">{s.usn}</span>
                                                                        <span className="text-sm text-white/80 truncate">{s.name}</span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                    <div className="p-5">
                                                        <p className="text-[10px] uppercase tracking-widest text-red-400/60 font-bold mb-3">Absent ({rec.absentStudents?.length ?? 0})</p>
                                                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                                                            {!rec.absentStudents?.length
                                                                ? <p className="text-white/20 text-xs italic">All present! ðŸŽ‰</p>
                                                                : rec.absentStudents.map((s: any) => (
                                                                    <div key={s._id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/[0.04] border border-red-500/10">
                                                                        <span className="text-xs font-mono text-red-400/70 w-28 shrink-0">{s.usn}</span>
                                                                        <span className="text-sm text-white/80 truncate">{s.name}</span>
                                                                    </div>
                                                                ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                        ) : (

                            /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ OVERALL ATTENDANCE BOOK â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
                            <div className="w-full space-y-5">
                                {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex gap-3 items-start"><AlertCircle className="w-5 h-5 shrink-0" />{error}</div>}
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-emerald-400" /> Overall Attendance Book
                                        </h2>
                                        <p className="text-sm text-white/35 mt-0.5">All sessions × all students — updates automatically as you log new sessions</p>
                                    </div>
                                    {bookData && bookData.sessions.length > 0 && (
                                        <button onClick={downloadCSV}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm font-semibold transition-all">
                                            <Download className="w-4 h-4" /> Export CSV
                                        </button>
                                    )}
                                </div>
                                {fetchingBook ? (
                                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                                ) : !bookData || bookData.sessions.length === 0 ? (
                                    <div className="text-center p-14 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                        <p className="text-white/40 font-medium">No sessions yet.</p>
                                        <p className="text-white/25 text-sm mt-1">Log your first session — this book auto-populates.</p>
                                    </div>
                                ) : (
                                    <div className="bg-[#151824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                                        <div className="overflow-auto" style={{ maxHeight: '520px' }}>
                                            <table className="text-left border-collapse"
                                                style={{ minWidth: `${260 + bookData.sessions.length * 72 + 80}px` }}>
                                                <thead className="sticky top-0 z-20 bg-[#1a1d2e]">
                                                    <tr className="border-b border-white/10">
                                                        <th className="sticky left-0 z-30 bg-[#1a1d2e] px-4 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-widest border-r border-white/10 w-[110px] min-w-[110px]">USN</th>
                                                        <th className="sticky left-[110px] z-30 bg-[#1a1d2e] px-4 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-widest border-r border-white/10 w-[150px] min-w-[150px]">Name</th>
                                                        {bookData.sessions.map((s: any, si: number) => (
                                                            <th key={si} className="px-2 py-2 text-center border-r border-white/[0.06] w-[72px] min-w-[72px]">
                                                                <div className="text-[10px] font-bold text-white/55">
                                                                    {new Date(s.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                                </div>
                                                                <div className="text-[9px] text-white/25 font-mono mt-0.5 truncate">{(s.timeSlot || '').split(' - ')[0]}</div>
                                                            </th>
                                                        ))}
                                                        <th className="px-3 py-3 text-center border-l border-white/10 w-[80px] min-w-[80px]">
                                                            <span className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest">Att %</span>
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/[0.03]">
                                                    {bookData.students.map((st: any) => {
                                                        let p = 0, a = 0;
                                                        const cells = bookData.sessions.map((sess: any) => {
                                                            if (sess.presentIds.includes(st._id)) { p++; return 'P'; }
                                                            if (sess.absentIds.includes(st._id)) { a++; return 'A'; }
                                                            return null;
                                                        });
                                                        const tot = p + a;
                                                        const pct = tot > 0 ? Math.round((p / tot) * 100) : null;
                                                        const pctColor = pct == null ? 'text-white/20' : pct >= 75 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400';
                                                        return (
                                                            <tr key={st._id} className="hover:bg-white/[0.012] transition-colors">
                                                                <td className="sticky left-0 bg-[#151824] px-4 py-2.5 text-[11px] font-mono text-white/55 border-r border-white/[0.06] w-[110px]">{st.usn}</td>
                                                                <td className="sticky left-[110px] bg-[#151824] px-4 py-2.5 text-sm font-medium text-white/80 border-r border-white/[0.06] w-[150px] truncate">{st.name}</td>
                                                                {cells.map((cell: string | null, ci: number) => (
                                                                    <td key={ci} className="text-center py-2.5 px-1 border-r border-white/[0.04] w-[72px]">
                                                                        {cell === 'P'
                                                                            ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-black">P</span>
                                                                            : cell === 'A'
                                                                                ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/20 text-red-400 text-xs font-black">A</span>
                                                                                : <span className="inline-flex items-center justify-center w-7 h-7 text-white/15 text-xs">—</span>}
                                                                    </td>
                                                                ))}
                                                                <td className={`text-center py-2.5 px-3 border-l border-white/[0.06] text-sm font-black ${pctColor}`}>
                                                                    {pct != null ? `${pct}%` : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        } />
    );
}
