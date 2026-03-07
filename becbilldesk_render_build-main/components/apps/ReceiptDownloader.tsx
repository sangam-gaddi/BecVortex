import { useState, useEffect } from 'react';
import { Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateReceipt } from '@/utils/receiptGenerator';

export default function ReceiptDownloader() {
    const [payments, setPayments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);

    useEffect(() => {
        fetchStudentAndHistory();
    }, []);

    const fetchStudentAndHistory = async () => {
        setIsLoading(true);
        try {
            // Parallel fetch
            const [studentRes, historyRes] = await Promise.all([
                fetch('/api/auth/me'),
                fetch('/api/payments/history')
            ]);

            const studentData = await studentRes.json();
            const historyData = await historyRes.json();

            if (studentData.student) setStudentData(studentData.student);
            if (historyData.payments) setPayments(historyData.payments);

        } catch (err) {
            console.error(err);
            toast.error('Failed to load receipts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (payment: any) => {
        if (!studentData) return;
        try {
            toast.loading('Generating Receipt...', { id: 'pdf-gen' });
            await generateReceipt(
                {
                    receiptNo: payment._id.substring(0, 8).toUpperCase(),
                    transactionId: payment.transactionHash || payment.bankReferenceId || payment.challanId,
                    paymentDate: new Date(payment.createdAt),
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    feeItems: [{ name: 'Consolidated Fee Payment', amount: payment.amount }], // Simplified history view
                    channel: payment.channel || 'ONLINE'
                },
                {
                    usn: studentData.usn,
                    name: studentData.studentName,
                    branch: `${studentData.department}/${studentData.semester}`,
                    degree: studentData.degree,
                    category: studentData.category
                }
            );
            toast.success('Downloaded!', { id: 'pdf-gen' });
        } catch (err) {
            toast.error('Generation failed', { id: 'pdf-gen' });
        }
    };

    return (
        <div className="h-full bg-white flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    My Receipts
                </h2>
                <button onClick={fetchStudentAndHistory} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
                {isLoading ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                ) : payments.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">No payment history found.</div>
                ) : (
                    payments.map((payment) => (
                        <div key={payment._id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                                    }`}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">₹{payment.amount.toLocaleString()}</h4>
                                    <p className="text-xs text-gray-500 uppercase">{payment.paymentMethod} • {new Date(payment.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => handleDownload(payment)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100"
                            >
                                <Download className="w-4 h-4" />
                                Download
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
