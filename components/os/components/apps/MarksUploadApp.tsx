"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AppTemplate } from './AppTemplate';
import { getMyFacultyProfile } from '@/lib/actions/faculty.actions';
import { getStudentsForSubjectGrade, bulkSaveMarks } from '@/lib/actions/grade.actions';
import {
    FileSpreadsheet, Loader2, Save, Calculator,
    ChevronRight, CheckCircle2, Download, BarChart2, TrendingUp, Award, Table2,
    Sparkles, Camera, Upload, X, ScanLine, AlertCircle, Cpu, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Constants ────────────────────────────────────────────────────────────────

const EXAM_TYPES = [
    { id: 'cie1',       label: 'CIE 1',               maxRaw: 40,  maxConv: 20 },
    { id: 'cie2',       label: 'CIE 2',               maxRaw: 40,  maxConv: 20 },
    { id: 'assignment', label: 'Assignment',           maxRaw: 20,  maxConv: 10 },
    { id: 'see',        label: 'Semester End Exam',    maxRaw: 100, maxConv: 50 },
];

const AI_MODELS = [
    { id: 'qwen3-vl:8b',                                    label: 'Qwen3-VL 8B',             tag: 'Local · Fast',        isLocal: true  },
    { id: 'qwen3-vl:235b-cloud',                             label: 'Qwen3-VL 235B',           tag: 'Local · Accurate',    isLocal: true  },
    { id: 'nvidia/nemotron-nano-12b-v2-vl:free',             label: 'Nemotron Nano 12B VL',    tag: 'OpenRouter · Free',   isLocal: false },
    { id: 'qwen/qwen3-vl-30b-a3b-thinking',                  label: 'Qwen3-VL 30B Thinking',  tag: 'OpenRouter · Fast',   isLocal: false },
    { id: 'qwen/qwen3-vl-235b-a22b-thinking',                label: 'Qwen3-VL 235B Thinking', tag: 'OpenRouter · Best',   isLocal: false },
    { id: 'mistralai/mistral-small-3.1-24b-instruct:free',   label: 'Mistral Small 3.1 24B',  tag: 'OpenRouter · Free',   isLocal: false },
    { id: 'google/gemma-3-27b-it:free',                      label: 'Gemma 3 27B',             tag: 'OpenRouter · Free',   isLocal: false },
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

// ── Pure helpers ─────────────────────────────────────────────────────────────

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

function calcConverted(raw: number, maxRaw: number): number {
    return Math.ceil(Math.min(Math.max(0, raw), maxRaw) / 2);
}

function previewTotal(student: any, examId: string, rawVal: number, maxRaw: number) {
    const conv = calcConverted(rawVal, maxRaw);
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

// ── AI Scan Modal ────────────────────────────────────────────────────────────

interface AIScanResult {
    usn: string;
    subjectCode: string;
    rawTotalMarks: number;
    convertedMarks: number;
}

interface AIScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Parent validates subject ownership and auto-switches if needed */
    onApply: (result: AIScanResult) => void;
    currentSubjectCode: string;
}

function AIScanModal({ isOpen, onClose, onApply, currentSubjectCode }: AIScanModalProps) {
    const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
    const [imagePreview, setImagePreview]   = useState<string | null>(null);
    const [imageBase64, setImageBase64]     = useState<string | null>(null);
    const [imageMime, setImageMime]         = useState('image/jpeg');
    const [scanning, setScanning]           = useState(false);
    const [scanResult, setScanResult]       = useState<AIScanResult | null>(null);
    const [scanError, setScanError]         = useState<string | null>(null);
    const [cameraActive, setCameraActive]   = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef     = useRef<HTMLVideoElement>(null);
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const streamRef    = useRef<MediaStream | null>(null);

    const stopCamera = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
        }
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraActive(false);
    }, []);

    // Attach the media stream after the video element is mounted.
    useEffect(() => {
        if (!cameraActive || !videoRef.current || !streamRef.current) return;

        const video = videoRef.current;
        video.srcObject = streamRef.current;

        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                // Autoplay may fail on some browsers until a user gesture.
                toast.error('Camera started, but preview playback was blocked. Tap Open Camera again.');
            });
        }
    }, [cameraActive]);

    const resetModal = useCallback(() => {
        stopCamera();
        setImagePreview(null); setImageBase64(null);
        setScanResult(null); setScanError(null); setScanning(false);
    }, [stopCamera]);

    const handleClose = useCallback(() => { resetModal(); onClose(); }, [resetModal, onClose]);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            stopCamera();
            streamRef.current = stream;
            setCameraActive(true);
        } catch {
            toast.error('Camera access denied or unavailable.');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const v = videoRef.current;
        const c = canvasRef.current;
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d')?.drawImage(v, 0, 0);
        const dataUrl = c.toDataURL('image/jpeg', 0.95);
        setImagePreview(dataUrl);
        setImageBase64(dataUrl.split(',')[1]);
        setImageMime('image/jpeg');
        stopCamera(); setScanResult(null); setScanError(null);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            const dataUrl = ev.target?.result as string;
            setImagePreview(dataUrl);
            setImageBase64(dataUrl.split(',')[1]);
            setImageMime(file.type || 'image/jpeg');
            setScanResult(null); setScanError(null);
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const handleScan = async () => {
        if (!imageBase64) return;
        setScanning(true); setScanError(null); setScanResult(null);
        try {
            const res = await fetch('/api/vision/extract-marks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64, mimeType: imageMime, model: selectedModel }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Scan failed');
            setScanResult(data as AIScanResult);
        } catch (err: any) {
            setScanError(err.message || 'Scan failed. Try again or use a different model.');
        } finally {
            setScanning(false);
        }
    };

    const subjectMatch = scanResult
        ? scanResult.subjectCode.toUpperCase() === currentSubjectCode.toUpperCase()
        : null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="bg-[#0f111a] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-md max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white">AI Marks Scanner</h2>
                            <p className="text-[10px] text-white/30">CIE-1 Answer Sheet · Vision OCR</p>
                        </div>
                    </div>
                    <button onClick={handleClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Model selector */}
                    <div>
                        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Vision Model</p>
                        <div className="space-y-1.5">
                            {AI_MODELS.map(m => (
                                <button key={m.id} onClick={() => setSelectedModel(m.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${selectedModel === m.id ? 'bg-indigo-500/15 border-indigo-500/40 text-white' : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.04] hover:text-white/70'}`}>
                                    <div className="flex items-center gap-2">
                                        <Cpu className={`w-3.5 h-3.5 ${m.isLocal ? 'text-emerald-400' : 'text-purple-400'}`} />
                                        <span className="font-medium text-xs">{m.label}</span>
                                    </div>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${m.isLocal ? 'bg-emerald-500/15 text-emerald-400' : 'bg-purple-500/15 text-purple-400'}`}>{m.tag}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image input */}
                    <div>
                        <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Answer Sheet Image</p>

                        {!imagePreview && !cameraActive && (
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={startCamera}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/50 hover:text-white/80 transition-all">
                                    <Camera className="w-6 h-6" />
                                    <span className="text-xs font-medium">Open Camera</span>
                                </button>
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] text-white/50 hover:text-white/80 transition-all">
                                    <Upload className="w-6 h-6" />
                                    <span className="text-xs font-medium">Upload Image</span>
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                            </div>
                        )}

                        {/* Live camera */}
                        {cameraActive && (
                            <div className="relative rounded-xl overflow-hidden border border-white/10">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
                                <canvas ref={canvasRef} className="hidden" />
                                <div className="absolute inset-x-0 top-2 text-center text-[10px] text-white/40 pointer-events-none">
                                    Align the front page of the answer booklet
                                </div>
                                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2.5">
                                    <button onClick={capturePhoto}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg">
                                        <ScanLine className="w-4 h-4" /> Capture
                                    </button>
                                    <button onClick={stopCamera}
                                        className="px-4 py-2 bg-black/60 hover:bg-black/80 text-white/70 rounded-xl text-sm">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Image preview */}
                        {imagePreview && !cameraActive && (
                            <div className="relative rounded-xl overflow-hidden border border-white/10">
                                <img src={imagePreview} alt="Sheet preview"
                                    className="w-full max-h-52 object-contain bg-black/50" />
                                <button onClick={() => { setImagePreview(null); setImageBase64(null); setScanResult(null); setScanError(null); }}
                                    className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-black rounded-full flex items-center justify-center text-white/60 hover:text-white border border-white/10 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {scanError && (
                        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{scanError}</span>
                        </div>
                    )}

                    {/* Scan result */}
                    {scanResult && (
                        <div className="p-4 bg-[#151824] border border-white/8 rounded-xl space-y-2.5">
                            <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Extraction Result</p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/40">USN</span>
                                    <span className="font-mono text-sm font-bold text-white/90">{scanResult.usn}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/40">Subject Code</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-sm font-bold text-white/90">{scanResult.subjectCode}</span>
                                        {subjectMatch === true  && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                        {subjectMatch === false && (
                                            <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
                                                <AlertCircle className="w-3 h-3" /> differs — will auto-switch
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="flex flex-col items-center p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/15">
                                        <span className="text-[9px] text-white/35 uppercase tracking-wider mb-1">Raw Marks</span>
                                        <span className="font-mono font-black text-blue-300 text-lg leading-none">{scanResult.rawTotalMarks}</span>
                                        <span className="text-[9px] text-white/25 mt-0.5">/ 40</span>
                                    </div>
                                    <div className="flex flex-col items-center p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/15">
                                        <span className="text-[9px] text-white/35 uppercase tracking-wider mb-1">Converted</span>
                                        <span className="font-mono font-black text-emerald-300 text-lg leading-none">{scanResult.convertedMarks}</span>
                                        <span className="text-[9px] text-white/25 mt-0.5">/ 20</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2.5">
                        {imageBase64 && !scanning && !scanResult && (
                            <button onClick={handleScan}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all">
                                <ScanLine className="w-4 h-4" /> Scan Sheet
                            </button>
                        )}
                        {scanning && (
                            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600/50 text-white/70 rounded-xl text-sm cursor-not-allowed">
                                <Loader2 className="w-4 h-4 animate-spin" /> Scanning…
                            </div>
                        )}
                        {scanResult && (
                            <>
                                <button onClick={() => { setScanResult(null); setImagePreview(null); setImageBase64(null); setScanError(null); }}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-xl text-sm font-medium transition-all">
                                    <RefreshCw className="w-3.5 h-3.5" /> Rescan
                                </button>
                                <button onClick={() => onApply(scanResult)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {subjectMatch === false ? 'Apply & Switch' : 'Apply to Sheet'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MarksUploadApp() {
    const [faculty, setFaculty]             = useState<any>(null);
    const [classes, setClasses]             = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [selectedExam, setSelectedExam]   = useState<any>(null);
    const [students, setStudents]           = useState<any[]>([]);
    const [marksForm, setMarksForm]         = useState<Record<string, number>>({});
    const [aiFilledRows, setAiFilledRows]   = useState<Set<string>>(new Set());
    const [pendingAIResult, setPendingAIResult] = useState<AIScanResult | null>(null);
    const [innerTab, setInnerTab]           = useState<'entry' | 'summary'>('entry');
    const [aiScanOpen, setAiScanOpen]       = useState(false);

    const [loading, setLoading]                     = useState(true);
    const [fetchingStudents, setFetchingStudents]   = useState(false);
    const [saving, setSaving]                       = useState(false);
    const [error, setError]                         = useState<string | null>(null);
    const [successMsg, setSuccessMsg]               = useState<string | null>(null);

    const isSEE  = selectedExam?.id === 'see';
    const isCIE1 = selectedExam?.id === 'cie1';

    // ── Load profile ──────────────────────────────────────────────────────────
    useEffect(() => { loadProfile(); }, []);

    // ── Auto-refresh marks every 30s when a class and exam is selected ────────
    useEffect(() => {
        if (!selectedClass || !selectedExam) return;
        const id = setInterval(() => {
            fetchStudentsAndGrades(selectedClass.subjectCode, selectedClass.semester, selectedExam.id);
        }, 30_000);
        return () => clearInterval(id);
    }, [selectedClass?.subjectCode, selectedExam?.id]);

    const loadProfile = async () => {
        setLoading(true);
        const res = await getMyFacultyProfile();
        if (res.success) { setFaculty(res.faculty); setClasses(res.assignedClasses || []); }
        else setError(res.error || 'Failed to load profile.');
        setLoading(false);
    };

    // ── Apply pending AI result once students load ────────────────────────────
    useEffect(() => {
        if (!pendingAIResult || fetchingStudents || students.length === 0) return;
        const student = students.find(s => s.usn?.toUpperCase() === pendingAIResult.usn.toUpperCase());
        if (student) {
            const rawClamped = Math.min(Math.max(0, pendingAIResult.rawTotalMarks), 40);
            setMarksForm(prev => ({ ...prev, [student._id]: rawClamped }));
            setAiFilledRows(prev => new Set(prev).add(student._id));
            toast.success(`AI filled: ${student.usn} → ${rawClamped}/40`);
        } else {
            toast.error(`USN "${pendingAIResult.usn}" not found in this subject's student list.`);
        }
        setPendingAIResult(null);
    }, [students, fetchingStudents, pendingAIResult]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSelectClass = (cls: any) => {
        setSelectedClass(cls); setSelectedExam(null); setStudents([]);
        setMarksForm({}); setAiFilledRows(new Set()); setSuccessMsg(null); setInnerTab('entry');
    };

    const handleSelectExam = (exam: any) => {
        setSelectedExam(exam); setSuccessMsg(null); setAiFilledRows(new Set());
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
        // Typing clears the AI highlight for that row
        setAiFilledRows(prev => { const n = new Set(prev); n.delete(studentId); return n; });
        setMarksForm(prev => {
            const next = { ...prev };
            if (isNaN(num)) delete next[studentId]; else next[studentId] = num;
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
            setAiFilledRows(new Set());
            fetchStudentsAndGrades(selectedClass.subjectCode, selectedClass.semester, selectedExam.id);
        } else setError(res.error || 'Failed to save marks.');
        setSaving(false);
    };

    const handleAIApply = useCallback((result: AIScanResult) => {
        const matchingClass = classes.find(
            c => c.subjectCode?.toUpperCase() === result.subjectCode?.toUpperCase()
        );
        if (!matchingClass) {
            toast.error(`"${result.subjectCode}" is not in your assigned subjects.`);
            return;
        }

        setAiScanOpen(false);

        if (matchingClass !== selectedClass) {
            // Auto-switch: select the matching class + CIE 1, then wait for students
            const cie1 = EXAM_TYPES.find(e => e.id === 'cie1')!;
            toast(`Switching to ${result.subjectCode} · CIE 1`, { icon: '🔄' });
            setSelectedClass(matchingClass);
            setSelectedExam(cie1);
            setStudents([]); setMarksForm({}); setAiFilledRows(new Set());
            setSuccessMsg(null); setInnerTab('entry');
            setPendingAIResult(result);
            fetchStudentsAndGrades(matchingClass.subjectCode, matchingClass.semester, 'cie1');
        } else {
            // Same class already — apply directly
            const student = students.find(s => s.usn?.toUpperCase() === result.usn?.toUpperCase());
            if (!student) {
                toast.error(`USN "${result.usn}" not found in this subject's student list.`);
                return;
            }
            const maxRaw = selectedExam?.maxRaw || 40;
            const rawClamped = Math.min(Math.max(0, result.rawTotalMarks), maxRaw);
            setMarksForm(prev => ({ ...prev, [student._id]: rawClamped }));
            setAiFilledRows(prev => new Set(prev).add(student._id));
            toast.success(`AI filled: ${student.usn} → ${rawClamped}/${maxRaw}`);
        }
    }, [classes, selectedClass, selectedExam, students]);

    // ── Statistics ────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        if (!selectedExam || students.length === 0) return null;
        const raws = students.map(s => {
            const v = marksForm[s._id];
            return typeof v === 'number' ? v : (s.grade?.[selectedExam.id]?.rawMarks ?? null);
        });
        const defined = raws.filter((m): m is number => m !== null);
        if (defined.length === 0) return null;
        const convs = defined.map(m => calcConverted(m, selectedExam.maxRaw));
        const avg = convs.reduce((a, b) => a + b, 0) / convs.length;
        const passMark = Math.ceil(selectedExam.maxConv * 0.4);
        return {
            avg: avg.toFixed(1), min: Math.min(...convs), max: Math.max(...convs),
            passing: convs.filter(m => m >= passMark).length,
            failing: convs.filter(m => m < passMark && m > 0).length,
            notEntered: students.length - defined.length, total: students.length,
        };
    }, [students, marksForm, selectedExam]);

    // Grade distribution — only computed for SEE
    const gradeDist = useMemo(() => {
        if (!isSEE || !selectedExam || students.length === 0) return null;
        const dist: Record<string, number> = {};
        GRADE_ORDER.forEach(g => { dist[g] = 0; }); dist['-'] = 0;
        students.forEach(student => {
            const raw = typeof marksForm[student._id] === 'number' ? marksForm[student._id] : 0;
            const { total } = previewTotal(student, selectedExam.id, raw, selectedExam.maxRaw);
            dist[gradeLabel(total)]++;
        });
        return dist;
    }, [students, marksForm, selectedExam, isSEE]);

    // ── CSV export ────────────────────────────────────────────────────────────
    const exportCSV = () => {
        if (!selectedClass || !selectedExam || students.length === 0) return;
        const headers = isSEE
            ? ['#', 'USN', 'Name', `Raw (/${selectedExam.maxRaw})`, `Converted (/${selectedExam.maxConv})`, 'Total (/100)', 'Grade']
            : ['#', 'USN', 'Name', `Raw (/${selectedExam.maxRaw})`, `Converted (/${selectedExam.maxConv})`];
        const rows = students.map((s, i) => {
            const raw = typeof marksForm[s._id] === 'number' ? marksForm[s._id] : 0;
            const { conv, total } = previewTotal(s, selectedExam.id, raw, selectedExam.maxRaw);
            return isSEE ? [i + 1, s.usn, s.name, raw, conv, total, gradeLabel(total)]
                         : [i + 1, s.usn, s.name, raw, conv];
        });
        const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `Marks_${selectedClass.subjectCode}_${selectedExam.label.replace(/ /g, '_')}_Sem${selectedClass.semester}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (loading) return (
        <AppTemplate hasSidebar={false} content={
            <div className="h-full flex items-center justify-center bg-[#0f111a]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        } />
    );

    return (
        <>
            {/* AI scan modal rendered outside AppTemplate to avoid z-index clipping */}
            {aiScanOpen && selectedClass && selectedExam && (
                <AIScanModal
                    isOpen={aiScanOpen}
                    onClose={() => setAiScanOpen(false)}
                    onApply={handleAIApply}
                    currentSubjectCode={selectedClass.subjectCode}
                />
            )}

            <AppTemplate hasSidebar={false} content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white overflow-hidden">

                    {/* ─── Header ─────────────────────────────────────────────── */}
                    <div className="bg-indigo-900/20 border-b border-indigo-500/15 px-5 py-3.5 shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/25 flex items-center justify-center shrink-0">
                                <FileSpreadsheet className="w-4.5 h-4.5 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-sm font-bold flex items-center gap-2">
                                    Marks Evaluator
                                    <span className="text-[10px] font-normal text-blue-400/70 bg-blue-500/15 px-2 py-0.5 rounded-full border border-blue-500/20">
                                        BEC Reg. 2024
                                    </span>
                                </h1>
                                <p className="text-[11px] text-blue-300/45 mt-0.5 font-mono flex items-center gap-1">
                                    {selectedClass ? (
                                        <>
                                            {selectedClass.subjectCode} · Sem {selectedClass.semester}
                                            {selectedExam && <><ChevronRight className="w-3 h-3" /><span className="text-white/65">{selectedExam.label}</span></>}
                                        </>
                                    ) : 'Select a subject to begin'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Refresh button — always visible when a class is selected */}
                            {selectedClass && selectedExam && (
                                <button
                                    onClick={() => fetchStudentsAndGrades(selectedClass.subjectCode, selectedClass.semester, selectedExam.id)}
                                    disabled={fetchingStudents}
                                    title="Refresh student marks"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/55 rounded-xl text-xs font-semibold transition-all disabled:opacity-40">
                                    <RefreshCw className={`w-3.5 h-3.5 ${fetchingStudents ? 'animate-spin' : ''}`} /> Refresh
                                </button>
                            )}
                            {selectedClass && selectedExam && (
                                <>
                                    {/* AI scan button — only for CIE 1 */}
                                    {isCIE1 && students.length > 0 && (
                                        <button onClick={() => setAiScanOpen(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold transition-all">
                                            <Sparkles className="w-3.5 h-3.5" /> Scan CIE-1 Sheet
                                        </button>
                                    )}
                                    <button onClick={exportCSV}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/55 rounded-xl text-xs font-semibold transition-all">
                                        <Download className="w-3.5 h-3.5" /> Export CSV
                                    </button>
                                    <button onClick={handleSave} disabled={saving || fetchingStudents}
                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all">
                                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                        Save &amp; Convert
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">

                        {/* ─── Left Sidebar ────────────────────────────────────── */}
                        <div className="w-52 border-r border-white/5 bg-[#0c0d14] flex flex-col shrink-0 overflow-y-auto">
                            <div className="px-4 py-3 text-[9px] font-black text-white/22 tracking-[0.15em] uppercase border-b border-white/5">
                                Subject
                            </div>
                            <div className="p-2 space-y-0.5">
                                {classes.length === 0
                                    ? <p className="text-xs text-white/20 px-3 py-3">No classes assigned</p>
                                    : classes.map((cls, idx) => (
                                        <button key={idx} onClick={() => handleSelectClass(cls)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${selectedClass === cls ? 'bg-blue-500/20 text-blue-300' : 'text-white/55 hover:bg-white/[0.04] hover:text-white/80'}`}>
                                            <div className="font-medium text-xs truncate">{cls.subjectDetails?.title || cls.subjectCode}</div>
                                            <div className="text-[10px] opacity-45 mt-0.5 font-mono">{cls.subjectCode} · Sem {cls.semester}</div>
                                        </button>
                                    ))
                                }
                            </div>

                            {selectedClass && (
                                <>
                                    <div className="px-4 py-3 text-[9px] font-black text-white/22 tracking-[0.15em] uppercase border-y border-white/5">
                                        Exam Type
                                    </div>
                                    <div className="p-2 space-y-0.5">
                                        {EXAM_TYPES.map(exam => (
                                            <button key={exam.id} onClick={() => handleSelectExam(exam)}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${selectedExam?.id === exam.id ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/55 hover:bg-white/[0.04] hover:text-white/80'}`}>
                                                <span>{exam.label}</span>
                                                <span className="text-[9px] bg-black/30 px-1.5 py-0.5 rounded font-mono text-white/30">/{exam.maxRaw}</span>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ─── Main Content ────────────────────────────────────── */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {!selectedClass || !selectedExam ? (
                                <div className="h-full flex flex-col items-center justify-center p-10">
                                    <Calculator className="w-14 h-14 mb-4 text-white/10" />
                                    <h2 className="text-base font-semibold text-white/20 mb-1">Grade Evaluator</h2>
                                    <p className="text-xs text-white/25 text-center max-w-xs">
                                        Select a subject and exam type from the sidebar to begin entering marks.
                                    </p>
                                </div>
                            ) : fetchingStudents ? (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col overflow-hidden">

                                    {/* Stats bar */}
                                    {stats && (
                                        <div className="shrink-0 px-5 pt-4 pb-0">
                                            <div className="grid grid-cols-5 gap-2.5">
                                                {[
                                                    { val: stats.avg,     label: 'Avg Conv.', color: 'text-blue-400'    },
                                                    { val: stats.max,     label: 'Highest',   color: 'text-emerald-400' },
                                                    { val: stats.min,     label: 'Lowest',    color: 'text-red-400'     },
                                                    { val: stats.passing, label: 'Passing',   color: 'text-emerald-400' },
                                                    { val: stats.failing, label: 'Failing',   color: 'text-red-400'     },
                                                ].map(({ val, label, color }) => (
                                                    <div key={label} className="bg-[#151824] border border-white/5 rounded-xl p-3 text-center">
                                                        <div className={`text-xl font-black ${color}`}>{val}</div>
                                                        <div className="text-[9px] text-white/22 mt-0.5 uppercase tracking-widest font-bold">{label}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Grade distribution — SEE only */}
                                            {isSEE && gradeDist && (
                                                <div className="bg-[#151824] border border-white/5 rounded-xl p-3.5 mt-2.5">
                                                    <div className="flex items-center gap-1.5 mb-3 text-[9px] text-white/22 uppercase tracking-widest font-bold">
                                                        <BarChart2 className="w-3 h-3" /> SEE Grade Distribution
                                                    </div>
                                                    <div className="flex items-end gap-3 flex-wrap">
                                                        {GRADE_ORDER.filter(g => (gradeDist[g] || 0) > 0).map(g => {
                                                            const cnt = gradeDist[g] || 0;
                                                            const pct = Math.round((cnt / stats.total) * 100);
                                                            return (
                                                                <div key={g} className="flex flex-col items-center gap-1">
                                                                    <span className="text-[10px] font-black text-white/45">{cnt}</span>
                                                                    <div className="w-9 flex flex-col justify-end bg-white/5 rounded overflow-hidden" style={{ height: '36px' }}>
                                                                        <div className={`w-full transition-all ${g === 'F' ? 'bg-red-500/70' : g === 'P' ? 'bg-orange-500/70' : g === 'O' ? 'bg-yellow-500/70' : 'bg-blue-500/70'}`}
                                                                            style={{ height: `${Math.max(5, pct / 100 * 36)}px` }} />
                                                                    </div>
                                                                    <span className={`text-[10px] font-black rounded px-1 py-0.5 ${GRADE_COLOR[g] || 'text-white/20'}`}>{g}</span>
                                                                </div>
                                                            );
                                                        })}
                                                        {stats.notEntered > 0 && (
                                                            <span className="ml-auto text-[10px] text-white/18 italic self-end pb-0.5">{stats.notEntered} without marks</span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tabs — always visible */}
                                    <div className="shrink-0 px-5 pt-3 pb-0">
                                        <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1 w-fit">
                                            <button onClick={() => setInnerTab('entry')}
                                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${innerTab === 'entry' ? 'bg-blue-500/20 text-blue-400' : 'text-white/30 hover:text-white/60'}`}>
                                                <FileSpreadsheet className="w-3 h-3" /> Grade Entry
                                            </button>
                                            <button onClick={() => setInnerTab('summary')}
                                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${innerTab === 'summary' ? 'bg-blue-500/20 text-blue-400' : 'text-white/30 hover:text-white/60'}`}>
                                                <Table2 className="w-3 h-3" /> All Grades Summary
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scrollable table area */}
                                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                        {error && (
                                            <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm">{error}</div>
                                        )}
                                        {successMsg && (
                                            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 shrink-0" />{successMsg}
                                            </div>
                                        )}
                                        {aiFilledRows.size > 0 && (
                                            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/25 rounded-xl text-indigo-300 text-xs flex items-center gap-2">
                                                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                                <span>
                                                    <strong>{aiFilledRows.size}</strong> row{aiFilledRows.size > 1 ? 's' : ''} filled by AI (highlighted).
                                                    Review then click <strong>Save &amp; Convert</strong>.
                                                </span>
                                            </div>
                                        )}

                                        {innerTab === 'entry' ? (
                                            /* ── Grade Entry Table ── */
                                            <div className="bg-[#151824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-white/[0.025] border-b border-white/5 text-[10px] text-white/30 uppercase tracking-widest">
                                                            <th className="px-4 py-4 font-semibold w-10 text-center border-r border-white/5">#</th>
                                                            <th className="px-4 py-4 font-semibold w-32">USN</th>
                                                            <th className="px-4 py-4 font-semibold border-r border-white/5">Student Name</th>
                                                            <th className="px-6 py-4 font-semibold text-center bg-blue-500/[0.03] w-44">
                                                                Raw Marks
                                                                <span className="block font-normal text-blue-400/40 text-[9px] normal-case tracking-normal mt-0.5">out of {selectedExam.maxRaw}</span>
                                                            </th>
                                                            <th className="px-4 py-4 font-semibold text-center text-emerald-400/40 w-28">
                                                                Converted
                                                                <span className="block font-normal text-[9px] normal-case tracking-normal mt-0.5">/{selectedExam.maxConv}</span>
                                                            </th>
                                                            {/* Running total — shown for CIE/Assignment as a preview, not graded */}
                                                            {!isSEE && (
                                                                <th className="px-4 py-4 font-semibold text-center text-white/18 border-l border-white/5 w-32">
                                                                    Running Total
                                                                    <span className="block font-normal text-[9px] normal-case tracking-normal mt-0.5 italic">/100 preview</span>
                                                                </th>
                                                            )}
                                                            {/* Full Total + Grade — SEE ONLY */}
                                                            {isSEE && (
                                                                <>
                                                                    <th className="px-4 py-4 font-semibold text-center text-indigo-400/40 border-l border-white/5 w-28">
                                                                        Final Total
                                                                        <span className="block font-normal text-[9px] normal-case tracking-normal mt-0.5">/100</span>
                                                                    </th>
                                                                    <th className="px-4 py-4 font-semibold text-center text-yellow-400/40 w-24">
                                                                        <Award className="w-3 h-3 inline-block mb-0.5" /> Grade
                                                                    </th>
                                                                </>
                                                            )}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/[0.035]">
                                                        {students.map((student, idx) => {
                                                            const rawVal    = marksForm[student._id]; // number | undefined
                                                            const inputDisp = rawVal !== undefined ? rawVal : '';
                                                            const mathRaw   = rawVal ?? 0;
                                                            const { conv, total } = previewTotal(student, selectedExam.id, mathRaw, selectedExam.maxRaw);
                                                            const lg        = isSEE ? gradeLabel(total) : '-';
                                                            const isAI      = aiFilledRows.has(student._id);
                                                            const inputPct  = rawVal !== undefined ? rawVal / selectedExam.maxRaw : -1;
                                                            const borderCol = rawVal === undefined
                                                                ? 'border-white/10'
                                                                : inputPct >= 0.75 ? 'border-emerald-500/50'
                                                                    : inputPct >= 0.4  ? 'border-blue-500/40'
                                                                    : 'border-red-500/40';
                                                            const barColor  = total >= 75 ? 'bg-emerald-500' : total >= 50 ? 'bg-blue-500' : 'bg-orange-500';

                                                            return (
                                                                <tr key={student._id}
                                                                    className={`transition-colors ${isAI ? 'bg-emerald-500/[0.05] ring-1 ring-inset ring-emerald-500/20' : 'hover:bg-white/[0.01]'}`}>
                                                                    <td className="px-4 py-4 text-center text-white/18 text-xs border-r border-white/5 font-mono">{idx + 1}</td>
                                                                    <td className="px-4 py-4">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-sm font-mono text-white/60">{student.usn}</span>
                                                                            {isAI && <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-4 text-sm font-medium text-white/85 border-r border-white/5">{student.name}</td>

                                                                    {/* Raw marks input — wider field */}
                                                                    <td className="px-6 py-3 text-center bg-blue-500/[0.015]">
                                                                        <input
                                                                            type="number" min="0" max={selectedExam.maxRaw}
                                                                            value={inputDisp}
                                                                            onChange={e => handleMarkChange(student._id, e.target.value)}
                                                                            className={`w-32 bg-black/40 border ${borderCol} ${isAI ? 'border-emerald-500/50 bg-emerald-500/10' : ''} rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 outline-none px-3 py-2 text-center font-mono text-sm font-bold transition-all placeholder:text-white/15`}
                                                                            placeholder="—"
                                                                        />
                                                                    </td>

                                                                    {/* Converted (auto) */}
                                                                    <td className="px-4 py-4 text-center">
                                                                        <span className={`font-mono text-sm font-bold ${rawVal !== undefined ? 'text-emerald-400' : 'text-white/18'}`}>
                                                                            {rawVal !== undefined ? conv : '—'}
                                                                        </span>
                                                                    </td>

                                                                    {/* Running total preview (CIE/Assignment tabs) — no grade badge */}
                                                                    {!isSEE && (
                                                                        <td className="px-4 py-4 text-center border-l border-white/5">
                                                                            {total > 0 ? (
                                                                                <div className="flex flex-col items-center gap-1.5">
                                                                                    <span className="font-mono text-white/45 font-bold text-sm">{total}</span>
                                                                                    <div className="w-14 h-1 bg-white/10 rounded-full overflow-hidden">
                                                                                        <div className={`h-full ${barColor} transition-all`} style={{ width: `${total}%` }} />
                                                                                    </div>
                                                                                </div>
                                                                            ) : <span className="text-white/15 font-mono text-sm">—</span>}
                                                                        </td>
                                                                    )}

                                                                    {/* Final total + grade badge (SEE tab only) */}
                                                                    {isSEE && (
                                                                        <>
                                                                            <td className="px-4 py-4 text-center border-l border-white/5">
                                                                                <div className="flex flex-col items-center gap-1.5">
                                                                                    <span className="font-mono text-indigo-300 font-black text-base">{total > 0 ? total : '—'}</span>
                                                                                    {total > 0 && (
                                                                                        <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                                            <div className={`h-full ${barColor} transition-all`} style={{ width: `${total}%` }} />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-4 text-center">
                                                                                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-black ${GRADE_COLOR[lg] || 'text-white/15'}`}>
                                                                                    {total > 0 ? lg : '—'}
                                                                                </span>
                                                                            </td>
                                                                        </>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                        {students.length === 0 && (
                                                            <tr>
                                                                <td colSpan={isSEE ? 7 : 6} className="px-6 py-14 text-center text-white/25 text-sm">
                                                                    No students found for this subject.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            /* ── All Grades Summary ── */
                                            <div className="bg-[#151824] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                                                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 text-sm font-bold text-white/45">
                                                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                                                    Complete Grade Ledger — All Exam Components
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse min-w-[780px]">
                                                        <thead>
                                                            <tr className="bg-white/[0.025] border-b border-white/5 text-[9px] text-white/28 uppercase tracking-widest">
                                                                <th className="px-5 py-4 font-bold w-10 text-center border-r border-white/5">#</th>
                                                                <th className="px-5 py-4 font-bold w-28">USN</th>
                                                                <th className="px-5 py-4 font-bold border-r border-white/5">Name</th>
                                                                <th className="px-5 py-4 font-bold text-center text-blue-400/45 w-24">CIE 1<br /><span className="normal-case tracking-normal font-normal text-[8px] text-white/15">(/20)</span></th>
                                                                <th className="px-5 py-4 font-bold text-center text-purple-400/45 w-24">CIE 2<br /><span className="normal-case tracking-normal font-normal text-[8px] text-white/15">(/20)</span></th>
                                                                <th className="px-5 py-4 font-bold text-center text-teal-400/45 w-24">Asgn.<br /><span className="normal-case tracking-normal font-normal text-[8px] text-white/15">(/10)</span></th>
                                                                <th className="px-5 py-4 font-bold text-center text-orange-400/45 w-24">SEE<br /><span className="normal-case tracking-normal font-normal text-[8px] text-white/15">(/50)</span></th>
                                                                <th className="px-5 py-4 font-bold text-center border-l border-white/5 w-24">Total<br /><span className="normal-case tracking-normal font-normal text-[8px] text-white/15">(/100)</span></th>
                                                                <th className="px-5 py-4 font-bold text-center w-20">Grade</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/[0.035]">
                                                            {students.map((student, idx) => {
                                                                const g = student.grade || {};
                                                                const c1 = g.cie1?.convertedMarks || 0;
                                                                const c2 = g.cie2?.convertedMarks || 0;
                                                                const as = g.assignment?.convertedMarks || 0;
                                                                const se = g.see?.convertedMarks || 0;
                                                                const total = Math.min(c1 + c2 + as + se, 100);
                                                                const lg = gradeLabel(total);
                                                                const cell = (v: number, max: number) => v > 0
                                                                    ? <span className={`font-mono font-bold ${v / max >= 0.75 ? 'text-emerald-400' : v / max >= 0.4 ? 'text-blue-300' : 'text-red-400'}`}>{v}</span>
                                                                    : <span className="text-white/15 font-mono">—</span>;
                                                                return (
                                                                    <tr key={student._id} className="hover:bg-white/[0.01] transition-colors">
                                                                        <td className="px-5 py-3.5 text-center text-white/18 text-xs border-r border-white/5 font-mono">{idx + 1}</td>
                                                                        <td className="px-5 py-3.5 text-sm font-mono text-white/55">{student.usn}</td>
                                                                        <td className="px-5 py-3.5 text-sm font-medium text-white/80 border-r border-white/5">{student.name}</td>
                                                                        <td className="px-5 py-3.5 text-center text-sm">{cell(c1, 20)}</td>
                                                                        <td className="px-5 py-3.5 text-center text-sm">{cell(c2, 20)}</td>
                                                                        <td className="px-5 py-3.5 text-center text-sm">{cell(as, 10)}</td>
                                                                        <td className="px-5 py-3.5 text-center text-sm">{cell(se, 50)}</td>
                                                                        <td className="px-5 py-3.5 text-center border-l border-white/5">
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <span className="font-mono font-black text-indigo-300 text-sm">{total > 0 ? total : '—'}</span>
                                                                                {total > 0 && (
                                                                                    <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                                                                                        <div className={`h-full transition-all ${total >= 75 ? 'bg-emerald-500' : total >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                                                                            style={{ width: `${total}%` }} />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-3.5 text-center">
                                                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-black ${GRADE_COLOR[lg] || 'text-white/15'}`}>
                                                                                {total > 0 ? lg : '—'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            {students.length === 0 && (
                                                                <tr><td colSpan={9} className="px-6 py-12 text-center text-white/25 text-sm">No students found.</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        <div className="text-center text-[10px] text-white/18 flex justify-center items-center gap-1.5">
                                            <CheckCircle2 className="w-3 h-3" /> Per VTU/BEC Regulations 2024
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            } />
        </>
    );
}