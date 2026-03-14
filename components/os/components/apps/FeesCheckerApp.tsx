"use client";
import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';

// ── Fee structure (standard BEC fees) ────────────────────────────────────────
const STANDARD_FEES: Record<string, { name: string; icon: string; amount: number }> = {
  tuition:     { name: 'Tuition Fee',     icon: '📚', amount: 75000 },
  development: { name: 'Development Fee', icon: '🏗️', amount: 15000 },
  hostel:      { name: 'Hostel Fee',       icon: '🏠', amount: 45000 },
  examination: { name: 'Examination Fee', icon: '📝', amount: 5000  },
};

interface StudentFeeRecord {
  _id: string; usn: string; studentName: string;
  department: string; semester: string; paidFees: string[];
  paymentCategory: string;
  customFees: Array<{ feeId: string; name: string; category: string; amount: number; isPaid: boolean; description?: string; dueDate?: string }>;
  payments: Array<{ _id: string; feeIds: string[]; amount: number; paymentMethod: string; createdAt: string; status: string; transactionHash?: string; challanId?: string; receiptData?: string }>;
}

interface StudentListMeta {
  totalCount: number;
  returnedCount: number;
  fetchAll: boolean;
  truncated: boolean;
}

function fmt(n: number) { return `₹${(n ?? 0).toLocaleString('en-IN')}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function csvCell(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

function getStandardPaidTotal(student: StudentFeeRecord) {
  return Object.entries(STANDARD_FEES)
    .filter(([id]) => student.paidFees.includes(id))
    .reduce((sum, [, fee]) => sum + fee.amount, 0);
}

function getStandardDueTotal(student: StudentFeeRecord) {
  return Object.entries(STANDARD_FEES)
    .filter(([id]) => !student.paidFees.includes(id))
    .reduce((sum, [, fee]) => sum + fee.amount, 0);
}

function getCustomPaidTotal(student: StudentFeeRecord) {
  return student.customFees.filter(cf => cf.isPaid).reduce((sum, cf) => sum + cf.amount, 0);
}

function getCustomDueTotal(student: StudentFeeRecord) {
  return student.customFees.filter(cf => !cf.isPaid).reduce((sum, cf) => sum + cf.amount, 0);
}

function buildStudentExportRows(dataset: StudentFeeRecord[]) {
  return dataset.map(student => {
    const tuitionPaid = student.paidFees.includes('tuition');
    const developmentPaid = student.paidFees.includes('development');
    const hostelPaid = student.paidFees.includes('hostel');
    const examinationPaid = student.paidFees.includes('examination');
    const standardPaidTotal = getStandardPaidTotal(student);
    const standardDueTotal = getStandardDueTotal(student);
    const customPaidTotal = getCustomPaidTotal(student);
    const customDueTotal = getCustomDueTotal(student);
    const totalPaid = standardPaidTotal + customPaidTotal;
    const totalDue = standardDueTotal + customDueTotal;
    const lastPayment = student.payments[0]?.createdAt ? fmtDate(student.payments[0].createdAt) : '—';

    return {
      USN: student.usn,
      StudentName: student.studentName,
      Department: student.department,
      Semester: student.semester,
      PaymentCategory: student.paymentCategory,
      TuitionStatus: tuitionPaid ? 'Paid' : 'Pending',
      TuitionAmount: STANDARD_FEES.tuition.amount,
      DevelopmentStatus: developmentPaid ? 'Paid' : 'Pending',
      DevelopmentAmount: STANDARD_FEES.development.amount,
      HostelStatus: hostelPaid ? 'Paid' : 'Pending',
      HostelAmount: STANDARD_FEES.hostel.amount,
      ExaminationStatus: examinationPaid ? 'Paid' : 'Pending',
      ExaminationAmount: STANDARD_FEES.examination.amount,
      CustomFeeCount: student.customFees.length,
      CustomPaidCount: student.customFees.filter(cf => cf.isPaid).length,
      CustomPendingCount: student.customFees.filter(cf => !cf.isPaid).length,
      CustomPaidTotal: customPaidTotal,
      CustomPendingTotal: customDueTotal,
      TotalPaid: totalPaid,
      TotalPending: totalDue,
      PaymentTransactions: student.payments.length,
      LastPaymentDate: lastPayment,
      PaidFeeIds: student.paidFees.join(', '),
      PendingStandardFees: Object.entries(STANDARD_FEES).filter(([id]) => !student.paidFees.includes(id)).map(([, fee]) => fee.name).join(', '),
    };
  });
}

function buildSummaryRows(dataset: StudentFeeRecord[], meta: StudentListMeta | null) {
  const studentRows = buildStudentExportRows(dataset);
  const totalPaid = studentRows.reduce((sum, row) => sum + row.TotalPaid, 0);
  const totalPending = studentRows.reduce((sum, row) => sum + row.TotalPending, 0);
  const tuitionPaid = studentRows.filter(row => row.TuitionStatus === 'Paid').length;
  const examinationPaid = studentRows.filter(row => row.ExaminationStatus === 'Paid').length;
  const fullyCleared = studentRows.filter(row => row.TotalPending === 0).length;

  return [
    { Metric: 'Students in export', Value: dataset.length },
    { Metric: 'Total matching students', Value: meta?.totalCount ?? dataset.length },
    { Metric: 'Total paid amount', Value: totalPaid },
    { Metric: 'Total pending amount', Value: totalPending },
    { Metric: 'Students fully cleared', Value: fullyCleared },
    { Metric: 'Students with tuition paid', Value: tuitionPaid },
    { Metric: 'Students with examination paid', Value: examinationPaid },
    { Metric: 'Students with custom dues', Value: dataset.filter(student => student.customFees.some(cf => !cf.isPaid)).length },
    { Metric: 'Transactions counted', Value: dataset.reduce((sum, student) => sum + student.payments.length, 0) },
  ];
}

function buildTransactionRows(dataset: StudentFeeRecord[]) {
  return dataset.flatMap(student =>
    student.payments.map(payment => ({
      USN: student.usn,
      StudentName: student.studentName,
      Department: student.department,
      Semester: student.semester,
      FeeItems: payment.feeIds.map(id => STANDARD_FEES[id]?.name || id).join(', '),
      RawFeeIds: payment.feeIds.join(', '),
      Amount: payment.amount,
      Method: payment.paymentMethod?.toUpperCase() || '—',
      Status: payment.status,
      Date: fmtDate(payment.createdAt),
      TransactionReference: payment.transactionHash || payment.challanId || '—',
    }))
  );
}

function buildCustomFeeRows(dataset: StudentFeeRecord[]) {
  return dataset.flatMap(student =>
    student.customFees.map(fee => ({
      USN: student.usn,
      StudentName: student.studentName,
      Department: student.department,
      Semester: student.semester,
      FeeId: fee.feeId,
      Name: fee.name,
      Category: fee.category,
      Amount: fee.amount,
      Status: fee.isPaid ? 'Paid' : 'Pending',
      DueDate: fee.dueDate ? fmtDate(fee.dueDate) : '—',
      Description: fee.description || '',
    }))
  );
}

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export function FeesCheckerApp() {
  const [usnInput, setUsnInput] = useState('');
  const [semFilter, setSemFilter] = useState('');
  const [students, setStudents] = useState<StudentFeeRecord[]>([]);
  const [selected, setSelected] = useState<StudentFeeRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [openReceipt, setOpenReceipt] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<{ role: string; department: string } | null>(null);
  const [authError, setAuthError] = useState('');
  const [meta, setMeta] = useState<StudentListMeta | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);

  const API_BASE = typeof window !== 'undefined' ? window.location.origin : '';

  // Verify the logged-in user is a fee officer
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          if (d.userType === 'staff' && d.user) {
            const role = d.user.role; const dept = d.user.department;
            if ((role === 'OFFICER' || role === 'HOD' || role === 'MASTER') &&
              (dept === 'FEE_SECTION' || dept === 'EXAMINATION' || role === 'MASTER')) {
              setUserRole({ role, department: dept });
            } else {
              setAuthError('Access Denied: Only Fee Section / Examination department officers can access Fees Checker.');
            }
          } else setAuthError('Please log in with a staff account.');
        } else setAuthError('Not authenticated.');
      } catch { setAuthError('Could not verify credentials.'); }
    })();
  }, []);

  const fetchStudents = useCallback(async (silent = false) => {
    if (!userRole) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (usnInput.trim()) params.set('usn', usnInput.trim());
      if (semFilter) params.set('sem', semFilter);
      const res = await fetch(`${API_BASE}/api/payments/admin/students?${params}`, { credentials: 'include' });
      const d = await res.json();
      if (res.ok) {
        const nextStudents = d.students || [];
        setStudents(nextStudents);
        setMeta(d.meta || null);
        setSelected(prev => nextStudents.find((student: StudentFeeRecord) => student._id === prev?._id) || nextStudents[0] || null);
        setLastRefresh(new Date());
      }
      else setError(d.error || 'Failed to fetch students');
    } catch { setError('Network error'); }
    finally { if (!silent) setLoading(false); else setRefreshing(false); }
  }, [userRole, usnInput, semFilter, API_BASE]);

  const fetchExportData = useCallback(async (): Promise<{ students: StudentFeeRecord[]; meta: StudentListMeta | null }> => {
    if (!userRole) return { students: [], meta: null };
    const params = new URLSearchParams();
    if (usnInput.trim()) params.set('usn', usnInput.trim());
    if (semFilter) params.set('sem', semFilter);
    params.set('all', '1');

    const res = await fetch(`${API_BASE}/api/payments/admin/students?${params}`, { credentials: 'include' });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Failed to prepare export');
    return { students: d.students || [], meta: d.meta || null };
  }, [userRole, usnInput, semFilter, API_BASE]);

  const exportCSV = useCallback(async () => {
    try {
      setExporting('csv');
      setError('');
      const { students: dataset } = await fetchExportData();
      if (dataset.length === 0) throw new Error('No student records available for export');

      const rows = buildStudentExportRows(dataset);
      const headers = Object.keys(rows[0]);
      const csv = [headers, ...rows.map(row => headers.map(header => row[header as keyof typeof row]))]
        .map(row => row.map(csvCell).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Fees_Analytics_${semFilter || 'All'}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'CSV export failed');
    } finally {
      setExporting(null);
    }
  }, [fetchExportData, semFilter]);

  const exportExcel = useCallback(async () => {
    try {
      setExporting('xlsx');
      setError('');
      const { students: dataset, meta: exportMeta } = await fetchExportData();
      if (dataset.length === 0) throw new Error('No student records available for export');

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildSummaryRows(dataset, exportMeta)), 'Summary');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildStudentExportRows(dataset)), 'Students');

      const transactionRows = buildTransactionRows(dataset);
      if (transactionRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionRows), 'Transactions');
      }

      const customFeeRows = buildCustomFeeRows(dataset);
      if (customFeeRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(customFeeRows), 'CustomFees');
      }

      XLSX.writeFile(workbook, `Fees_Analytics_${semFilter || 'All'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err: any) {
      setError(err.message || 'Excel export failed');
    } finally {
      setExporting(null);
    }
  }, [fetchExportData, semFilter]);

  // Auto-fetch when semester filter changes
  useEffect(() => {
    if (userRole && semFilter) fetchStudents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semFilter, userRole]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!userRole) return;
    const id = setInterval(() => fetchStudents(true), 60_000);
    return () => clearInterval(id);
  }, [fetchStudents, userRole]);

  const totalPaidAmount = students.reduce((sum, student) => sum + getStandardPaidTotal(student) + getCustomPaidTotal(student), 0);
  const totalPendingAmount = students.reduce((sum, student) => sum + getStandardDueTotal(student) + getCustomDueTotal(student), 0);
  const fullyPaidCount = students.filter(student => getStandardDueTotal(student) + getCustomDueTotal(student) === 0).length;
  const pendingStudentCount = students.filter(student => getStandardDueTotal(student) + getCustomDueTotal(student) > 0).length;

  if (authError) return (
    <div className="w-full h-full bg-[#1e1e1e] flex items-center justify-center">
      <div className="text-center max-w-xs space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto"><span className="text-3xl">🔒</span></div>
        <h2 className="text-white font-semibold">Access Restricted</h2>
        <p className="text-xs text-[#86868b]">{authError}</p>
      </div>
    </div>
  );

  if (!userRole) return (
    <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
      <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full h-full bg-[#1e1e1e] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"><span className="text-lg">💳</span></div>
            <div>
              <h1 className="text-sm font-bold text-white">Fees Checker</h1>
              <p className="text-[11px] text-[#86868b]">{userRole.department} · {userRole.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && <span className="text-[10px] text-[#86868b]">↺ {lastRefresh.toLocaleTimeString()}</span>}
            <button onClick={exportCSV} disabled={exporting !== null}
              className="px-2.5 py-1.5 bg-sky-600 text-white rounded-lg text-xs hover:bg-sky-500 transition-colors disabled:opacity-50">
              {exporting === 'csv' ? 'Exporting CSV…' : 'Export CSV'}
            </button>
            <button onClick={exportExcel} disabled={exporting !== null}
              className="px-2.5 py-1.5 bg-violet-600 text-white rounded-lg text-xs hover:bg-violet-500 transition-colors disabled:opacity-50">
              {exporting === 'xlsx' ? 'Exporting Excel…' : 'Export Excel'}
            </button>
            <button onClick={() => fetchStudents(true)} disabled={refreshing}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#3d3d3d] text-white rounded-lg text-xs hover:bg-[#4d4d4d] transition-colors disabled:opacity-50">
              <span className={`text-base leading-none ${refreshing ? 'animate-spin' : ''}`}>↻</span>
            </button>
          </div>
        </div>
        {/* Search bar */}
        <div className="mt-3 flex gap-2">
          <input type="text" placeholder="Search by USN…" value={usnInput} onChange={e => setUsnInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchStudents()}
            className="flex-1 bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:border-emerald-500/50 focus:outline-none" />
          <select value={semFilter} onChange={e => setSemFilter(e.target.value)}
            className="bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm border border-[#3d3d3d] focus:border-emerald-500/50 focus:outline-none">
            <option value="">All Semesters</option>
            {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <button onClick={() => fetchStudents()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            Search
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="rounded-lg bg-[#1e1e1e] border border-[#3d3d3d] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[#86868b]">Students</p>
            <p className="text-sm font-semibold text-white">{students.length}{meta?.truncated ? ` / ${meta.totalCount}` : ''}</p>
          </div>
          <div className="rounded-lg bg-[#1e1e1e] border border-[#3d3d3d] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[#86868b]">Paid Amount</p>
            <p className="text-sm font-semibold text-emerald-400">{fmt(totalPaidAmount)}</p>
          </div>
          <div className="rounded-lg bg-[#1e1e1e] border border-[#3d3d3d] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[#86868b]">Pending Amount</p>
            <p className="text-sm font-semibold text-orange-400">{fmt(totalPendingAmount)}</p>
          </div>
          <div className="rounded-lg bg-[#1e1e1e] border border-[#3d3d3d] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[#86868b]">Clear / Due</p>
            <p className="text-sm font-semibold text-white">{fullyPaidCount} / {pendingStudentCount}</p>
          </div>
        </div>
        {meta?.truncated && (
          <p className="mt-2 text-[11px] text-amber-400">
            Showing first {meta.returnedCount} students on screen. CSV/Excel exports include the complete filtered list.
          </p>
        )}
      </div>

      {/* Body — two-pane layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Student list */}
        <div className="w-64 border-r border-[#3d3d3d] overflow-y-auto shrink-0">
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : error ? (
            <p className="text-red-400 text-xs p-4">{error}</p>
          ) : students.length === 0 ? (
            <div className="text-center py-10 px-4 text-[#86868b] text-xs">Search for students above.</div>
          ) : (
            <div className="divide-y divide-[#3d3d3d]">
              {students.map(s => {
                const pendingCount = Object.keys(STANDARD_FEES).filter(id => !s.paidFees.includes(id)).length
                  + s.customFees.filter(cf => !cf.isPaid).length;
                return (
                  <button key={s._id} onClick={() => setSelected(s)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#2d2d2d] transition-colors ${selected?._id === s._id ? 'bg-[#2d2d2d] border-l-2 border-emerald-500' : ''}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white truncate">{s.studentName}</p>
                      {pendingCount > 0 && <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">{pendingCount} due</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-[#86868b] font-mono">{s.usn}</span>
                      <span className="text-[#5e5e5e]">·</span>
                      <span className="text-[11px] text-[#86868b]">Sem {s.semester}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-center">
              <div className="space-y-2">
                <span className="text-4xl block">👈</span>
                <p className="text-[#86868b] text-sm">Select a student to view fee details</p>
              </div>
            </div>
          ) : (
            <>
              {/* Student header */}
              <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                  {selected.studentName.charAt(0)}
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-white">{selected.studentName}</h2>
                  <div className="flex gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-[#86868b]">{selected.usn}</span>
                    <span className="text-xs text-[#86868b]">· {selected.department}</span>
                    <span className="text-xs text-[#86868b]">· Sem {selected.semester}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#3d3d3d] rounded text-white">{selected.paymentCategory}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#86868b]">Total Paid</p>
                  <p className="text-base font-bold text-emerald-400">
                    {fmt(Object.entries(STANDARD_FEES).filter(([id]) => selected.paidFees.includes(id)).reduce((s, [, f]) => s + f.amount, 0)
                      + selected.customFees.filter(cf => cf.isPaid).reduce((s, cf) => s + cf.amount, 0))}
                  </p>
                </div>
              </div>

              {/* Standard fees */}
              <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/40">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Standard Fees</h3>
                </div>
                <div className="divide-y divide-[#3d3d3d]">
                  {Object.entries(STANDARD_FEES).map(([id, fee]) => {
                    const paid = selected.paidFees.includes(id);
                    // Find the matching payment record
                    const payRec = selected.payments.find(p => p.feeIds.includes(id) && p.status === 'completed');
                    return (
                      <div key={id} className="flex items-center px-4 py-3">
                        <span className="text-lg mr-3">{fee.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{fee.name}</p>
                          {payRec && <p className="text-[11px] text-[#86868b] mt-0.5">{fmtDate(payRec.createdAt)} · {payRec.paymentMethod?.toUpperCase()}</p>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full mr-3 ${paid ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {paid ? '✓ Paid' : '⏳ Pending'}
                        </span>
                        <span className={`text-sm font-semibold mr-2 ${paid ? 'text-green-400' : 'text-white'}`}>{fmt(fee.amount)}</span>
                        {payRec && (
                          <button onClick={() => { try { setOpenReceipt(JSON.parse(payRec.receiptData || '{}')); } catch { setOpenReceipt({ id: payRec._id, amount: payRec.amount, method: payRec.paymentMethod, date: payRec.createdAt }); } }}
                            className="text-[10px] px-2 py-0.5 bg-[#3d3d3d] text-[#86868b] rounded hover:bg-[#4d4d4d] transition-colors">
                            View Receipt
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom fees */}
              {selected.customFees.length > 0 && (
                <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                  <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/40">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Additional Fees</h3>
                  </div>
                  <div className="divide-y divide-[#3d3d3d]">
                    {selected.customFees.map(cf => (
                      <div key={cf.feeId} className="flex items-center px-4 py-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{cf.name}</p>
                          <p className="text-[11px] text-[#86868b]">{cf.category}{cf.description ? ` · ${cf.description}` : ''}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full mr-3 ${cf.isPaid ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {cf.isPaid ? '✓ Paid' : '⏳ Pending'}
                        </span>
                        <span className="text-sm font-semibold text-white">{fmt(cf.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment History */}
              {selected.payments.length > 0 && (
                <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                  <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/40">
                    <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Transaction History</h3>
                  </div>
                  <div className="divide-y divide-[#3d3d3d]">
                    {selected.payments.map(p => (
                      <div key={p._id} className="flex items-center px-4 py-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {p.feeIds.map(id => STANDARD_FEES[id]?.name || id).join(', ')}
                          </p>
                          <p className="text-[11px] text-[#86868b] mt-0.5">{fmtDate(p.createdAt)} · {p.paymentMethod?.toUpperCase()}</p>
                          {(p.transactionHash || p.challanId) && (
                            <p className="text-[10px] text-[#86868b] font-mono mt-0.5">{p.transactionHash || p.challanId}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full mr-3 ${p.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
                          {p.status}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-green-400">{fmt(p.amount)}</span>
                          <button
                            onClick={() => { try { setOpenReceipt(JSON.parse(p.receiptData || '{}')); } catch { setOpenReceipt({ id: p._id, amount: p.amount, method: p.paymentMethod, date: p.createdAt, usn: selected.usn, studentName: selected.studentName }); } }}
                            className="text-[10px] px-2 py-0.5 bg-[#3d3d3d] text-[#86868b] rounded hover:bg-[#4d4d4d]">
                            Receipt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {openReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#2d2d2d] border border-[#3d3d3d] rounded-2xl w-80 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#3d3d3d]">
              <h3 className="text-sm font-bold text-white">Payment Receipt</h3>
              <button onClick={() => setOpenReceipt(null)} className="text-[#86868b] hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="p-5 space-y-2 text-sm">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center mb-3">
                <p className="text-green-400 text-2xl font-bold">{fmt(openReceipt.amount || 0)}</p>
                <p className="text-green-400/70 text-xs mt-1">Payment Confirmed</p>
              </div>
              {Object.entries(openReceipt).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[#86868b] capitalize text-xs">{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-white text-xs font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4">
              <button onClick={() => setOpenReceipt(null)} className="w-full py-2 bg-[#3d3d3d] text-white rounded-lg text-sm hover:bg-[#4d4d4d]">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
