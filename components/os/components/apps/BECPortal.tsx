"use client";
import { useState, useEffect } from 'react';

interface StudentInfo {
    usn: string; studentName: string; department: string; semester: string;
    degree: string; stdType: string; casteCat: string; email?: string;
    paidFees: string[]; paymentCategory: string;
}

export function BECPortal() {
    const [view, setView] = useState<'login' | 'signup' | 'dashboard'>('login');
    const [student, setStudent] = useState<StudentInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    const API_BASE = typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:3001` : '';

    useEffect(() => { checkAuth(); }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setStudent(data.student);
                setView('dashboard');
            }
        } catch (err) { /* not logged in */ }
        finally { setIsLoading(false); }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usn: loginUsn.toUpperCase(), password: loginPassword }),
            });
            const data = await res.json();
            if (res.ok) { setStudent(data.student); setView('dashboard'); }
            else setLoginError(data.error || 'Login failed');
        } catch (err) { setLoginError('Connection error'); }
    };

    const verifyUsn = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/verify-usn`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usn: signupUsn.toUpperCase() }),
            });
            const data = await res.json();
            if (res.ok && data.student) {
                setUsnVerified(true);
                setStudentPreview({ studentName: data.student.studentName, department: data.student.department });
                setSignupError('');
            } else {
                setSignupError(data.error || 'USN not found in database');
            }
        } catch (err) { setSignupError('Verification failed'); }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSignupError('');
        try {
            const res = await fetch(`${API_BASE}/api/auth/signup`, {
                method: 'POST', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usn: signupUsn.toUpperCase(), email: signupEmail, password: signupPassword }),
            });
            const data = await res.json();
            if (res.ok) { setStudent(data.student); setView('dashboard'); }
            else setSignupError(data.error || 'Signup failed');
        } catch (err) { setSignupError('Connection error'); }
    };

    const handleLogout = async () => {
        try { await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch { }
        setStudent(null); setView('login');
    };

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#1e1e1e]">
                <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // ── Login View ──
    if (view === 'login') {
        return (
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
                        <input type="text" placeholder="USN (e.g., 2BK22CS001)" value={loginUsn}
                            onChange={e => setLoginUsn(e.target.value)}
                            className="w-full bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
                        <input type="password" placeholder="Password" value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            className="w-full bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
                        {loginError && <p className="text-red-400 text-xs">{loginError}</p>}
                        <button type="submit"
                            className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                            Sign In
                        </button>
                    </form>

                    <p className="text-center text-xs text-[#86868b]">
                        New student?{' '}
                        <button onClick={() => setView('signup')} className="text-[#0071e3] hover:underline">Create account</button>
                    </p>
                </div>
            </div>
        );
    }

    // ── Signup View ──
    if (view === 'signup') {
        return (
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
                            <button onClick={verifyUsn}
                                className="px-3 py-2.5 bg-[#3d3d3d] text-white rounded-lg text-xs hover:bg-[#4d4d4d] transition-colors">
                                Verify
                            </button>
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
                                <input type="email" placeholder="Email" value={signupEmail}
                                    onChange={e => setSignupEmail(e.target.value)}
                                    className="w-full bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
                                <input type="password" placeholder="Create Password" value={signupPassword}
                                    onChange={e => setSignupPassword(e.target.value)}
                                    className="w-full bg-[#2d2d2d] text-white px-4 py-2.5 rounded-lg text-sm border border-[#3d3d3d] focus:border-[#0071e3] focus:outline-none" />
                                <button type="submit"
                                    className="w-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
                                    Create Account
                                </button>
                            </form>
                        )}

                        {signupError && <p className="text-red-400 text-xs">{signupError}</p>}
                    </div>

                    <p className="text-center text-xs text-[#86868b]">
                        Already registered?{' '}
                        <button onClick={() => setView('login')} className="text-[#0071e3] hover:underline">Sign in</button>
                    </p>
                </div>
            </div>
        );
    }

    // ── Dashboard View ──
    return (
        <div className="w-full h-full bg-[#1e1e1e] overflow-auto">
            {/* Header */}
            <div className="bg-[#2d2d2d] border-b border-[#3d3d3d] px-5 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {student?.studentName?.charAt(0) || 'S'}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">{student?.studentName}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-[#86868b]">#{student?.usn}</span>
                                <span className="text-xs px-1.5 py-0.5 bg-[#3d3d3d] rounded text-white">{student?.department}</span>
                                <span className="text-xs text-[#86868b]">Sem {student?.semester}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout}
                        className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 rounded-lg hover:bg-red-400/10 transition-colors">
                        Logout
                    </button>
                </div>
            </div>

            {/* Student Details Grid */}
            <div className="p-5 space-y-4">
                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: 'Degree', value: student?.degree || 'B.E.', icon: '🎓' },
                        { label: 'Payment Category', value: student?.paymentCategory || 'KCET', icon: '💰' },
                        { label: 'Student Type', value: student?.stdType || 'Regular', icon: '📋' },
                        { label: 'Caste Category', value: student?.casteCat || 'General', icon: '📄' },
                    ].map((item, i) => (
                        <div key={i} className="bg-[#2d2d2d] rounded-xl p-3 border border-[#3d3d3d]">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{item.icon}</span>
                                <div>
                                    <p className="text-xs text-[#86868b]">{item.label}</p>
                                    <p className="text-sm font-medium text-white">{item.value}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Fee Status */}
                <div className="bg-[#2d2d2d] rounded-xl border border-[#3d3d3d] overflow-hidden">
                    <div className="px-4 py-2 border-b border-[#3d3d3d] bg-[#3d3d3d]/50">
                        <h2 className="text-xs font-semibold text-white uppercase tracking-wider">Fee Payment Status</h2>
                    </div>
                    <div className="divide-y divide-[#3d3d3d]">
                        {(['tuition', 'development', 'hostel', 'examination']).map(feeId => {
                            const isPaid = student?.paidFees?.includes(feeId);
                            const names: Record<string, string> = { tuition: 'Tuition Fee', development: 'Development Fee', hostel: 'Hostel Fee', examination: 'Examination Fee' };
                            const icons: Record<string, string> = { tuition: '📚', development: '🏗️', hostel: '🏠', examination: '📝' };
                            const amounts: Record<string, number> = { tuition: 75000, development: 15000, hostel: 45000, examination: 5000 };
                            return (
                                <div key={feeId} className="flex items-center px-4 py-3">
                                    <span className="text-lg mr-3">{icons[feeId]}</span>
                                    <span className="flex-1 text-sm text-white">{names[feeId]}</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isPaid ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                                        }`}>
                                        {isPaid ? '✓ Paid' : '⏳ Pending'}
                                    </span>
                                    <span className={`ml-3 font-semibold text-sm ${isPaid ? 'text-green-400' : 'text-white'}`}>
                                        ₹{amounts[feeId]?.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Info */}
                {student?.email && (
                    <div className="bg-[#2d2d2d] rounded-xl p-3 border border-[#3d3d3d]">
                        <p className="text-xs text-[#86868b]">Registered Email</p>
                        <p className="text-sm text-white">{student.email}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
