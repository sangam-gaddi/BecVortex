"use client";
import { useState, useEffect, useCallback, useRef } from 'react';

interface SubjectEntry {
  subjectCode: string;
  subjectName: string;
  internalMarks?: number;
}

interface HallTicketData {
  _id: string;
  usn: string;
  studentName: string;
  department: string;
  semester: string;
  degree: string;
  examMonth: string;
  subjects: SubjectEntry[];
  generatedAt: string;
  isValid: boolean;
}

interface StudentInfo {
  usn: string;
  studentName: string;
  department: string;
  semester: string;
  degree?: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function semLabel(sem: string) {
  const n = Number(sem);
  const suffixes = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  return suffixes[n] ? `${suffixes[n]} Semester` : `${sem}th Semester`;
}

// ── Printable Hall Ticket ──────────────────────────────────────────────────
function PrintableHallTicket({ ht, student }: { ht: HallTicketData; student: StudentInfo | null }) {
  return (
    <div
      id={`hall-ticket-${ht._id}`}
      className="bg-white text-black w-[700px] mx-auto p-8 border-2 border-gray-800 rounded font-sans text-sm"
      style={{ fontFamily: 'serif' }}
    >
      {/* College header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
        <p className="text-xs font-bold tracking-widest uppercase text-gray-600">Government of Karnataka</p>
        <h1 className="text-xl font-bold uppercase tracking-wide mt-1">BEC College of Engineering</h1>
        <p className="text-xs text-gray-600 mt-0.5">Autonomous Institution | Affiliated to VTU</p>
        <h2 className="text-base font-bold uppercase mt-3 tracking-widest border border-gray-800 inline-block px-6 py-1">
          Hall Ticket
        </h2>
        <p className="text-xs mt-1 font-semibold">{ht.examMonth} Examinations</p>
      </div>

      {/* Student details */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-5 text-[13px]">
        {[
          { label: 'USN', value: ht.usn },
          { label: 'Student Name', value: ht.studentName },
          { label: 'Department', value: ht.department },
          { label: 'Degree', value: ht.degree || 'B.E.' },
          { label: 'Semester', value: semLabel(ht.semester) },
          { label: 'Date of Issue', value: fmtDate(ht.generatedAt) },
        ].map(({ label, value }) => (
          <div key={label} className="flex gap-1">
            <span className="font-semibold w-32 shrink-0">{label}:</span>
            <span>{value}</span>
          </div>
        ))}
      </div>

      {/* Subjects table */}
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-600 px-3 py-2 text-left font-semibold w-10">Sl.</th>
            <th className="border border-gray-600 px-3 py-2 text-left font-semibold w-28">Subject Code</th>
            <th className="border border-gray-600 px-3 py-2 text-left font-semibold">Subject Name</th>
            <th className="border border-gray-600 px-3 py-2 text-center font-semibold w-20">IA Marks</th>
          </tr>
        </thead>
        <tbody>
          {ht.subjects.map((sub, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="border border-gray-600 px-3 py-1.5 text-center">{i + 1}</td>
              <td className="border border-gray-600 px-3 py-1.5 font-mono">{sub.subjectCode}</td>
              <td className="border border-gray-600 px-3 py-1.5">{sub.subjectName}</td>
              <td className="border border-gray-600 px-3 py-1.5 text-center">{sub.internalMarks ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer / Instructions */}
      <div className="mt-6 text-xs text-gray-600 space-y-1 border-t border-gray-300 pt-3">
        <p className="font-semibold text-black">Instructions to candidates:</p>
        <ol className="list-decimal ml-4 space-y-0.5">
          <li>Carry this Hall Ticket to every examination session.</li>
          <li>Arrive at the examination hall at least 15 minutes before the scheduled time.</li>
          <li>Mobile phones and electronic devices are strictly prohibited.</li>
          <li>This hall ticket is issued after verification of fee payment (Tuition & Examination).</li>
        </ol>
      </div>

      {/* Signature line */}
      <div className="flex justify-between items-end mt-8 text-xs">
        <div className="text-center">
          <div className="border-t border-black w-36 mb-1" />
          <p>Student Signature</p>
        </div>
        <div className="text-center">
          <div className="border-t border-black w-36 mb-1" />
          <p>Controller of Examinations</p>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-4">
        Ticket ID: {ht._id} | Generated: {fmtDate(ht.generatedAt)}
      </p>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────
export function HallTicketApp() {
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [hallTickets, setHallTickets] = useState<HallTicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeTicket, setActiveTicket] = useState<HallTicketData | null>(null);
  const [printing, setPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, htRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/hall-ticket/my`, { credentials: 'include' }),
      ]);

      if (!meRes.ok) { setAuthError('Please log in to view your hall tickets.'); return; }
      const meData = await meRes.json();
      if (meData.userType !== 'student') { setAuthError('Student account required.'); return; }

      setStudent({
        usn:         meData.user?.usn || meData.usn || '',
        studentName: meData.user?.studentName || meData.user?.name || '',
        department:  meData.user?.department || '',
        semester:    meData.user?.semester || '',
        degree:      meData.user?.degree || 'B.E.',
      });

      if (htRes.ok) {
        const d = await htRes.json();
        setHallTickets(d.hallTickets || []);
      } else {
        const d = await htRes.json();
        setError(d.error || 'Could not load hall tickets.');
      }
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, [API_BASE]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Print / Download using browser print dialog ────────────────────────
  const handlePrint = (ht: HallTicketData) => {
    setActiveTicket(ht);
    // Small delay to allow render before printing
    setTimeout(() => {
      setPrinting(true);
      window.print();
      setPrinting(false);
    }, 200);
  };

  // ── Render guards ─────────────────────────────────────────────────────
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

  if (loading) return (
    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      {/* Print-only overlay — hidden in normal view */}
      {activeTicket && (
        <div className="hidden print:block">
          <PrintableHallTicket ht={activeTicket} student={student} />
        </div>
      )}

      <div className="print:hidden w-full h-full bg-[#1e1e1e] text-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-[#2a2a2a] shrink-0">
          <span className="text-2xl">🎫</span>
          <div>
            <h1 className="text-sm font-semibold text-white">Hall Ticket</h1>
            <p className="text-[11px] text-[#86868b]">
              {student?.studentName} · {student?.usn}
            </p>
          </div>
          <button
            onClick={loadData}
            className="ml-auto text-[11px] text-[#86868b] hover:text-white transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
              {error}
            </div>
          )}

          {hallTickets.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-[#86868b] space-y-3">
              <span className="text-5xl">🎫</span>
              <p className="text-sm font-medium">No Hall Tickets Available</p>
              <p className="text-xs text-center max-w-xs">
                Your hall ticket will appear here once the Fee Section officer generates it after verifying your Tuition and Examination fee payments.
              </p>
            </div>
          )}

          {hallTickets.length > 0 && (
            <div className="space-y-4">
              {hallTickets.map(ht => (
                <div
                  key={ht._id}
                  className="bg-[#2a2a2a] border border-white/10 rounded-2xl overflow-hidden"
                >
                  {/* Ticket header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-xl">
                      🎫
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{ht.examMonth} Examinations</p>
                      <p className="text-[11px] text-[#86868b]">
                        {semLabel(ht.semester)} · {ht.department} · Generated {fmtDate(ht.generatedAt)}
                      </p>
                    </div>
                    <span className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-full px-2 py-0.5 text-[10px]">
                      Valid
                    </span>
                  </div>

                  {/* Subject list */}
                  <div className="px-4 py-3">
                    <p className="text-[10px] text-[#86868b] uppercase tracking-wider mb-2">Subjects</p>
                    <div className="space-y-1.5">
                      {ht.subjects.map((sub, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <span className="font-mono text-sky-300 w-20 shrink-0">{sub.subjectCode}</span>
                          <span className="text-white/80 flex-1">{sub.subjectName}</span>
                          {sub.internalMarks !== undefined && (
                            <span className="text-[#86868b] shrink-0">IA: {sub.internalMarks}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fee verification badges */}
                  <div className="flex gap-2 px-4 pb-3">
                    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1 text-[10px] text-emerald-300">
                      ✓ Tuition Fee
                    </div>
                    <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1 text-[10px] text-emerald-300">
                      ✓ Examination Fee
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 px-4 py-3 border-t border-white/10 bg-white/[0.02]">
                    <button
                      onClick={() => setActiveTicket(activeTicket?._id === ht._id ? null : ht)}
                      className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-medium py-2 rounded-xl transition-colors"
                    >
                      {activeTicket?._id === ht._id ? 'Hide Preview' : 'Preview'}
                    </button>
                    <button
                      onClick={() => handlePrint(ht)}
                      disabled={printing}
                      className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-xl transition-colors"
                    >
                      🖨️ Print / Download
                    </button>
                  </div>

                  {/* Inline preview */}
                  {activeTicket?._id === ht._id && (
                    <div className="border-t border-white/10 overflow-x-auto p-4 bg-white rounded-b-2xl">
                      <PrintableHallTicket ht={ht} student={student} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
