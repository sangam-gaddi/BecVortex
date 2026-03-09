"use client";
import { useState } from 'react';

interface PaymentResult {
  found: boolean;
  data?: {
    paymentId: string;
    usn: string;
    studentName?: string;
    amount: number;
    status: string;
    date: string;
    method?: string;        // existing API field
    paymentMethod?: string; // fallback
    channel?: string;
    refId?: string;         // existing API field
    transactionRef?: string;
    feeIds?: string[];
  };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; icon: string }> = {
    completed: { bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', icon: '✓' },
    pending:   { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', icon: '⏳' },
    failed:    { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: '✗' },
  };
  const s = map[status?.toLowerCase()] ?? map.pending;
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${s.bg} ${s.text}`}>{s.icon} {status?.toUpperCase()}</span>;
}

export function FeeCheckApp() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  const check = async () => {
    const id = input.trim();
    if (!id) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/payments/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transactionId: id }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.found) {
        setResult(d);
      } else if (res.status === 404 || (res.ok && !d.found)) {
        setResult({ found: false });
      } else {
        setResult({ found: false });
        if (d.error) setError(d.error);
      }
    } catch { setError('Network error. Try again.'); }
    finally { setLoading(false); }
  };

  const clear = () => { setInput(''); setResult(null); setError(''); };

  return (
    <div className="w-full h-full bg-[#1e1e1e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-3.5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center"><span className="text-lg">🔍</span></div>
          <div>
            <h1 className="text-sm font-bold text-white">Fee Verify</h1>
            <p className="text-[11px] text-[#86868b]">Verify any payment by ID or reference</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Search box */}
        <div className="bg-[#2d2d2d] rounded-2xl border border-[#3d3d3d] p-4 space-y-3">
          <p className="text-[11px] text-[#86868b]">Paste or type your payment ID, transaction hash, challan ID, or bank reference number.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. txn_abc123 / CH-2025-0001 / 0x1a2b…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              className="flex-1 bg-[#1e1e1e] text-white text-sm px-4 py-2.5 rounded-xl border border-[#3d3d3d] focus:border-sky-500/50 focus:outline-none font-mono"
            />
            {input && (
              <button onClick={clear} className="px-3 py-2 bg-[#3d3d3d] text-[#86868b] rounded-xl text-sm hover:bg-[#4d4d4d] hover:text-white transition-colors">✕</button>
            )}
          </div>
          <button
            onClick={check}
            disabled={loading || !input.trim()}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {loading ? 'Checking…' : 'Verify Payment'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
        )}

        {/* Not found */}
        {result && !result.found && !error && (
          <div className="bg-[#2d2d2d] rounded-2xl border border-red-500/20 p-6 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-2xl">✗</div>
            <h3 className="text-white font-semibold">Payment Not Found</h3>
            <p className="text-[#86868b] text-sm">No payment record matches the provided ID.</p>
            <p className="text-[11px] text-[#86868b]">Double-check the ID and try again, or contact the fee section.</p>
          </div>
        )}

        {/* Found result */}
        {result?.found && result.data && (
          <div className="bg-[#2d2d2d] rounded-2xl border border-green-500/20 overflow-hidden">
            {/* Status banner */}
            <div className={`px-4 py-3 border-b border-[#3d3d3d] flex items-center justify-between ${result.data.status?.toLowerCase() === 'completed' ? 'bg-green-500/5' : 'bg-orange-500/5'}`}>
              <span className="text-sm font-semibold text-white">Payment Record</span>
              <StatusBadge status={result.data.status} />
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Payment ID', value: result.data.paymentId, mono: true },
                  { label: 'Student USN', value: result.data.usn, mono: true },
                  ...(result.data.studentName ? [{ label: 'Name', value: result.data.studentName, mono: false }] : []),
                  { label: 'Amount', value: `₹${(result.data.amount ?? 0).toLocaleString('en-IN')}`, mono: false },
                  { label: 'Method', value: `${result.data.method || result.data.paymentMethod || '—'}${result.data.channel ? ` · ${result.data.channel}` : ''}`, mono: false },
                  { label: 'Date', value: new Date(result.data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }), mono: false },
                  ...(result.data.refId || result.data.transactionRef ? [{ label: 'Reference', value: (result.data.refId || result.data.transactionRef)!, mono: true }] : []),
                ].map(item => (
                  <div key={item.label} className="bg-[#1e1e1e] rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-[#86868b] uppercase tracking-wider mb-1">{item.label}</p>
                    <p className={`text-sm text-white truncate ${item.mono ? 'font-mono text-xs' : ''}`}>{item.value}</p>
                  </div>
                ))}
              </div>
              {result.data.feeIds && result.data.feeIds.length > 0 && (
                <div className="bg-[#1e1e1e] rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-[#86868b] uppercase tracking-wider mb-2">Fee IDs Covered</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.data.feeIds.map(fid => (
                      <span key={fid} className="text-[11px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono">{fid}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hints if empty */}
        {!result && !error && !loading && (
          <div className="text-center py-8">
            <span className="text-4xl block mb-3">🧾</span>
            <p className="text-[#86868b] text-sm font-medium">Enter any payment reference to verify</p>
            <div className="mt-4 text-[11px] text-[#86868b] space-y-1">
              <p>Supported: Transaction ID · Challan ID</p>
              <p>Bank Reference · Transaction Hash (crypto)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
