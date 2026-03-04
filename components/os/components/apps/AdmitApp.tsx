"use client";

import { useState, useEffect } from "react";
import { AppTemplate } from "./AppTemplate";
import { useI18n } from "@/components/os/i18n/index";
import { registerStudent, type AdmissionData } from "@/lib/actions/admission.actions";
import {
    ShieldAlert,
    GraduationCap,
    User,
    FileText,
    BookOpen,
    CheckCircle,
    AlertCircle,
    Loader2,
    ChevronRight,
    ChevronLeft
} from "lucide-react";
import { ACADEMIC_DEPARTMENTS, DEPARTMENT_LABELS } from "@/lib/auth/rbac-constants";

interface AdmitAppProps {
    owner?: string;
    userRole?: string;
    userDepartment?: string;
    onClose?: () => void;
}

export function AdmitApp({ owner, userRole, userDepartment, onClose }: AdmitAppProps) {
    const { t } = useI18n();
    const [activeStep, setActiveStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; csn?: string; usn?: string } | null>(null);

    // We need to reliably get the role/dept, so try props first, then sessionStorage
    const [activeRole, setActiveRole] = useState(userRole);
    const [activeDept, setActiveDept] = useState(userDepartment);

    useEffect(() => {
        if (!activeRole && typeof window !== 'undefined') {
            setActiveRole(sessionStorage.getItem('bec-vortex-role') || undefined);
        }
        if (!activeDept && typeof window !== 'undefined') {
            setActiveDept(sessionStorage.getItem('bec-vortex-department') || undefined);
        }
    }, [activeRole, activeDept]);

    const [formData, setFormData] = useState<AdmissionData>({
        studentName: "",
        email: "",
        phone: "",
        permanentAddress: "",
        department: "",
        semester: "1",
        degree: "B.E.",
        stdType: "Regular",
        casteCat: "General",
        entryType: "Regular 1st Year",
        paymentCategory: "KCET",
        entranceExamRank: "",
        previousCollegeName: "",
        previousMarks: "",
    });

    // Access Control: Only ADMISSION department Officers are permitted.
    if (activeRole !== "OFFICER" || activeDept !== "ADMISSION") {
        return (
            <AppTemplate
                hasSidebar={false}
                content={
                    <div className="flex items-center justify-center h-full text-white bg-black/50 backdrop-blur-md">
                        <div className="text-center max-w-md p-8 bg-red-950/30 border border-red-500/20 rounded-2xl">
                            <ShieldAlert className="w-20 h-20 mx-auto mb-6 text-red-500 opacity-80" />
                            <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
                            <p className="text-white/60 mb-6 leading-relaxed">
                                This terminal is secured for the <strong>Admissions Department</strong> only.
                                Your current credentials ({activeRole} - {activeDept || 'No Department'}) do not grant access to student onboarding systems.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors border border-red-500/30"
                            >
                                Close Connection
                            </button>
                        </div>
                    </div>
                }
            />
        );
    }

    // Handle derived fields based on user selection
    const handleEntryTypeChange = (val: string) => {
        let newSemester = "1";
        if (val.includes("Lateral")) newSemester = "3";

        setFormData(prev => ({
            ...prev,
            entryType: val as AdmissionData['entryType'],
            semester: newSemester
        }));
    };

    const handleNext = () => setActiveStep(prev => Math.min(prev + 1, 3));
    const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = async () => {
        if (!formData.studentName || !formData.department) {
            setResult({ success: false, message: "Name and Branch are required." });
            return;
        }

        setIsSubmitting(true);
        setResult(null);

        try {
            const response = await registerStudent(formData);
            if (response.success) {
                setResult({ success: true, message: response.message, csn: response.csn, usn: response.usn });
                // Optional: clear form
                setFormData({
                    studentName: "", email: "", phone: "", permanentAddress: "", department: "",
                    semester: "1", degree: "B.E.", stdType: "Regular", casteCat: "General",
                    entryType: "Regular 1st Year", paymentCategory: "KCET", entranceExamRank: "",
                    previousCollegeName: "", previousMarks: "",
                });
            } else {
                setResult({ success: false, message: response.error || 'Registration failed.' });
            }
        } catch (err: any) {
            setResult({ success: false, message: 'Network error occurred during admission.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AppTemplate
            hasSidebar={false}
            content={
                <div className="h-full flex flex-col bg-[#0f111a] text-white">
                    {/* Header */}
                    <div className="bg-blue-900/20 border-b border-white/5 p-6 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                <GraduationCap className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Admissions Portal</h1>
                                <p className="text-sm text-blue-300/60">BEC Regulations 2024-25</p>
                            </div>
                        </div>

                        {/* Steps Indicator */}
                        <div className="flex items-center gap-3">
                            {[
                                { num: 1, icon: User, label: "Personal" },
                                { num: 2, icon: BookOpen, label: "Admission" },
                                { num: 3, icon: FileText, label: "Academic" }
                            ].map((step) => (
                                <div key={step.num} className="flex items-center gap-2">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${activeStep === step.num
                                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                                        : activeStep > step.num
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            : 'bg-white/5 border-white/10 text-white/40'
                                        }`}>
                                        <step.icon className={`w-4 h-4 ${activeStep > step.num ? 'text-emerald-400' : ''}`} />
                                        <span className="hidden sm:inline">{step.label}</span>
                                    </div>
                                    {step.num !== 3 && <div className="w-4 h-[1px] bg-white/10" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form Content Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-8 border-b border-light/5">
                        <div className="max-w-3xl mx-auto space-y-8">

                            {/* Step 1: Personal Info */}
                            {activeStep === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 mb-6">Personal Details</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-sm text-white/60">Full Name *</label>
                                            <input
                                                type="text" value={formData.studentName} onChange={e => setFormData({ ...formData, studentName: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="As per 10th marks card"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm text-white/60">Email Address</label>
                                            <input
                                                type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="student@example.com"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm text-white/60">Phone Number</label>
                                            <input
                                                type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="+91"
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-sm text-white/60">Permanent Address</label>
                                            <textarea
                                                value={formData.permanentAddress} onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors resize-none h-24"
                                                placeholder="Full residential address"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm text-white/60">Caste Category</label>
                                            <select
                                                value={formData.casteCat} onChange={e => setFormData({ ...formData, casteCat: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors [&>option]:bg-gray-900"
                                            >
                                                {['General', 'SC', 'ST', 'OBC', 'Differently abled', 'Defense Personnel'].map(cat =>
                                                    <option key={cat} value={cat}>{cat}</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Admission Info */}
                            {activeStep === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 mb-6">Admission Allotment</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-sm text-white/60">Assigned Branch (Department) *</label>
                                            <select
                                                value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                                                className="w-full bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition-colors [&>option]:bg-gray-900 text-blue-100 font-medium"
                                            >
                                                <option value="">-- Select Branch --</option>
                                                {ACADEMIC_DEPARTMENTS.map(dept =>
                                                    <option key={dept} value={dept}>{dept} - {DEPARTMENT_LABELS[dept as keyof typeof DEPARTMENT_LABELS]}</option>
                                                )}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm text-white/60">Entry Type</label>
                                            <select
                                                value={formData.entryType} onChange={e => handleEntryTypeChange(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors [&>option]:bg-gray-900"
                                            >
                                                <option value="Regular 1st Year">Regular 1st Year</option>
                                                <option value="Lateral Entry - Diploma">Lateral Entry - Diploma</option>
                                                <option value="Lateral Entry - B.Sc.">Lateral Entry - B.Sc.</option>
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm text-white/60">Assigned Semester</label>
                                            <div className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white/50 cursor-not-allowed">
                                                Semester {formData.semester}
                                            </div>
                                            <p className="text-xs text-blue-300/50 mt-1">Auto-assigned by Entry Type</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm text-white/60">Payment / Quota</label>
                                            <select
                                                value={formData.paymentCategory} onChange={e => setFormData({ ...formData, paymentCategory: e.target.value as any })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors [&>option]:bg-gray-900"
                                            >
                                                {['KCET', 'COMEDK', 'Management', 'NRI'].map(cat =>
                                                    <option key={cat} value={cat}>{cat}</option>
                                                )}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm text-white/60">Entrance Exam Rank / Score</label>
                                            <input
                                                type="text" value={formData.entranceExamRank} onChange={e => setFormData({ ...formData, entranceExamRank: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder={formData.paymentCategory === 'Management' ? 'N/A' : 'Enter Rank'}
                                                disabled={formData.paymentCategory === 'Management' || formData.paymentCategory === 'NRI'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Academic History */}
                            {activeStep === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-lg font-semibold text-white/90 border-b border-white/10 pb-2 mb-6">Academic History</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-sm text-white/60">
                                                {formData.entryType.includes('Lateral') ? 'Previous College (Diploma/B.Sc)' : 'Previous College (12th / PUC)'}
                                            </label>
                                            <input
                                                type="text" value={formData.previousCollegeName} onChange={e => setFormData({ ...formData, previousCollegeName: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="Institution Name"
                                            />
                                        </div>
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-sm text-white/60">Percentage / Marks</label>
                                            <input
                                                type="text" value={formData.previousMarks} onChange={e => setFormData({ ...formData, previousMarks: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="e.g. 85.5% or 500/600"
                                            />
                                        </div>
                                    </div>

                                    {/* Submit Feedback */}
                                    {result && (
                                        <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 border ${result.success
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                            : 'bg-red-500/10 border-red-500/20 text-red-300'
                                            }`}>
                                            {result.success ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                                            <div className="w-full">
                                                <p className="font-medium">{result.message}</p>
                                                {(result.csn || result.usn) && (
                                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {result.usn && (
                                                            <div className="p-3 bg-emerald-950/50 rounded-lg border border-emerald-500/20">
                                                                <p className="text-xs text-emerald-400/80 mb-1">VTU Reference (USN)</p>
                                                                <p className="text-xl font-mono text-white tracking-widest">{result.usn}</p>
                                                            </div>
                                                        )}
                                                        {result.csn && (
                                                            <div className="p-3 bg-emerald-950/50 rounded-lg border border-emerald-500/20">
                                                                <p className="text-xs text-emerald-400/80 mb-1">Internal Tracking (CSN)</p>
                                                                <p className="text-xl font-mono text-white tracking-widest">{result.csn}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Static Bottom Navigation Bar */}
                    <div className="p-6 bg-black/20 shrink-0 border-t border-white/5">
                        <div className="max-w-3xl mx-auto flex items-center justify-between">
                            {activeStep > 1 ? (
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl transition-colors border border-white/10 flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                            ) : <div />}

                            {activeStep < 3 ? (
                                <button
                                    onClick={handleNext}
                                    className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] flex items-center gap-2 font-medium"
                                >
                                    Continue <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || !formData.studentName || !formData.department}
                                    className="px-8 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:opacity-50 flex items-center gap-2 font-medium"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                    ) : (
                                        <><ShieldAlert className="w-4 h-4" /> Confirm Admission</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            }
        />
    );
}
