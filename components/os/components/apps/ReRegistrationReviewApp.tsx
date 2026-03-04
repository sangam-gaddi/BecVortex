"use client";

import React, { useState, useEffect } from 'react';
import { AppTemplate } from './AppTemplate';
import { getOfficerPendingRequests, processRegistrationRequest } from '@/lib/actions/registration.actions';
import { getOfficerSessionInfo } from '@/lib/actions/subject.actions';
import { FileSignature, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ReRegistrationReviewApp() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [activeBranch, setActiveBranch] = useState<string>('...');

    useEffect(() => {
        // Fetch the officer's real branch from the JWT then load requests
        getOfficerSessionInfo().then(res => {
            if (res.success && res.department) setActiveBranch(res.department);
        });
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        // No branch param - backend reads from JWT session
        const res = await getOfficerPendingRequests();
        if (res.success) {
            if (res.officerBranch) setActiveBranch(res.officerBranch);
            setRequests(res.requests);
        } else {
            toast.error(String(res.error || 'Failed to fetch backlog requests.'));
        }
        setLoading(false);
    };

    const handleAction = (requestId: string, action: 'APPROVED' | 'REJECTED') => {
        const isApprove = action === 'APPROVED';

        toast(
            (t) => (
                <div className="flex flex-col gap-3 min-w-[240px]">
                    <p className="font-bold text-white text-sm">
                        {isApprove ? '✅ Approve Request?' : '❌ Reject Request?'}
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed">
                        {isApprove
                            ? 'Approving will push all selected subjects into the student\'s registered courses.'
                            : 'Rejecting will deny this student\'s backlog registration request.'}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                toast.dismiss(t.id);
                                setProcessingId(requestId);
                                const remarks = isApprove ? 'Approved by Officer' : 'Rejected by Officer';
                                const res = await processRegistrationRequest(requestId, action, remarks);
                                if (res.success) {
                                    toast.success(String(res.message || 'Request processed.'));
                                    setRequests(prev => prev.filter(r => r._id !== requestId));
                                } else {
                                    toast.error(res.error ? String(res.error) : 'Failed to process request.');
                                }
                                setProcessingId(null);
                            }}
                            className={`flex-1 py-2 text-white text-xs rounded-lg font-bold transition-colors ${isApprove ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-700 hover:bg-red-600'}`}
                        >
                            {isApprove ? '✓ Confirm Approve' : '✕ Confirm Reject'}
                        </button>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ),
            {
                duration: 12000,
                style: { background: '#1a1d2e', border: `1px solid ${isApprove ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: 'white', padding: '16px' }
            }
        );
    };

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white">
                    {/* Header */}
                    <div className="bg-purple-900/20 border-b border-purple-500/10 p-6 flex justify-between items-start shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-400/30">
                                <FileSignature className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Backlog Review Dashboard</h1>
                                <p className="text-sm text-purple-300/60">Manage manual subject enrollment requests from students with backlogs.</p>
                                <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-white/5 rounded-md border border-white/10">
                                    <span className="text-xs text-white/40">Active Officer Routing Branch:</span>
                                    <span className="text-xs font-bold text-purple-400">{activeBranch}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pending Requests */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
                        ) : requests.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 border-2 border-dashed border-white/5 rounded-2xl p-10">
                                <CheckCircle className="w-12 h-12 mb-4 opacity-50 text-emerald-500" />
                                <h2 className="text-lg font-bold text-white/70 mb-1">All Caught Up!</h2>
                                <p>No pending backlog registrations for {activeBranch} branch.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-w-4xl mx-auto">
                                {requests.map(req => (
                                    <div key={req._id} className="bg-black/40 border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30">
                                                    {req.studentId?.studentName?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg">{req.studentId?.studentName || 'Unknown Student'}</h3>
                                                    <p className="text-blue-300 text-sm font-mono">{req.studentId?.usn || 'No USN'}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                    <p className="text-xs text-white/40 mb-2 uppercase tracking-wider font-bold">Regular Subjects ({req.regularSubjects.length})</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {req.regularSubjects.map((code: string) => (
                                                            <span key={code} className="px-2 py-1 bg-blue-500/10 text-blue-300 text-xs font-mono rounded">
                                                                {code}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                                        <p className="text-xs text-amber-500/80 uppercase tracking-wider font-bold">Requested Backlogs ({req.requestedBacklogs.length}/2)</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {req.requestedBacklogs.map((code: string) => (
                                                            <span key={code} className="px-2 py-1 bg-amber-500/20 text-amber-400 font-bold text-xs font-mono rounded border border-amber-500/30">
                                                                {code}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:w-48 shrink-0 flex flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                                            <button
                                                onClick={() => handleAction(req._id, 'APPROVED')}
                                                disabled={processingId === req._id}
                                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                            >
                                                {processingId === req._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleAction(req._id, 'REJECTED')}
                                                disabled={processingId === req._id}
                                                className="w-full py-3 bg-red-900/40 hover:bg-red-900/60 disabled:opacity-50 text-red-400 border border-red-500/30 rounded-xl transition-colors flex items-center justify-center gap-2"
                                            >
                                                {processingId === req._id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5" />}
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            }
        />
    );
}
