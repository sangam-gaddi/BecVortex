import { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionVerifier() {
    const [txnId, setTxnId] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txnId.trim()) return;

        setIsSearching(true);
        setResult(null);

        try {
            const res = await fetch('/api/payments/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: txnId.trim() })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Verification failed');

            setResult(data.data);
            toast.success('Transaction found!');
        } catch (err: any) {
            toast.error(err.message);
            setResult({ notFound: true });
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col p-6">
            <div className="max-w-md mx-auto w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Transaction Verifier</h2>
                    <p className="text-gray-500 mt-2">Verify any payment status instantly</p>
                </div>

                <form onSubmit={handleVerify} className="relative">
                    <input
                        type="text"
                        className="w-full px-5 py-4 pl-12 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder="Enter Transaction ID / Ref No."
                        value={txnId}
                        onChange={(e) => setTxnId(e.target.value)}
                        disabled={isSearching}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
                    </button>
                </form>

                {result && !result.notFound && (
                    <div className={`p-6 rounded-2xl border-2 ${result.status === 'completed' ? 'bg-green-50 border-green-200' :
                            result.status === 'pending_bank_verification' ? 'bg-amber-50 border-amber-200' :
                                'bg-red-50 border-red-200'
                        }`}>
                        <div className="flex items-center gap-3 mb-4">
                            {result.status === 'completed' ? <CheckCircle className="w-8 h-8 text-green-600" /> : <Loader2 className="w-8 h-8 text-amber-600" />}
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">
                                    {result.status === 'completed' ? 'Payment Successful' : 'Verification Pending'}
                                </h3>
                                <p className="text-sm text-gray-600">{new Date(result.date).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-3 border-t border-gray-200/50 pt-4">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Student Name</span>
                                <span className="font-semibold">{result.studentName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount Paid</span>
                                <span className="font-semibold text-green-700">₹{result.amount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Method</span>
                                <span className="uppercase badge bg-gray-200 px-2 rounded font-medium text-xs py-0.5">{result.method}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/50 p-2 rounded">
                                <span className="text-xs text-gray-500 font-mono overflow-hidden text-ellipsis max-w-[200px]">{result.refId}</span>
                                <Copy className="w-3 h-3 text-gray-400 cursor-pointer" onClick={() => { navigator.clipboard.writeText(result.refId); toast.success('Copied') }} />
                            </div>
                        </div>
                    </div>
                )}

                {result?.notFound && (
                    <div className="p-6 rounded-2xl bg-red-50 border-2 border-red-200 text-center text-red-800">
                        <XCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
                        <p className="font-bold">Transaction Not Found</p>
                        <p className="text-sm">Please check the ID and try again.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
