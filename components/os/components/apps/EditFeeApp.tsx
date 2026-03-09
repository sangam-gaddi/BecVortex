"use client";
import { useState, useEffect, useCallback } from 'react';

interface StudentRecord {
  _id: string; usn: string; studentName: string;
  department: string; semester: string; paidFees: string[];
  customFees: Array<{ feeId: string; name: string; category: string; amount: number; isPaid: boolean; description?: string }>;
  payments: Array<{ _id: string; paymentMethod: string; amount: number; createdAt: string; status: string }>;
}

const CUSTOM_CATEGORIES = [
  { id: 'penalty',     label: 'Penalty',     icon: '⚠️' },
  { id: 'lab',         label: 'Lab Fee',      icon: '🧪' },
  { id: 'examination', label: 'Exam Fee',     icon: '📝' },
  { id: 'library',     label: 'Library Fine', icon: '📚' },
  { id: 'hostel',      label: 'Hostel Fee',   icon: '🏠' },
  { id: 'transport',   label: 'Transport',    icon: '🚌' },
  { id: 'custom',      label: 'Custom',       icon: '✏️' },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString('en-IN')}`; }

export function EditFeeApp() {
  const [usnInput, setUsnInput] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selected, setSelected] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [authError, setAuthError] = useState('');
  const [userInfo, setUserInfo] = useState<{ role: string; department: string; username: string } | null>(null);

  // New fee form
  const [newFeeCategory, setNewFeeCategory] = useState('custom');
  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [newFeeDueDate, setNewFeeDueDate] = useState('');
  const [newFeeDesc, setNewFeeDesc] = useState('');

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          if (d.userType === 'staff' && d.user) {
            const { role, department, username } = d.user;
            if ((role === 'OFFICER' || role === 'HOD' || role === 'MASTER') &&
              (department === 'FEE_SECTION' || department === 'EXAMINATION' || role === 'MASTER')) {
              setUserInfo({ role, department, username });
            } else setAuthError('Access denied: Fee Section / Examination officers only.');
          } else setAuthError('Please log in with a staff account.');
        } else setAuthError('Not authenticated.');
      } catch { setAuthError('Could not verify credentials.'); }
    })();
  }, []);

  const fetchStudents = useCallback(async (silent = false) => {
    if (!userInfo) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (usnInput.trim()) params.set('usn', usnInput.trim());
      if (semFilter) params.set('sem', semFilter);
      const res = await fetch(`${API_BASE}/api/payments/admin/students?${params}`, { credentials: 'include' });
      const d = await res.json();
      if (res.ok) {
        setStudents(d.students || []); setLastRefresh(new Date());
        // Keep selected in sync
        if (selected) {
          const updated = d.students.find((s: StudentRecord) => s._id === selected._id);
          if (updated) setSelected(updated);
        }
      } else setError(d.error || 'Failed');
    } catch { setError('Network error'); }
    finally { if (!silent) setLoading(false); else setRefreshing(false); }
  }, [userInfo, usnInput, semFilter, selected, API_BASE]);

  // Auto-fetch when semester filter changes
  useEffect(() => {
    if (userInfo && semFilter) fetchStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semFilter, userInfo]);

  const addFee = async () => {
    if (!selected || !newFeeName.trim() || !newFeeAmount) return;
    const amount = parseFloat(newFeeAmount);
    if (isNaN(amount) || amount <= 0) { setError('Enter a valid positive amount'); return; }
    setSaving(true); setError(''); setSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/payments/admin/custom-fees`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUsn: selected.usn, category: newFeeCategory,
          name: newFeeName.trim(), amount,
          dueDate: newFeeDueDate || undefined,
          description: newFeeDesc.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setSuccessMsg(`Fee "${newFeeName}" added for ${selected.usn}`);
        setNewFeeName(''); setNewFeeAmount(''); setNewFeeDueDate(''); setNewFeeDesc('');
        await fetchStudents(true);
      } else setError(d.error || 'Failed to add fee');
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const togglePaid = async (cf: StudentRecord['customFees'][0]) => {
    if (!selected) return;
    try {
      const res = await fetch(`${API_BASE}/api/payments/admin/custom-fees`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId: cf.feeId, isPaid: !cf.isPaid }),
      });
      if (res.ok) { setSuccessMsg(`${cf.name} marked as ${!cf.isPaid ? 'paid' : 'unpaid'}`); await fetchStudents(true); }
    } catch { setError('Failed to update'); }
  };

  const removeFee = async (feeId: string) => {
    if (!confirm('Remove this fee?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/payments/admin/custom-fees?feeId=${feeId}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { setSuccessMsg('Fee removed'); await fetchStudents(true); }
    } catch { setError('Failed to remove'); }
  };

  if (authError) return (
    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="text-center max-w-xs space-y-3 p-6">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto"><span className="text-3xl">🔒</span></div>
        <h2 className="text-white font-semibold">Access Restricted</h2>
        <p className="text-xs text-[#86868b]">{authError}</p>
      </div>
    </div>
  );
  if (!userInfo) return <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]"><div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="w-full h-full bg-[#1e1e1e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center"><span className="text-lg">✏️</span></div>
            <div>
              <h1 className="text-sm font-bold text-white">Edit Fee</h1>
              <p className="text-[11px] text-[#86868b]">{userInfo.department} · {userInfo.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && <span className="text-[10px] text-[#86868b]">↺ {lastRefresh.toLocaleTimeString()}</span>}
            <button onClick={() => fetchStudents(true)} disabled={refreshing}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3d3d3d] text-white rounded-lg text-xs hover:bg-[#4d4d4d] disabled:opacity-50">
              <span className={`text-base leading-none ${refreshing ? 'animate-spin' : ''}`}>↻</span>
            </button>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <input type="text" placeholder="Search by USN…" value={usnInput} onChange={e => setUsnInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchStudents()}
            className="flex-1 bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:border-violet-500/50 focus:outline-none" />
          <select value={semFilter} onChange={e => setSemFilter(e.target.value)}
            className="bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:outline-none">
            <option value="">All Sem</option>
            {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
          </select>
          <button onClick={() => fetchStudents()} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">Search</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Student list */}
        <div className="w-56 border-r border-[#3d3d3d] overflow-y-auto shrink-0">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : students.length === 0 ? (
            <p className="text-[#86868b] text-xs p-4 text-center">Search for students.</p>
          ) : (
            <div className="divide-y divide-[#3d3d3d]">
              {students.map(s => (
                <button key={s._id} onClick={() => { setSelected(s); setError(''); setSuccessMsg(''); }}
                  className={`w-full text-left px-4 py-3 hover:bg-[#2d2d2d] transition-colors ${selected?._id === s._id ? 'bg-[#2d2d2d] border-l-2 border-violet-500' : ''}`}>
                  <p className="text-sm font-medium text-white truncate">{s.studentName}</p>
                  <p className="text-[11px] text-[#86868b] font-mono mt-0.5">{s.usn}</p>
                  <p className="text-[11px] text-[#86868b]">Sem {s.semester} · {s.customFees.length} extra fees</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Edit panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 min-w-0">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-center">
              <div><span className="text-4xl block mb-2">👈</span><p className="text-[#86868b] text-sm">Select a student to edit fees</p></div>
            </div>
          ) : (
            <>
              {/* Student header */}
              <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">{selected.studentName.charAt(0)}</div>
                <div>
                  <p className="text-sm font-bold text-white">{selected.studentName}</p>
                  <p className="text-xs text-[#86868b]">{selected.usn} · Sem {selected.semester} · {selected.department}</p>
                </div>
              </div>

              {/* Status banners */}
              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-red-400 text-xs">{error}</div>}
              {successMsg && <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2.5 text-green-400 text-xs">✓ {successMsg}</div>}

              {/* Add new fee form */}
              <div className="bg-[#2d2d2d] rounded-xl border border-violet-500/20 overflow-hidden">
                <div className="px-4 py-2 border-b border-[#3d3d3d] bg-violet-500/5">
                  <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Add New Fee</h3>
                </div>
                <div className="p-4 space-y-3">
                  {/* Category + Name row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#86868b] mb-1 block">Category</label>
                      <select value={newFeeCategory} onChange={e => { setNewFeeCategory(e.target.value); if (e.target.value !== 'custom' && !newFeeName) setNewFeeName(CUSTOM_CATEGORIES.find(c => c.id === e.target.value)?.label || ''); }}
                        className="w-full bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:border-violet-500/50 focus:outline-none">
                        {CUSTOM_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#86868b] mb-1 block">Fee Name *</label>
                      <input type="text" placeholder="e.g. Lab Glass Break Penalty" value={newFeeName} onChange={e => setNewFeeName(e.target.value)}
                        className="w-full bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:border-violet-500/50 focus:outline-none" />
                    </div>
                  </div>
                  {/* Amount + Due date row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#86868b] mb-1 block">Amount (₹) *</label>
                      <input type="number" placeholder="500" min="1" value={newFeeAmount} onChange={e => setNewFeeAmount(e.target.value)}
                        className="w-full bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:border-violet-500/50 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#86868b] mb-1 block">Due Date (optional)</label>
                      <input type="date" value={newFeeDueDate} onChange={e => setNewFeeDueDate(e.target.value)}
                        className="w-full bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:border-violet-500/50 focus:outline-none" />
                    </div>
                  </div>
                  {/* Description */}
                  <div>
                    <label className="text-[11px] text-[#86868b] mb-1 block">Description (optional)</label>
                    <input type="text" placeholder="Short note…" value={newFeeDesc} onChange={e => setNewFeeDesc(e.target.value)}
                      className="w-full bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:border-violet-500/50 focus:outline-none" />
                  </div>
                  <button onClick={addFee} disabled={saving || !newFeeName.trim() || !newFeeAmount}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    {saving ? 'Adding…' : '+ Add Fee'}
                  </button>
                </div>
              </div>

              {/* Existing custom fees */}
              {selected.customFees.length > 0 && (
                <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                  <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/40">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Existing Custom Fees</h3>
                  </div>
                  <div className="divide-y divide-[#3d3d3d]">
                    {selected.customFees.map(cf => (
                      <div key={cf.feeId} className="flex items-center px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{cf.name}</p>
                          <p className="text-[11px] text-[#86868b]">{cf.category}{cf.description ? ` · ${cf.description}` : ''}</p>
                        </div>
                        <span className="text-sm font-semibold text-white shrink-0">{fmt(cf.amount)}</span>
                        <button onClick={() => togglePaid(cf)}
                          className={`text-[10px] px-2 py-1 rounded-full border shrink-0 transition-colors ${cf.isPaid ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20'}`}>
                          {cf.isPaid ? '✓ Paid' : '⏳ Mark Paid'}
                        </button>
                        <button onClick={() => removeFee(cf.feeId)}
                          className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 shrink-0">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
