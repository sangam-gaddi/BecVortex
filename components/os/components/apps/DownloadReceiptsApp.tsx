"use client";
import { useState, useEffect, useCallback } from 'react';

interface PaymentRecord {
  _id: string;
  usn: string;
  feeIds: string[];
  amount: number;
  status: string;
  paymentMethod: string;
  channel?: string;
  createdAt: string;
  transactionHash?: string;
  challanId?: string;
  bankReferenceId?: string;
  receiptData?: string;
}

interface StudentInfo {
  usn: string; studentName: string; department: string; semester: string; email?: string;
  degree?: string; category?: string;
}

const FEE_NAME_MAP: Record<string, string> = {
  tuition:     'Tuition Fee',
  development: 'Development Fee',
  hostel:      'Hostel Fee',
  examination: 'Examination Fee',
};

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString('en-IN')}`; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fid(id: string) { return FEE_NAME_MAP[id] || id; }
function refId(p: PaymentRecord) { return p.transactionHash || p.challanId || p.bankReferenceId || p._id; }

export function DownloadReceiptsApp() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState('');
  const [printing, setPrinting] = useState<string | null>(null);

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const [meRes, histRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' }),
        fetch(`${API_BASE}/api/payments/history`, { credentials: 'include' }),
      ]);
      if (!meRes.ok) { setAuthError('Please log in to view your receipts.'); return; }
      const meData = await meRes.json();
      if (meData.userType !== 'student') { setAuthError('Student account required.'); return; }
      setStudent({
        usn: meData.user?.usn || meData.usn || '',
        studentName: meData.user?.studentName || meData.user?.name || '',
        department: meData.user?.department || '',
        semester: meData.user?.semester || '',
        email: meData.user?.email || '',
        degree: meData.user?.degree || 'B.E.',
        category: meData.user?.casteCat || meData.user?.category || 'GM',
      });
      if (histRes.ok) {
        const d = await histRes.json();
        const completed = (d.payments || []).filter((p: PaymentRecord) => p.status?.toLowerCase() === 'completed');
        setPayments(completed);
        setLastRefresh(new Date());
      } else setError('Could not load payment history.');
    } catch { setError('Network error.'); }
    finally { if (!silent) setLoading(false); else setRefreshing(false); }
  }, [API_BASE]);

  useEffect(() => { loadData(); }, [loadData]);

  const downloadReceipt = async (p: PaymentRecord) => {
    if (!student) return;
    setPrinting(p._id);
    try {
      const { generateReceipt } = await import('@/utils/receiptGenerator');
      const ref = refId(p);
      const feeItems = p.feeIds.map(id => ({
        name: fid(id),
        amount: p.amount / Math.max(p.feeIds.length, 1),
      }));
      generateReceipt(
        {
          receiptNo: p._id.substring(0, 8).toUpperCase(),
          transactionId: ref,
          paymentDate: new Date(p.createdAt),
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          feeItems,
          channel: (p.channel as 'ONLINE' | 'CASH') || 'ONLINE',
        },
        {
          usn: student.usn,
          name: student.studentName,
          branch: `${student.department}/${student.semester}`,
          degree: student.degree || 'B.E.',
          category: student.category || 'GM',
        }
      );
    } catch (e) {
      console.error('Receipt generation failed:', e);
    } finally {
      setTimeout(() => setPrinting(null), 1500);
    }
  };

  if (authError) return (
    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="text-center max-w-xs space-y-3 p-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto"><span className="text-3xl">🔒</span></div>
        <h2 className="text-white font-semibold">Login Required</h2>
        <p className="text-xs text-[#86868b]">{authError}</p>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full bg-[#1e1e1e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-3.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center"><span className="text-lg">📄</span></div>
            <div>
              <h1 className="text-sm font-bold text-white">My Receipts</h1>
              <p className="text-[11px] text-[#86868b]">Download your payment receipts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && <span className="text-[10px] text-[#86868b]">↺ {lastRefresh.toLocaleTimeString()}</span>}
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3d3d3d] text-white rounded-lg text-xs hover:bg-[#4d4d4d] disabled:opacity-50">
              <span className={`text-base leading-none ${refreshing ? 'animate-spin' : ''}`}>↻</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-red-400 text-sm">{error}</div>}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[#86868b] text-sm">Loading your receipts…</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <span className="text-5xl">📂</span>
            <p className="text-white font-medium text-sm">No receipts found</p>
            <p className="text-[#86868b] text-xs">Completed payments will appear here.</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            {student && (
              <div className="bg-[#2d2d2d] rounded-2xl border border-[#3d3d3d] p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{student.studentName || student.usn}</p>
                  <p className="text-xs text-[#86868b]">{student.usn} · Dept: {student.department}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-400">{payments.length}</p>
                  <p className="text-[10px] text-[#86868b]">receipts</p>
                </div>
              </div>
            )}

            {/* Payment list */}
            <div className="space-y-2">
              {payments.map(p => {
                const ref = refId(p);
                const isPrinting = printing === p._id;
                return (
                  <div key={p._id} className="bg-[#2d2d2d] rounded-2xl border border-[#3d3d3d] overflow-hidden">
                    <div className="px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {/* Fee names */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {p.feeIds.map(id => (
                            <span key={id} className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{fid(id)}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-base font-bold text-white">{fmt(p.amount)}</span>
                          <span className="text-[11px] text-[#86868b]">{p.paymentMethod}{p.channel ? ` · ${p.channel}` : ''}</span>
                          <span className="text-[11px] text-[#86868b]">{fmtDate(p.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-[#86868b] font-mono mt-1 truncate">Ref: {ref}</p>
                      </div>
                      <button onClick={() => downloadReceipt(p)} disabled={isPrinting}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white rounded-xl text-xs font-semibold transition-colors">
                        {isPrinting ? '⏳' : '⬇'} {isPrinting ? 'Opening…' : 'Download'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
