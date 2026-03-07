"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle2, Clock, CreditCard, Receipt, User, Building, Calendar, Hash, Wallet } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { FEE_STRUCTURE, FeeType, calculateTotal } from "@/lib/data/feeStructure"

interface PaymentsProps {
    isDarkMode?: boolean
}

interface Payment {
    _id: string
    feeIds: string[]
    amount: number
    transactionHash: string
    paymentMethod: string
    createdAt: string
}

interface StudentInfo {
    usn: string
    studentName: string
    department?: string
    semester?: string
    email?: string
}

export default function Payments({ isDarkMode }: PaymentsProps) {
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [expandedFees, setExpandedFees] = useState<string[]>([])
    const [payments, setPayments] = useState<Payment[]>([])
    const [paidFeeIds, setPaidFeeIds] = useState<string[]>([])
    const [student, setStudent] = useState<StudentInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'history'>('pending')

    useEffect(() => {
        loadData()
    }, [])

    // Listen for voice agent actions
    useEffect(() => {
        const handleVoiceAction = (event: CustomEvent) => {
            const { type, payload } = event.detail
            console.log('🎤 Voice action received in Payments:', type, payload)

            switch (type) {
                case 'SELECT_FEE':
                    if (payload.feeId && !paidFeeIds.includes(payload.feeId)) {
                        setSelectedFees(prev =>
                            prev.includes(payload.feeId) ? prev : [...prev, payload.feeId]
                        )
                    }
                    break
                case 'DESELECT_FEE':
                    if (payload.feeId) {
                        setSelectedFees(prev => prev.filter(id => id !== payload.feeId))
                    }
                    break
                case 'PROCEED_TO_PAYMENT':
                    if (selectedFees.length > 0 || (payload.feeIds && payload.feeIds.length > 0)) {
                        const feeIds = payload.feeIds || selectedFees
                        window.location.href = `/payment?feeIds=${feeIds.join(',')}`
                    }
                    break
            }
        }

        window.addEventListener('voiceAction', handleVoiceAction as EventListener)
        return () => window.removeEventListener('voiceAction', handleVoiceAction as EventListener)
    }, [paidFeeIds, selectedFees])

    const loadData = async () => {
        try {
            const meResponse = await fetch('/api/auth/me')
            if (meResponse.ok) {
                const meData = await meResponse.json()
                console.log('API /api/auth/me response:', meData);
                console.log('Student paidFees from API:', meData.student?.paidFees);
                setPaidFeeIds(meData.student?.paidFees || [])
                setStudent({
                    usn: meData.student?.usn || '',
                    studentName: meData.student?.studentName || 'Student',
                    department: meData.student?.department,
                    semester: meData.student?.semester,
                    email: meData.student?.email
                })
            }

            const paymentsResponse = await fetch('/api/payments')
            if (paymentsResponse.ok) {
                const paymentsData = await paymentsResponse.json()
                setPayments(paymentsData.payments || [])
            }
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleFeeSelection = (feeId: string) => {
        if (paidFeeIds.includes(feeId)) return
        setSelectedFees(prev =>
            prev.includes(feeId)
                ? prev.filter(id => id !== feeId)
                : [...prev, feeId]
        )
    }

    const toggleFeeExpand = (feeId: string) => {
        setExpandedFees(prev =>
            prev.includes(feeId)
                ? prev.filter(id => id !== feeId)
                : [...prev, feeId]
        )
    }

    const handleProceedToPayment = () => {
        if (selectedFees.length === 0) return
        const feeIdsParam = selectedFees.join(',')
        // Navigate to payment page in same tab (exits macOS, goes to payment)
        window.location.href = `/payment?feeIds=${feeIdsParam}`
    }

    const formatRupee = (amount: number) => `₹${(amount ?? 0).toLocaleString('en-IN')}`
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    })

    const totalAmount = calculateTotal(selectedFees)
    const unpaidFees = FEE_STRUCTURE.filter(fee => !paidFeeIds.includes(fee.id))
    const paidFeesData = FEE_STRUCTURE.filter(fee => paidFeeIds.includes(fee.id))

    // macOS-style classes
    const bgPrimary = isDarkMode ? "bg-[#1e1e1e]" : "bg-[#f5f5f7]"
    const bgSecondary = isDarkMode ? "bg-[#2d2d2d]" : "bg-white"
    const bgTertiary = isDarkMode ? "bg-[#3d3d3d]" : "bg-[#f0f0f0]"
    const borderColor = isDarkMode ? "border-[#3d3d3d]" : "border-[#d1d1d6]"
    const textPrimary = isDarkMode ? "text-white" : "text-[#1d1d1f]"
    const textSecondary = isDarkMode ? "text-[#86868b]" : "text-[#6e6e73]"
    const accentBlue = "text-[#0071e3]"
    const accentGreen = "text-[#34c759]"

    if (isLoading) {
        return (
            <div className={`w-full h-full flex items-center justify-center ${bgPrimary}`}>
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                    <p className={textSecondary}>Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`w-full h-full ${bgPrimary} overflow-auto relative`}>
            {/* Header with Student Info */}
            <div className={`${bgSecondary} border-b ${borderColor} px-6 py-4`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0071e3] to-[#5856d6] flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                            {student?.studentName?.charAt(0) || 'S'}
                        </div>
                        <div>
                            <h1 className={`text-lg font-semibold ${textPrimary}`}>{student?.studentName}</h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className={`text-xs ${textSecondary} flex items-center gap-1`}>
                                    <Hash className="w-3 h-3" /> {student?.usn}
                                </span>
                                {student?.department && (
                                    <span className={`text-xs ${textSecondary} flex items-center gap-1`}>
                                        <Building className="w-3 h-3" /> {student.department}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-xs ${textSecondary} mb-1`}>Academic Year 2024-25</p>
                        <p className={`text-xs ${textSecondary}`}>{new Date().toLocaleDateString('en-IN', {
                            month: 'long', year: 'numeric'
                        })}</p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-4">
                    <div className={`${bgSecondary} rounded-xl p-4 border ${borderColor} shadow-sm`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <Clock className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <p className={`text-xs ${textSecondary} font-medium`}>Pending</p>
                                <p className={`text-xl font-bold ${textPrimary}`}>
                                    {formatRupee(unpaidFees.reduce((sum, fee) => sum + (fee.total ?? 0), 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className={`${bgSecondary} rounded-xl p-4 border ${borderColor} shadow-sm`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className={`text-xs ${textSecondary} font-medium`}>Paid</p>
                                <p className="text-xl font-bold text-green-500">
                                    {formatRupee(paidFeesData.reduce((sum, fee) => sum + (fee.total ?? 0), 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className={`${bgSecondary} rounded-xl p-4 border ${borderColor} shadow-sm`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                <Receipt className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className={`text-xs ${textSecondary} font-medium`}>Transactions</p>
                                <p className={`text-xl font-bold ${textPrimary}`}>{payments.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-6">
                <div className={`${bgSecondary} rounded-lg p-1 inline-flex gap-1 border ${borderColor}`}>
                    {(['pending', 'paid', 'history'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-[#0071e3] text-white shadow-sm'
                                : `${textSecondary} hover:${bgTertiary}`
                                }`}
                        >
                            {tab === 'pending' && `Pending (${unpaidFees.length})`}
                            {tab === 'paid' && `Paid (${paidFeesData.length})`}
                            {tab === 'history' && `History (${payments.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
                {/* Pending Fees Tab */}
                {activeTab === 'pending' && (
                    <div className={`${bgSecondary} rounded-xl border ${borderColor} overflow-hidden shadow-sm`}>
                        <div className={`px-4 py-3 border-b ${borderColor} ${bgTertiary}`}>
                            <h2 className={`text-sm font-semibold ${textPrimary}`}>Fee Invoice</h2>
                        </div>

                        {unpaidFees.length === 0 ? (
                            <div className="p-8 text-center">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                                <p className={`font-medium ${textPrimary}`}>All fees paid!</p>
                                <p className={`text-sm ${textSecondary}`}>You have no pending payments.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className={`border-b ${borderColor} ${bgTertiary}`}>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Select</th>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Fee Type</th>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Due Date</th>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Status</th>
                                        <th className={`px-4 py-2 text-right text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Amount</th>
                                        <th className={`px-4 py-2 text-center text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unpaidFees.map((fee, idx) => (
                                        <>
                                            <tr
                                                key={fee.id}
                                                className={`border-b ${borderColor} cursor-pointer transition-colors ${selectedFees.includes(fee.id)
                                                    ? isDarkMode ? 'bg-[#0071e3]/10' : 'bg-[#0071e3]/5'
                                                    : `hover:${bgTertiary}`
                                                    }`}
                                                onClick={() => toggleFeeSelection(fee.id)}
                                            >
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFees.includes(fee.id)}
                                                        onChange={() => toggleFeeSelection(fee.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-4 h-4 rounded border-gray-400 text-[#0071e3] focus:ring-[#0071e3]"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">{fee.icon}</span>
                                                        <div>
                                                            <p className={`font-medium ${textPrimary}`}>{fee.name}</p>
                                                            <p className={`text-xs ${textSecondary}`}>{fee.breakdown.length} items</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm ${textSecondary}`}>{formatDate(fee.dueDate)}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500">
                                                        <Clock className="w-3 h-3" /> Pending
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-semibold ${textPrimary}`}>
                                                    {formatRupee(fee.total ?? 0)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); toggleFeeExpand(fee.id) }}
                                                        className={`p-1.5 rounded-md ${bgTertiary} hover:bg-[#0071e3]/10 transition-colors`}
                                                    >
                                                        {expandedFees.includes(fee.id)
                                                            ? <ChevronUp className={`w-4 h-4 ${textSecondary}`} />
                                                            : <ChevronDown className={`w-4 h-4 ${textSecondary}`} />
                                                        }
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Fee Breakdown */}
                                            <AnimatePresence>
                                                {expandedFees.includes(fee.id) && (
                                                    <motion.tr
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                    >
                                                        <td colSpan={6} className={`px-4 py-0 ${bgTertiary}`}>
                                                            <motion.div
                                                                initial={{ height: 0 }}
                                                                animate={{ height: 'auto' }}
                                                                exit={{ height: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="py-3">
                                                                    <table className="w-full">
                                                                        <thead>
                                                                            <tr>
                                                                                <th className={`pb-2 text-left text-xs font-medium ${textSecondary}`}>Category</th>
                                                                                <th className={`pb-2 text-left text-xs font-medium ${textSecondary}`}>Description</th>
                                                                                <th className={`pb-2 text-right text-xs font-medium ${textSecondary}`}>Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {fee.breakdown.map((item) => (
                                                                                <tr key={item.id}>
                                                                                    <td className={`py-1.5 text-sm ${textPrimary}`}>{item.category}</td>
                                                                                    <td className={`py-1.5 text-sm ${textSecondary}`}>{item.description}</td>
                                                                                    <td className={`py-1.5 text-sm text-right font-medium ${textPrimary}`}>{formatRupee(item.amount ?? 0)}</td>
                                                                                </tr>
                                                                            ))}
                                                                            <tr className={`border-t ${borderColor}`}>
                                                                                <td colSpan={2} className={`pt-2 text-sm font-semibold ${textPrimary}`}>Subtotal</td>
                                                                                <td className={`pt-2 text-sm text-right font-bold ${textPrimary}`}>{formatRupee(fee.total ?? 0)}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </motion.div>
                                                        </td>
                                                    </motion.tr>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Paid Fees Tab */}
                {activeTab === 'paid' && (
                    <div className={`${bgSecondary} rounded-xl border ${borderColor} overflow-hidden shadow-sm`}>
                        <div className={`px-4 py-3 border-b ${borderColor} ${bgTertiary}`}>
                            <h2 className={`text-sm font-semibold ${textPrimary}`}>Paid Invoices</h2>
                        </div>

                        {paidFeesData.length === 0 ? (
                            <div className="p-8 text-center">
                                <Receipt className={`w-12 h-12 mx-auto mb-3 ${textSecondary} opacity-50`} />
                                <p className={`font-medium ${textPrimary}`}>No payments yet</p>
                                <p className={`text-sm ${textSecondary}`}>Complete a payment to see it here.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className={`border-b ${borderColor} ${bgTertiary}`}>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Fee Type</th>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Status</th>
                                        <th className={`px-4 py-2 text-right text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paidFeesData.map((fee) => (
                                        <tr key={fee.id} className={`border-b ${borderColor}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">{fee.icon}</span>
                                                    <span className={`font-medium ${textPrimary}`}>{fee.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                                    <CheckCircle2 className="w-3 h-3" /> Paid
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${accentGreen}`}>
                                                {formatRupee(fee.total ?? 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Transaction History Tab */}
                {activeTab === 'history' && (
                    <div className={`${bgSecondary} rounded-xl border ${borderColor} overflow-hidden shadow-sm`}>
                        <div className={`px-4 py-3 border-b ${borderColor} ${bgTertiary}`}>
                            <h2 className={`text-sm font-semibold ${textPrimary}`}>Transaction History</h2>
                        </div>

                        {payments.length === 0 ? (
                            <div className="p-8 text-center">
                                <Wallet className={`w-12 h-12 mx-auto mb-3 ${textSecondary} opacity-50`} />
                                <p className={`font-medium ${textPrimary}`}>No transactions</p>
                                <p className={`text-sm ${textSecondary}`}>Your transaction history will appear here.</p>
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className={`border-b ${borderColor} ${bgTertiary}`}>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Date</th>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Description</th>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Method</th>
                                        <th className={`px-4 py-2 text-left text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Transaction ID</th>
                                        <th className={`px-4 py-2 text-right text-xs font-semibold ${textSecondary} uppercase tracking-wider`}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((payment) => (
                                        <tr key={payment._id} className={`border-b ${borderColor} hover:${bgTertiary}`}>
                                            <td className="px-4 py-3">
                                                <span className={`text-sm ${textSecondary}`}>
                                                    {formatDate(payment.createdAt)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className={`text-sm font-medium ${textPrimary}`}>
                                                    {payment.feeIds.map(id => FEE_STRUCTURE.find(f => f.id === id)?.name).filter(Boolean).join(', ') || 'Fee Payment'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${bgTertiary} ${textPrimary}`}>
                                                    <CreditCard className="w-3 h-3" />
                                                    {payment.paymentMethod?.toUpperCase() || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <a
                                                    href={`https://sepolia.etherscan.io/tx/${payment.transactionHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`text-xs ${accentBlue} hover:underline flex items-center gap-1`}
                                                >
                                                    {payment.transactionHash?.slice(0, 10)}...
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${accentGreen}`}>
                                                {formatRupee(payment.amount ?? 0)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Payment Summary */}
            <AnimatePresence>
                {selectedFees.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        className="absolute bottom-4 right-4 z-40"
                    >
                        <div className={`${bgSecondary} rounded-2xl px-6 py-4 shadow-2xl border ${borderColor} flex items-center gap-6`}>
                            <div>
                                <p className={`text-xs ${textSecondary} font-medium`}>{selectedFees.length} item(s) selected</p>
                                <p className={`text-2xl font-bold ${textPrimary}`}>{formatRupee(totalAmount)}</p>
                            </div>
                            <button
                                onClick={handleProceedToPayment}
                                className="bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
                            >
                                Pay Now
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
