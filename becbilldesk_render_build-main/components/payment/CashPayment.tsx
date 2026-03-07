'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Building2, Download, CheckCircle2, AlertCircle } from 'lucide-react';

interface CashPaymentProps {
  amount: number;
  step: 'initial' | 'verification';
  isProcessing: boolean;
  onGenerateChallan: () => void;
  onVerify: (txnId: string) => void;
}

export default function CashPayment({
  amount,
  step,
  isProcessing,
  onGenerateChallan,
  onVerify
}: CashPaymentProps) {
  const [txnId, setTxnId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (txnId.trim()) {
      onVerify(txnId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="w-8 h-8 text-green-600" />
          <h3 className="text-2xl font-bold text-gray-900">
            {step === 'initial' ? 'Generate Bank Challan' : 'Verify Payment'}
          </h3>
        </div>

        {step === 'initial' ? (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-2">Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Click "Generate Challan" to download the PDF.</li>
                    <li>Take the printed Challan to any <strong>Bank of Baroda</strong> branch.</li>
                    <li>Pay <strong>₹{amount.toLocaleString()}</strong> via Cash/DD.</li>
                    <li>Collect the <strong>Transaction ID</strong> from the bank.</li>
                    <li>Return here and verify the payment.</li>
                  </ol>
                </div>
              </div>
            </div>

            <button
              onClick={onGenerateChallan}
              disabled={isProcessing}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? 'Generating...' : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate Challan PDF
                </>
              )}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Challan generated successfully! Please enter the <strong>Bank Transaction ID</strong> below after payment.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bank Transaction ID / Reference No.
              </label>
              <input
                type="text"
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                placeholder="e.g. BOB12345678"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-green-500 focus:outline-none transition-colors font-mono uppercase"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? 'Verifying...' : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Verify & Download Final Receipt
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}