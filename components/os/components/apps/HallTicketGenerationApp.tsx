"use client";
import { useState, useEffect, useCallback } from 'react';

interface SubjectEntry {
  subjectCode: string;
  subjectName: string;
  internalMarks?: number;
}

interface HallTicketRecord {
  _id: string;
  examMonth: string;
  isValid: boolean;
  generatedAt: string;
  generatedBy: string;
  subjects: SubjectEntry[];
}

interface StudentRow {
  usn: string;
  studentName: string;
  department: string;
  semester: string;
  degree: string;
  paidFees: string[];
  registeredSubjects: string[];
  hasTuition: boolean;
  hasExamination: boolean;
  eligible: boolean;
  hallTicket: HallTicketRecord | null;
}

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function HallTicketGenerationApp() {
  const [userRole, setUserRole] = useState<{ role: string; department: string } | null>(null);
  const [authError, setAuthError] = useState('');
  const [officerName, setOfficerName] = useState('');

  const [usnInput, setUsnInput] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [examMonth, setExamMonth] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Generation modal state
  const [modalStudent, setModalStudent] = useState<StudentRow | null>(null);
  const [modalSubjects, setModalSubjects] = useState<SubjectEntry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (!res.ok) { setAuthError('Please log in with a staff account.'); return; }
        const d = await res.json();
        if (d.userType === 'staff' && d.user) {
          const { role, department, fullName, username } = d.user;
          if (
            (role === 'OFFICER' || role === 'HOD' || role === 'MASTER') &&
            (department === 'FEE_SECTION' || department === 'EXAMINATION' || role === 'MASTER')
          ) {
            setUserRole({ role, department });
            setOfficerName(fullName || username || 'Officer');
          } else {
            setAuthError('Access Denied: Only Fee Section / Examination officers can access Hall Ticket Generation.');
          }
        } else {
          setAuthError('Please log in with a staff account.');
        }
      } catch {
        setAuthError('Could not verify credentials.');
      }
    })();
  }, [API_BASE]);

  // ── Fetch students ────────────────────────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    if (!userRole) return;
    if (!examMonth.trim()) { setError('Please enter an exam month/session first (e.g. MAY/JUNE 2026).'); return; }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const params = new URLSearchParams();
      if (usnInput.trim())  params.set('usn', usnInput.trim());
      if (semFilter)        params.set('sem', semFilter);
      params.set('examMonth', examMonth.trim().toUpperCase());
      const res = await fetch(`${API_BASE}/api/hall-ticket/admin?${params}`, { credentials: 'include' });
      const d = await res.json();
      if (res.ok) setStudents(d.students || []);
      else setError(d.error || 'Failed to fetch students');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [userRole, usnInput, semFilter, examMonth, API_BASE]);

  // ── Open generation modal ─────────────────────────────────────────────────
  const openModal = (student: StudentRow) => {
    setModalStudent(student);
    // Pre-populate subjects from registeredSubjects
    setModalSubjects(
      student.registeredSubjects.length > 0
        ? student.registeredSubjects.map(code => ({ subjectCode: code, subjectName: code }))
        : [{ subjectCode: '', subjectName: '' }]
    );
  };

  const addSubjectRow = () => setModalSubjects(prev => [...prev, { subjectCode: '', subjectName: '' }]);
  const removeSubjectRow = (i: number) => setModalSubjects(prev => prev.filter((_, idx) => idx !== i));
  const updateSubject = (i: number, field: keyof SubjectEntry, value: string | number) => {
    setModalSubjects(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const generateHallTicket = async () => {
    if (!modalStudent) return;
    const validSubjects = modalSubjects.filter(s => s.subjectCode.trim() && s.subjectName.trim());
    if (validSubjects.length === 0) { setError('Add at least one subject.'); return; }
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/hall-ticket/admin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usn:       modalStudent.usn,
          examMonth: examMonth.trim().toUpperCase(),
          subjects:  validSubjects,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setSuccessMsg(`Hall ticket generated for ${modalStudent.studentName} (${modalStudent.usn})`);
        setModalStudent(null);
        await fetchStudents();
      } else {
        setError(d.error || 'Failed to generate');
      }
    } catch { setError('Network error'); }
    finally { setGenerating(false); }
  };

  // ── Revoke / Re-validate ──────────────────────────────────────────────────
  const toggleValidity = async (htId: string, currentValid: boolean, usn: string) => {
    setRevoking(htId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/hall-ticket/admin`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hallTicketId: htId, isValid: !currentValid }),
      });
      const d = await res.json();
      if (res.ok) {
        setSuccessMsg(d.message);
        await fetchStudents();
      } else setError(d.error || 'Failed');
    } catch { setError('Network error'); }
    finally { setRevoking(null); }
  };

  // ── Summary counts ────────────────────────────────────────────────────────
  const eligible   = students.filter(s => s.eligible).length;
  const generated  = students.filter(s => s.hallTicket?.isValid).length;
  const ineligible = students.filter(s => !s.eligible).length;

  // ── Render guards ─────────────────────────────────────────────────────────
  if (authError) return (
    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="text-center max-w-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-white font-semibold">Access Restricted</h2>
        <p className="text-xs text-[#86868b]">{authError}</p>
      </div>
    </div>
  );

  if (!userRole) return (
    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full h-full bg-[#1e1e1e] text-white flex flex-col overflow-hidden select-none">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-[#2a2a2a] shrink-0">
        <span className="text-2xl">🎫</span>
        <div>
          <h1 className="text-sm font-semibold text-white">Hall Ticket Generation</h1>
          <p className="text-[11px] text-[#86868b]">{officerName} · {userRole.department}</p>
        </div>
        <div className="ml-auto flex gap-2">
          {[
            { label: 'Eligible', val: eligible, color: 'text-emerald-400' },
            { label: 'Generated', val: generated, color: 'text-sky-400' },
            { label: 'Ineligible', val: ineligible, color: 'text-red-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center bg-white/5 rounded-lg px-3 py-1">
              <p className={`text-lg font-bold ${color}`}>{val}</p>
              <p className="text-[10px] text-[#86868b]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-end gap-3 px-5 py-3 border-b border-white/10 shrink-0 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#86868b] uppercase tracking-wider">Exam Session *</label>
          <input
            value={examMonth}
            onChange={e => setExamMonth(e.target.value)}
            placeholder="e.g. MAY/JUNE 2026"
            className="bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 w-48 outline-none focus:border-sky-500/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#86868b] uppercase tracking-wider">USN / Name</label>
          <input
            value={usnInput}
            onChange={e => setUsnInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchStudents()}
            placeholder="2BK22CS001"
            className="bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/30 w-40 outline-none focus:border-sky-500/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-[#86868b] uppercase tracking-wider">Semester</label>
          <select
            value={semFilter}
            onChange={e => setSemFilter(e.target.value)}
            className="bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white w-28 outline-none focus:border-sky-500/50"
          >
            <option value="">All Sems</option>
            {SEMESTERS.map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
          </select>
        </div>
        <button
          onClick={fetchStudents}
          disabled={loading}
          className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {loading ? 'Loading…' : 'Search'}
        </button>
      </div>

      {/* ── Messages ── */}
      {error && (
        <div className="mx-5 mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="mx-5 mt-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300">
          ✓ {successMsg}
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {students.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-48 text-[#86868b] space-y-2">
            <span className="text-4xl">🎫</span>
            <p className="text-sm">Enter an exam session and click Search</p>
          </div>
        )}
        {students.length > 0 && (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-[#86868b] border-b border-white/10">
                <th className="text-left py-2 px-2 font-medium">USN</th>
                <th className="text-left py-2 px-2 font-medium">Name</th>
                <th className="text-center py-2 px-2 font-medium">Sem</th>
                <th className="text-center py-2 px-2 font-medium">Tuition</th>
                <th className="text-center py-2 px-2 font-medium">Exam Fee</th>
                <th className="text-center py-2 px-2 font-medium">Status</th>
                <th className="text-center py-2 px-2 font-medium">Hall Ticket</th>
                <th className="text-center py-2 px-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.usn} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="py-2 px-2 font-mono text-sky-300">{s.usn}</td>
                  <td className="py-2 px-2 text-white">{s.studentName}</td>
                  <td className="py-2 px-2 text-center text-[#86868b]">{s.semester}</td>
                  <td className="py-2 px-2 text-center">
                    {s.hasTuition
                      ? <span className="text-emerald-400">✓ Paid</span>
                      : <span className="text-red-400">✗ Pending</span>}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {s.hasExamination
                      ? <span className="text-emerald-400">✓ Paid</span>
                      : <span className="text-red-400">✗ Pending</span>}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {s.eligible
                      ? <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5">Eligible</span>
                      : <span className="bg-red-500/10 text-red-300 border border-red-500/30 rounded-full px-2 py-0.5">Ineligible</span>}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {s.hallTicket ? (
                      s.hallTicket.isValid
                        ? <span className="bg-sky-500/10 text-sky-300 border border-sky-500/30 rounded-full px-2 py-0.5">Generated</span>
                        : <span className="bg-orange-500/10 text-orange-300 border border-orange-500/30 rounded-full px-2 py-0.5">Revoked</span>
                    ) : (
                      <span className="text-[#86868b]">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {s.eligible && (
                        <button
                          onClick={() => openModal(s)}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded px-2 py-0.5 transition-colors"
                        >
                          {s.hallTicket ? 'Regenerate' : 'Generate'}
                        </button>
                      )}
                      {s.hallTicket && (
                        <button
                          onClick={() => toggleValidity(s.hallTicket!._id, s.hallTicket!.isValid, s.usn)}
                          disabled={revoking === s.hallTicket._id}
                          className={`border rounded px-2 py-0.5 transition-colors text-[11px] disabled:opacity-50 ${
                            s.hallTicket.isValid
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border-sky-500/30'
                          }`}
                        >
                          {revoking === s.hallTicket._id ? '…' : s.hallTicket.isValid ? 'Revoke' : 'Re-validate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Generation Modal ── */}
      {modalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl w-full max-w-lg p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Generate Hall Ticket</h2>
                <p className="text-[11px] text-[#86868b] mt-0.5">
                  {modalStudent.studentName} · {modalStudent.usn} · Sem {modalStudent.semester}
                </p>
              </div>
              <button onClick={() => setModalStudent(null)} className="text-[#86868b] hover:text-white text-lg">✕</button>
            </div>

            {/* Fee verification badges */}
            <div className="flex gap-2 mb-4">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs text-emerald-300">
                ✓ Tuition Fee Paid
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs text-emerald-300">
                ✓ Examination Fee Paid
              </div>
            </div>

            {/* Exam month (read-only, inherited) */}
            <div className="mb-4">
              <label className="text-[10px] text-[#86868b] uppercase tracking-wider">Exam Session</label>
              <div className="mt-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-white/70">{examMonth.toUpperCase()}</div>
            </div>

            {/* Subject list */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-[#86868b] uppercase tracking-wider">Subjects</label>
                <button onClick={addSubjectRow} className="text-sky-400 text-[11px] hover:text-sky-300">+ Add Row</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {modalSubjects.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      value={s.subjectCode}
                      onChange={e => updateSubject(i, 'subjectCode', e.target.value)}
                      placeholder="Code (e.g. 22CS41)"
                      className="bg-[#1e1e1e] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-28 outline-none focus:border-sky-500/50 shrink-0"
                    />
                    <input
                      value={s.subjectName}
                      onChange={e => updateSubject(i, 'subjectName', e.target.value)}
                      placeholder="Subject Name"
                      className="bg-[#1e1e1e] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white flex-1 outline-none focus:border-sky-500/50"
                    />
                    <input
                      value={s.internalMarks ?? ''}
                      onChange={e => updateSubject(i, 'internalMarks', Number(e.target.value))}
                      placeholder="IA"
                      type="number"
                      min={0}
                      max={50}
                      className="bg-[#1e1e1e] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white w-14 outline-none focus:border-sky-500/50 shrink-0"
                    />
                    <button
                      onClick={() => removeSubjectRow(i)}
                      className="text-red-400/60 hover:text-red-400 text-sm shrink-0"
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-300 mb-3">{error}</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setModalStudent(null); setError(''); }}
                className="px-4 py-2 text-sm text-[#86868b] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generateHallTicket}
                disabled={generating}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors"
              >
                {generating ? 'Generating…' : 'Generate Hall Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
