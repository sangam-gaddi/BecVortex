"use client";
import { useEffect, useState } from 'react';

// ── Fee Structure Data (exact copy from BECBillDesk) ──
interface FeeBreakdown { id: string; category: string; amount: number; description: string; }
interface FeeType { id: string; name: string; total: number; dueDate: string; status: string; breakdown: FeeBreakdown[]; icon: string; }

const FEE_STRUCTURE: FeeType[] = [
    {
        id: 'tuition', name: 'Tuition Fee', total: 75000, dueDate: '2025-01-30', status: 'pending', icon: '📚',
        breakdown: [
            { id: 'tuition-1', category: 'Course Fee', amount: 50000, description: 'Semester course charges' },
            { id: 'tuition-2', category: 'Lab Fee', amount: 15000, description: 'Laboratory equipment & materials' },
            { id: 'tuition-3', category: 'Library Fee', amount: 5000, description: 'Access to digital & physical library' },
            { id: 'tuition-4', category: 'Sports Fee', amount: 5000, description: 'Sports facilities & equipment' },
        ],
    },
    {
        id: 'development', name: 'Development Fee', total: 15000, dueDate: '2025-01-30', status: 'pending', icon: '🏗️',
        breakdown: [
            { id: 'dev-1', category: 'Infrastructure', amount: 8000, description: 'Campus development & maintenance' },
            { id: 'dev-2', category: 'Technology Upgrade', amount: 5000, description: 'IT infrastructure & software' },
            { id: 'dev-3', category: 'Green Campus', amount: 2000, description: 'Environmental initiatives' },
        ],
    },
    {
        id: 'hostel', name: 'Hostel Fee', total: 45000, dueDate: '2025-02-15', status: 'pending', icon: '🏠',
        breakdown: [
            { id: 'hostel-1', category: 'Accommodation', amount: 25000, description: 'Room rent for semester' },
            { id: 'hostel-2', category: 'Mess Charges', amount: 15000, description: 'Food & dining services' },
            { id: 'hostel-3', category: 'Maintenance', amount: 3000, description: 'Hostel upkeep & cleaning' },
            { id: 'hostel-4', category: 'Security Deposit', amount: 2000, description: 'Refundable at year end' },
        ],
    },
    {
        id: 'examination', name: 'Examination Fee', total: 5000, dueDate: '2025-02-28', status: 'pending', icon: '📝',
        breakdown: [
            { id: 'exam-1', category: 'Registration', amount: 2000, description: 'Exam registration charges' },
            { id: 'exam-2', category: 'Valuation', amount: 2000, description: 'Answer sheet evaluation' },
            { id: 'exam-3', category: 'Certificate', amount: 1000, description: 'Mark sheets & certificates' },
        ],
    },
];

function calculateTotal(feeIds: string[]): number {
    return feeIds.reduce((total, id) => {
        const fee = FEE_STRUCTURE.find(f => f.id === id);
        return total + (fee?.total || 0);
    }, 0);
}

// ── Types ──
interface Payment {
    _id: string; feeIds: string[]; amount: number; transactionHash: string;
    paymentMethod: string; createdAt: string; status: string; challanId?: string;
    receiptData?: string;
}
interface CustomFee {
    feeId: string; name: string; category: string; amount: number;
    isPaid: boolean; dueDate?: string; description?: string;
}
interface StudentInfo {
    usn: string; studentName: string; department?: string; semester?: string; email?: string;
}

// ── Main App ──
export function BECPay() {
    const [selectedFees, setSelectedFees] = useState<string[]>([]);
    const [expandedFees, setExpandedFees] = useState<string[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [paidFeeIds, setPaidFeeIds] = useState<string[]>([]);
    const [customFees, setCustomFees] = useState<CustomFee[]>([]);
    const [student, setStudent] = useState<StudentInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'history'>('pending');
    const [paymentInProgress, setPaymentInProgress] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

    const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

    useEffect(() => { loadData(); }, []);
    // Auto-refresh every 60s
    useEffect(() => {
        const id = setInterval(() => { loadData(true); }, 60_000);
        return () => clearInterval(id);
    }, []);

    const loadData = async (silent = false) => {
        if (!silent) setIsLoading(true); else setIsRefreshing(true);
        try {
            const [meRes, payRes, cfRes] = await Promise.all([
                fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/payments`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/payments/my-custom-fees`, { credentials: 'include' }),
            ]);
            if (meRes.ok) {
                const data = await meRes.json();
                setPaidFeeIds(data.student?.paidFees || []);
                setStudent({ usn: data.student?.usn || '', studentName: data.student?.studentName || 'Student', department: data.student?.department, semester: data.student?.semester, email: data.student?.email });
            }
            if (payRes.ok) { const pData = await payRes.json(); setPayments(pData.payments || []); }
            if (cfRes.ok) { const cfData = await cfRes.json(); setCustomFees(cfData.customFees || []); }
            setLastRefresh(new Date());
        } catch (err) { console.error('Load error:', err); }
        finally { if (!silent) setIsLoading(false); else setIsRefreshing(false); }
    };

    const toggleFee = (id: string) => {
        if (paidFeeIds.includes(id)) return;
        setSelectedFees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleExpand = (id: string) => {
        setExpandedFees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handlePayment = () => {
        if (selectedFees.length === 0) return;
        window.location.href = `/payment?feeIds=${selectedFees.join(',')}&usn=${student?.usn || ''}`;
    };

    const fmt = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const total = calculateTotal(selectedFees);
    const unpaid = FEE_STRUCTURE.filter(f => !paidFeeIds.includes(f.id));
    const paid = FEE_STRUCTURE.filter(f => paidFeeIds.includes(f.id));

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#86868b] text-sm">Loading fees...</p>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="text-center space-y-4 p-8">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <span className="text-4xl">✅</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
                    <p className="text-[#86868b]">Transaction ID: {paymentSuccess.slice(0, 12)}...</p>
                    <p className="text-green-400 text-xl font-bold">{fmt(calculateTotal(paid.map(f => f.id)))}</p>
                    <button onClick={() => setPaymentSuccess(null)}
                        className="px-6 py-2 bg-[#0071e3] text-white rounded-lg hover:bg-[#0077ed] transition-colors">
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-[#1e1e1e] overflow-auto relative flex flex-col">
            {/* Header */}
            <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-3 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                            {student?.studentName?.charAt(0) || 'S'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-semibold text-white">{student?.studentName || 'Student'}</h1>
                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30 font-medium">BEC Billdesk</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-[#86868b]">#{student?.usn}</span>
                                {student?.department && <span className="text-xs text-[#86868b]">• {student.department}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {lastRefresh && <p className="text-[10px] text-[#86868b] hidden sm:block">↻ {lastRefresh.toLocaleTimeString()}</p>}
                        <button onClick={() => loadData(true)} disabled={isRefreshing}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3d3d3d] text-white rounded-lg text-xs hover:bg-[#4d4d4d] transition-colors disabled:opacity-50">
                            <span className={`text-sm leading-none ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-5 py-3 grid grid-cols-3 gap-3 shrink-0">
                <div className="bg-[#2d2d2d] rounded-xl p-3 border border-[#3d3d3d]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <span className="text-orange-400 text-sm">⏳</span>
                        </div>
                        <div>
                            <p className="text-xs text-[#86868b]">Pending</p>
                            <p className="text-base font-bold text-white">{fmt(unpaid.reduce((s, f) => s + f.total, 0))}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[#2d2d2d] rounded-xl p-3 border border-[#3d3d3d]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                            <span className="text-green-400 text-sm">✅</span>
                        </div>
                        <div>
                            <p className="text-xs text-[#86868b]">Paid</p>
                            <p className="text-base font-bold text-green-400">{fmt(paid.reduce((s, f) => s + f.total, 0))}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-[#2d2d2d] rounded-xl p-3 border border-[#3d3d3d]">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                            <span className="text-blue-400 text-sm">📋</span>
                        </div>
                        <div>
                            <p className="text-xs text-[#86868b]">Transactions</p>
                            <p className="text-base font-bold text-white">{payments.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Nav */}
            <div className="px-5 shrink-0">
                <div className="bg-[#2d2d2d] rounded-lg p-1 inline-flex gap-1 border border-[#3d3d3d]">
                    {(['pending', 'paid', 'history'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === tab ? 'bg-emerald-600 text-white shadow-sm' : 'text-[#86868b] hover:bg-[#3d3d3d]'}`}>
                            {tab === 'pending' && `Pending (${unpaid.length + customFees.filter(cf => !cf.isPaid).length})`}
                            {tab === 'paid' && `Paid (${paid.length})`}
                            {tab === 'history' && `History (${payments.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-5 py-3 flex-1 overflow-auto min-h-0">
                {activeTab === 'pending' && (
                    <div className="space-y-3">
                    <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                        <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/50">
                            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Standard Fee Invoice</h2>
                        </div>
                        {unpaid.length === 0 ? (
                            <div className="p-8 text-center">
                                <span className="text-4xl mb-3 block">🎉</span>
                                <p className="font-medium text-white">All fees paid!</p>
                                <p className="text-sm text-[#86868b]">You have no pending payments.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#3d3d3d]">
                                {unpaid.map(fee => (
                                    <div key={fee.id}>
                                        <div onClick={() => toggleFee(fee.id)}
                                            className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${selectedFees.includes(fee.id) ? 'bg-[#0071e3]/10' : 'hover:bg-[#3d3d3d]/50'
                                                }`}>
                                            <input type="checkbox" checked={selectedFees.includes(fee.id)}
                                                onChange={() => toggleFee(fee.id)} onClick={e => e.stopPropagation()}
                                                className="w-4 h-4 mr-3 rounded accent-[#0071e3]" />
                                            <span className="text-lg mr-3">{fee.icon}</span>
                                            <div className="flex-1">
                                                <p className="font-medium text-white text-sm">{fee.name}</p>
                                                <p className="text-xs text-[#86868b]">{fee.breakdown.length} items · Due {fmtDate(fee.dueDate)}</p>
                                            </div>
                                            <span className="font-semibold text-white text-sm mr-3">{fmt(fee.total)}</span>
                                            <button onClick={e => { e.stopPropagation(); toggleExpand(fee.id); }}
                                                className="p-1 rounded hover:bg-[#3d3d3d]">
                                                <span className="text-[#86868b] text-xs">{expandedFees.includes(fee.id) ? '▲' : '▼'}</span>
                                            </button>
                                        </div>
                                        {expandedFees.includes(fee.id) && (
                                            <div className="bg-[#3d3d3d]/30 px-4 py-2 mx-4 mb-2 rounded-lg">
                                                {fee.breakdown.map(item => (
                                                    <div key={item.id} className="flex justify-between py-1.5">
                                                        <div>
                                                            <span className="text-xs text-white">{item.category}</span>
                                                            <span className="text-xs text-[#86868b] ml-2">— {item.description}</span>
                                                        </div>
                                                        <span className="text-xs font-medium text-white">{fmt(item.amount)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between py-1.5 border-t border-[#3d3d3d] mt-1">
                                                    <span className="text-xs font-semibold text-white">Subtotal</span>
                                                    <span className="text-xs font-bold text-white">{fmt(fee.total)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Custom / Officer-assigned fees */}
                    {customFees.filter(cf => !cf.isPaid).length > 0 && (
                        <div className="bg-[#2d2d2d] rounded-xl border border-orange-500/30 overflow-hidden">
                            <div className="px-4 py-2 border-b border-[#3d3d3d] bg-orange-500/5">
                                <h2 className="text-xs font-semibold text-orange-400 uppercase tracking-wider">⚠ Additional Fees (assigned by office)</h2>
                            </div>
                            <div className="divide-y divide-[#3d3d3d]">
                                {customFees.filter(cf => !cf.isPaid).map(cf => (
                                    <div key={cf.feeId} className="flex items-center px-4 py-3 gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white">{cf.name}</p>
                                            <p className="text-xs text-[#86868b] mt-0.5">{cf.category} {cf.description ? `· ${cf.description}` : ''}</p>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20 shrink-0">Pending</span>
                                        <span className="font-semibold text-sm text-white shrink-0">₹{cf.amount.toLocaleString('en-IN')}</span>
                                        <button
                                            onClick={() => window.location.href = `/payment?customFeeId=${encodeURIComponent(cf.feeId)}&customFeeName=${encodeURIComponent(cf.name)}&customFeeAmount=${cf.amount}&usn=${student?.usn || ''}`}
                                            className="shrink-0 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 text-white rounded-lg text-xs font-semibold transition-colors"
                                        >
                                            Pay →
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    </div>
                )}

                {activeTab === 'paid' && (
                    <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                        <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/50">
                            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Paid Invoices</h2>
                        </div>
                        {paid.length === 0 ? (
                            <div className="p-8 text-center">
                                <span className="text-4xl mb-3 block">📋</span>
                                <p className="font-medium text-white">No payments yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#3d3d3d]">
                                {paid.map(fee => (
                                    <div key={fee.id} className="flex items-center px-4 py-3">
                                        <span className="text-lg mr-3">{fee.icon}</span>
                                        <span className="font-medium text-white text-sm flex-1">{fee.name}</span>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 mr-3">✓ Paid</span>
                                        <span className="font-semibold text-green-400 text-sm">{fmt(fee.total)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'paid' && customFees.filter(cf => cf.isPaid).length > 0 && (
                    <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden mt-3">
                        <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/50">
                            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Additional Fees (paid)</h2>
                        </div>
                        <div className="divide-y divide-[#3d3d3d]">
                            {customFees.filter(cf => cf.isPaid).map(cf => (
                                <div key={cf.feeId} className="flex items-center px-4 py-3">
                                    <span className="flex-1 text-sm font-medium text-white">{cf.name}</span>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-400 mr-3">✓ Paid</span>
                                    <span className="font-semibold text-green-400 text-sm">₹{cf.amount.toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                        <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/50">
                            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Transaction History</h2>
                        </div>
                        {payments.length === 0 ? (
                            <div className="p-8 text-center">
                                <span className="text-4xl mb-3 block">💳</span>
                                <p className="font-medium text-white">No transactions</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#3d3d3d]">
                                {payments.map(p => (
                                    <div key={p._id} className="flex items-center px-4 py-3">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-white">
                                                {p.feeIds.map(id => FEE_STRUCTURE.find(f => f.id === id)?.name).filter(Boolean).join(', ') || 'Fee Payment'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-[#86868b]">{fmtDate(p.createdAt)}</span>
                                                <span className="text-xs px-1.5 py-0.5 bg-[#3d3d3d] rounded text-white">{(p.paymentMethod || 'N/A').toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <span className="font-semibold text-green-400 text-sm">{fmt(p.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Pay Bar */}
            {selectedFees.length > 0 && (
                <div className="absolute bottom-4 right-4 z-40">
                    <div className="bg-[#2d2d2d] rounded-2xl px-5 py-3 shadow-2xl border border-[#3d3d3d] flex items-center gap-5">
                        <div>
                            <p className="text-xs text-[#86868b]">{selectedFees.length} item(s)</p>
                            <p className="text-xl font-bold text-white">{fmt(total)}</p>
                        </div>
                        <button onClick={handlePayment} disabled={paymentInProgress}
                            className="bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95 text-sm">
                            {paymentInProgress ? 'Processing...' : 'Pay Now'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
