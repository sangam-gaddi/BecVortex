"use client";
import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface StudentInfo {
  usn: string; studentName: string; department: string; semester: string;
  degree: string; stdType: string; casteCat: string; email?: string;
  paidFees: string[]; paymentCategory: string; phone?: string;
  permanentAddress?: string; entryType?: string; currentSemester?: number;
  backlogs?: string[]; registeredSubjects?: string[];
  isCR?: boolean; admissionID?: string; csn?: string; idNo?: string;
}

interface GradeRecord {
  _id: string; subjectCode: string; subjectName: string;
  semester: number; credits?: number;
  cie1?: { rawMarks: number; convertedMarks: number; questionMarks?: Record<string, number> };
  cie2?: { rawMarks: number; convertedMarks: number; questionMarks?: Record<string, number> };
  assignment?: { rawMarks: number; convertedMarks: number };
  see?: { rawMarks: number; convertedMarks: number };
  totalMarks: number; gradePoint: number; letterGrade: string;
}

const GRADE_CLR: Record<string, string> = {
  O: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'A+': 'text-green-400 bg-green-500/10 border-green-500/30',
  A: 'text-lime-400 bg-lime-500/10 border-lime-500/30',
  'B+': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  B: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  C: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  P: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  F: 'text-red-400 bg-red-500/10 border-red-500/30',
};
function GradeBadge({ grade }: { grade: string }) {
  const c = GRADE_CLR[grade] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${c}`}>{grade}</span>;
}
function CIECard({ label, data, max }: { label: string; data?: { rawMarks: number; convertedMarks: number; questionMarks?: Record<string, number> }; max: number }) {
  const [exp, setExp] = useState(false);
  const pct = data ? (data.convertedMarks / max) * 100 : 0;
  const bar = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#3d3d3d]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-[#86868b] uppercase tracking-wider">{label}</span>
        {data?.questionMarks && Object.keys(data.questionMarks).length > 0 && (
          <button onClick={() => setExp(v => !v)} className="text-[10px] text-[#0071e3] hover:underline">{exp ? 'less' : 'questions'}</button>
        )}
      </div>
      {data ? (
        <>
          <div className="flex items-end gap-1.5 mb-2">
            <span className="text-2xl font-bold text-white">{data.convertedMarks}</span>
            <span className="text-xs text-[#86868b] mb-0.5">/ {max}</span>
            <span className="ml-auto text-xs text-[#86868b]">Raw: {data.rawMarks}</span>
          </div>
          <div className="h-1.5 bg-[#3d3d3d] rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          {exp && data.questionMarks && (
            <div className="mt-2 grid grid-cols-2 gap-1">
              {Object.entries(data.questionMarks).map(([q, m]) => (
                <div key={q} className="flex justify-between bg-[#1e1e1e] rounded px-2 py-0.5 text-[10px]">
                  <span className="text-[#86868b]">Q{q}</span><span className="text-white font-medium">{m}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : <p className="text-xs text-[#86868b] italic mt-1">Not uploaded yet</p>}
    </div>
  );
}

export function BECPortal() {
  const [view, setView] = useState<'login' | 'signup' | 'dashboard'>('login');
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'academics' | 'subjects'>('profile');
  const [expandedSubj, setExpandedSubj] = useState<string | null>(null);

  // Login state
  const [loginUsn, setLoginUsn] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  // Signup state
  const [signupUsn, setSignupUsn] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [usnVerified, setUsnVerified] = useState(false);
  const [studentPreview, setStudentPreview] = useState<{ studentName: string; department: string } | null>(null);

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  const loadGrades = useCallback(async () => {
    setGradesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/grades/my`, { credentials: 'include' });
      if (res.ok) { const d = await res.json(); setGrades(d.grades || []); setLastRefresh(new Date()); }
    } catch { } finally { setGradesLoading(false); }
  }, [API_BASE]);

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => {
    if (view !== 'dashboard') return;
    const id = setInterval(loadGrades, 60_000);
    return () => clearInterval(id);
  }, [view, loadGrades]);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      if (res.ok) { const d = await res.json(); setStudent(d.student); setView('dashboard'); loadGrades(); }
    } catch { } finally { setIsLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn: loginUsn.toUpperCase(), password: loginPassword }),
      });
      const d = await res.json();
      if (res.ok) { setStudent(d.student); setView('dashboard'); loadGrades(); }
      else setLoginError(d.error || 'Login failed');
    } catch { setLoginError('Connection error'); }
  };

  const verifyUsn = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/verify-usn`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn: signupUsn.toUpperCase() }),
      });
      const d = await res.json();
      if (res.ok && d.student) { setUsnVerified(true); setStudentPreview({ studentName: d.student.studentName, department: d.student.department }); setSignupError(''); }
      else setSignupError(d.error || 'USN not found in database');
    } catch { setSignupError('Verification failed'); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setSignupError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usn: signupUsn.toUpperCase(), email: signupEmail, password: signupPassword }),
      });
      const d = await res.json();
      if (res.ok) { setStudent(d.student); setView('dashboard'); loadGrades(); }
      else setSignupError(d.error || 'Signup failed');
    } catch { setSignupError('Connection error'); }
  };

  const handleLogout = async () => {
    try { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { }
    setStudent(null); setGrades([]); setView('login');
  };

  // Derived
  const semGroups = grades.reduce<Record<number, GradeRecord[]>>((acc, g) => {
    if (!acc[g.semester]) acc[g.semester] = []; acc[g.semester].push(g); return acc;
  }, {});
  const semList = Object.keys(semGroups).map(Number).sort((a, b) => a - b);
  const curSem = student?.currentSemester || Number(student?.semester) || 0;
  const curGrades = semGroups[curSem] || [];
  const cgpa = (() => {
    const g = grades.filter(x => x.gradePoint > 0 && x.credits);
    if (!g.length) return null;
    const w = g.reduce((s, x) => s + x.gradePoint * (x.credits || 3), 0);
    const c = g.reduce((s, x) => s + (x.credits || 3), 0);
    return (w / c).toFixed(2);
  })();

  if (isLoading) return (
    <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
      <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Login ───────────────────────────────────────────────────────────────────
  if (view === 'login') return (
    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="w-80 space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0071e3] to-[#5856d6] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-xl font-bold text-white">BEC Portal</h1>
          <p className="text-xs text-[#86868b] mt-1">Sign in with your USN</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="text" placeholder="USN (e.g., 2BK22CS001)" value={loginUsn} onChange={e => setLoginUsn(e.target.value)}
            className="w-full bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
          <input type="password" placeholder="Password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
            className="w-full bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
          {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
          <button type="submit" className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium py-2.5 rounded-lg text-sm transition-colors">Sign In</button>
        </form>
        <p className="text-center text-xs text-[#86868b]">New student?{' '}
          <button onClick={() => setView('signup')} className="text-[#0071e3] hover:underline">Create account</button>
        </p>
      </div>
    </div>
  );

  // ── Signup ──────────────────────────────────────────────────────────────────
  if (view === 'signup') return (
    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="w-80 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white">Create Account</h1>
          <p className="text-xs text-[#86868b] mt-1">Verify your USN to register</p>
        </div>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="text" placeholder="Enter USN" value={signupUsn}
              onChange={e => { setSignupUsn(e.target.value); setUsnVerified(false); }}
              className="flex-1 bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
            <button onClick={verifyUsn} className="px-3 py-2.5 bg-[#3d3d3d] text-white rounded-lg text-xs hover:bg-[#4d4d4d] transition-colors">Verify</button>
          </div>
          {usnVerified && studentPreview && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-400 text-xs font-medium">✓ USN Verified</p>
              <p className="text-white text-sm mt-1">{studentPreview.studentName}</p>
              <p className="text-[#86868b] text-xs">{studentPreview.department}</p>
            </div>
          )}
          {usnVerified && (
            <form onSubmit={handleSignup} className="space-y-3">
              <input type="email" placeholder="Email" value={signupEmail} onChange={e => setSignupEmail(e.target.value)}
                className="w-full bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
              <input type="password" placeholder="Create Password" value={signupPassword} onChange={e => setSignupPassword(e.target.value)}
                className="w-full bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
              <button type="submit" className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium py-2.5 rounded-lg text-sm transition-colors">Create Account</button>
            </form>
          )}
          {signupError && <p className="text-red-400 text-xs">{signupError}</p>}
        </div>
        <p className="text-center text-xs text-[#86868b]">Already registered?{' '}
          <button onClick={() => setView('login')} className="text-[#0071e3] hover:underline">Sign in</button>
        </p>
      </div>
    </div>
  );

  // ── Dashboard ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full bg-[#1e1e1e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {student?.studentName?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white">{student?.studentName}</h1>
                {student?.isCR && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30 font-medium">CR</span>}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] text-[#86868b]">{student?.usn}</span>
                <span className="text-[#5e5e5e]">·</span>
                <span className="text-[11px] text-[#86868b]">{student?.department}</span>
                <span className="text-[#5e5e5e]">·</span>
                <span className="text-[11px] text-[#86868b]">Sem {student?.semester}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cgpa && <div className="text-right mr-1"><p className="text-[10px] text-[#86868b]">CGPA</p><p className="text-base font-bold text-emerald-400">{cgpa}</p></div>}
            <button onClick={handleLogout} className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors">Logout</button>
          </div>
        </div>
        {/* Tabs */}
        <div className="mt-2.5 flex gap-1">
          {(['profile', 'academics', 'subjects'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === tab ? 'bg-[#0071e3] text-white' : 'text-[#86868b] hover:bg-[#3d3d3d]'}`}>
              {tab === 'profile' ? '👤 Profile' : tab === 'academics' ? '📊 Marks' : '📚 Subjects'}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto min-h-0 px-5 py-4 space-y-4">

        {/* Profile Tab */}
        {activeTab === 'profile' && <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🎓', label: 'Degree', value: student?.degree || 'B.E.' },
              { icon: '📋', label: 'Student Type', value: student?.stdType || 'Regular' },
              { icon: '💳', label: 'Payment Category', value: student?.paymentCategory || 'KCET' },
              { icon: '📄', label: 'Caste Category', value: student?.casteCat || 'General' },
              { icon: '🏛️', label: 'Entry Type', value: student?.entryType || '—' },
              { icon: '📅', label: 'Current Semester', value: `Semester ${student?.currentSemester || student?.semester}` },
            ].map((item, i) => (
              <div key={i} className="bg-[#2d2d2d] rounded-xl p-3 border border-[#3d3d3d] flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div><p className="text-[11px] text-[#86868b]">{item.label}</p><p className="text-sm font-medium text-white">{item.value}</p></div>
              </div>
            ))}
          </div>
          <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
            <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/40">
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Identification</h2>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-[#3d3d3d]">
              {[['USN', student?.usn], ['Admission ID', student?.admissionID || '—'], ['College Serial No', student?.csn || '—'], ['ID No', student?.idNo || '—']].map(([label, val], i) => (
                <div key={i} className="px-4 py-2.5"><p className="text-[11px] text-[#86868b]">{label}</p><p className="text-sm font-mono text-white">{val}</p></div>
              ))}
            </div>
          </div>
          {(student?.email || student?.phone || student?.permanentAddress) && (
            <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] p-4 space-y-2">
              {student?.email && <div className="flex gap-2"><span className="text-[#86868b] text-xs w-16">Email</span><span className="text-sm text-white">{student.email}</span></div>}
              {student?.phone && <div className="flex gap-2"><span className="text-[#86868b] text-xs w-16">Phone</span><span className="text-sm text-white">{student.phone}</span></div>}
              {student?.permanentAddress && <div className="flex gap-2"><span className="text-[#86868b] text-xs w-16">Address</span><span className="text-sm text-white">{student.permanentAddress}</span></div>}
            </div>
          )}
          {student?.backlogs && student.backlogs.length > 0 && (
            <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-4">
              <h2 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Backlogs ({student.backlogs.length})</h2>
              <div className="flex flex-wrap gap-1.5">
                {student.backlogs.map(b => <span key={b} className="text-xs px-2 py-0.5 bg-red-500/10 text-red-300 border border-red-500/20 rounded">{b}</span>)}
              </div>
            </div>
          )}
        </>}

        {/* Academics / Marks Tab */}
        {activeTab === 'academics' && <>
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#86868b]">{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Fetching marks...'}</p>
            <button onClick={loadGrades} disabled={gradesLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d2d2d] border border-[#3d3d3d] rounded-lg text-xs text-white hover:bg-[#3d3d3d] transition-colors disabled:opacity-50">
              <span className={`text-base leading-none ${gradesLoading ? 'animate-spin' : ''}`}>↻</span>Refresh
            </button>
          </div>
          {gradesLoading && grades.length === 0 ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" /></div>
          ) : grades.length === 0 ? (
            <div className="text-center py-12"><span className="text-4xl block mb-3">📊</span><p className="text-white font-medium">No marks available yet</p><p className="text-[#86868b] text-xs mt-1">Faculty will upload marks after evaluations.</p></div>
          ) : <>
            {/* Current Semester detailed CIE cards */}
            {curGrades.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-3">Semester {curSem} — Internal Assessment (Real-time)</h3>
                <div className="space-y-4">
                  {curGrades.map(g => (
                    <div key={g._id} className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#3d3d3d]">
                        <div><p className="text-sm font-semibold text-white">{g.subjectName}</p><p className="text-[11px] text-[#86868b] font-mono mt-0.5">{g.subjectCode}</p></div>
                        <div className="flex items-center gap-2">
                          {g.credits && <span className="text-[10px] text-[#86868b]">{g.credits} cr</span>}
                          {g.letterGrade && <GradeBadge grade={g.letterGrade} />}
                          <span className="text-xs font-bold text-white">{g.totalMarks}<span className="text-[#86868b]">/100</span></span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-3">
                        <CIECard label="CIE 1" data={g.cie1} max={20} />
                        <CIECard label="CIE 2" data={g.cie2} max={20} />
                      </div>
                      {(g.assignment || g.see) && (
                        <div className="grid grid-cols-2 gap-3 px-3 pb-3">
                          {g.assignment && <CIECard label="Assignment" data={g.assignment} max={10} />}
                          {g.see && <CIECard label="SEE (Final)" data={g.see} max={50} />}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Previous semester summary tables */}
            {semList.filter(s => s !== curSem).map(sem => (
              <div key={sem}>
                <h3 className="text-xs font-semibold text-[#86868b] uppercase tracking-wider mb-2">Semester {sem} — Result Summary</h3>
                <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-[#3d3d3d] bg-[#3d3d3d]/40">
                      <th className="text-left px-4 py-2 text-[11px] text-[#86868b] font-semibold uppercase">Subject</th>
                      <th className="text-center px-2 py-2 text-[11px] text-[#86868b] font-semibold uppercase">C1</th>
                      <th className="text-center px-2 py-2 text-[11px] text-[#86868b] font-semibold uppercase">C2</th>
                      <th className="text-center px-2 py-2 text-[11px] text-[#86868b] font-semibold uppercase">Total</th>
                      <th className="text-center px-2 py-2 text-[11px] text-[#86868b] font-semibold uppercase">Grade</th>
                    </tr></thead>
                    <tbody className="divide-y divide-[#3d3d3d]">
                      {semGroups[sem].map(g => (
                        <tr key={g._id} className="hover:bg-[#3d3d3d]/30">
                          <td className="px-4 py-2.5"><p className="text-xs font-medium text-white">{g.subjectName}</p><p className="text-[10px] text-[#86868b] font-mono">{g.subjectCode}</p></td>
                          <td className="text-center px-2 py-2.5 text-xs text-white">{g.cie1?.convertedMarks ?? '—'}</td>
                          <td className="text-center px-2 py-2.5 text-xs text-white">{g.cie2?.convertedMarks ?? '—'}</td>
                          <td className="text-center px-2 py-2.5 text-xs font-bold text-white">{g.totalMarks}</td>
                          <td className="text-center px-2 py-2.5">{g.letterGrade ? <GradeBadge grade={g.letterGrade} /> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>}
        </>}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && <>
          <p className="text-xs text-[#86868b]">Registered subjects — current semester</p>
          {student?.registeredSubjects && student.registeredSubjects.length > 0 ? (
            <div className="space-y-2">
              {student.registeredSubjects.map((code, i) => {
                const g = grades.find(x => x.subjectCode === code);
                return (
                  <div key={code} onClick={() => setExpandedSubj(expandedSubj === code ? null : code)}
                    className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] p-3 cursor-pointer hover:border-[#0071e3]/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0071e3]/10 border border-[#0071e3]/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#0071e3]">{i + 1}</span>
                        </div>
                        <div><p className="text-sm font-medium text-white">{g?.subjectName || code}</p><p className="text-[11px] text-[#86868b] font-mono">{code}</p></div>
                      </div>
                      {g && <GradeBadge grade={g.letterGrade} />}
                    </div>
                    {expandedSubj === code && g && (
                      <div className="mt-3 grid grid-cols-4 gap-2 border-t border-[#3d3d3d] pt-3">
                        {[['CIE 1', g.cie1?.convertedMarks, 20], ['CIE 2', g.cie2?.convertedMarks, 20], ['Assgn', g.assignment?.convertedMarks, 10], ['SEE', g.see?.convertedMarks, 50]].map(([label, val, max]: any) => (
                          <div key={label} className="text-center bg-[#1e1e1e] rounded-lg p-2">
                            <p className="text-[10px] text-[#86868b]">{label}</p>
                            <p className="text-sm font-bold text-white">{val != null ? val : '—'}<span className="text-[10px] text-[#86868b]">/{max}</span></p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12"><span className="text-4xl block mb-3">📚</span><p className="text-white font-medium">No subjects registered</p><p className="text-[#86868b] text-xs mt-1">Use Course Registration to enroll in subjects.</p></div>
          )}
        </>}
      </div>
    </div>
  );
}
