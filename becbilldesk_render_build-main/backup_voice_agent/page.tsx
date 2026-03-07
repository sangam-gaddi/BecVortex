'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import LiveClock from '@/components/LiveClock';
import UPIPayment from '@/components/payment/UPIPayment';
import NetBanking from '@/components/payment/NetBanking';
import CashPayment from '@/components/payment/CashPayment';
import CryptoPayment from '@/components/payment/CryptoPayment';
import { PaymentProviders } from '@/components/providers/PaymentProviders';
import { getFeeById, calculateTotal } from '@/lib/data/feeStructure';
import toast from 'react-hot-toast';

const paymentMethods = [
  { id: 'crypto', name: ' Crypto', icon: '', color: 'from-purple-600 to-pink-600' },
  { id: 'upi', name: ' UPI', icon: '₹', color: 'from-purple-600 to-blue-600' },
  { id: 'netbanking', name: ' Net Banking', icon: '', color: 'from-blue-600 to-indigo-600' },
  { id: 'cash', name: ' Cash', icon: '', color: 'from-green-600 to-emerald-600' },
];

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feeIdsParam = searchParams?.get('feeIds');

  const [currentMethod, setCurrentMethod] = useState(0);
  const [feeIds, setFeeIds] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [feeNames, setFeeNames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cash Workflow State
  const [cashStep, setCashStep] = useState<'initial' | 'verification'>('initial');
  const [currentPaymentId, setCurrentPaymentId] = useState<string>('');
  const [studentData, setStudentData] = useState<any>(null);

  useEffect(() => {
    // Fetch user details for receipts
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.student) setStudentData(data.student);
      })
      .catch(err => console.error("Failed to fetch student details", err));

    if (feeIdsParam) {
      const ids = feeIdsParam.split(',');
      setFeeIds(ids);

      const total = calculateTotal(ids);
      setTotalAmount(total);

      const names = ids.map(id => getFeeById(id)?.name || '').filter(Boolean);
      setFeeNames(names);
    }
  }, [feeIdsParam]);

  // General handler for Crypto/UPI/NetBanking (Online)
  const handleOnlinePaymentSuccess = async (transactionId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    toast.loading('Verifying payment...', { id: 'payment-verify' });

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeIds,
          amount: totalAmount,
          transactionHash: transactionId,
          paymentMethod: paymentMethods[currentMethod].id,
          channel: 'ONLINE'
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Payment update failed');

      // Generate Receipt
      if (studentData) {
        const { generateReceipt } = await import('@/utils/receiptGenerator'); // Dynamic Import Fixed
        await generateReceipt(
          {
            receiptNo: data.payment._id.substring(0, 8).toUpperCase(),
            transactionId: transactionId,
            paymentDate: new Date(),
            amount: totalAmount,
            paymentMethod: paymentMethods[currentMethod].id,
            feeItems: feeNames.map(name => ({ name, amount: totalAmount / feeNames.length })), // Approximation if breakdown not available here
            channel: 'ONLINE'
          },
          {
            usn: studentData.usn,
            name: studentData.studentName,
            branch: studentData.department, // + Sem?
            degree: studentData.degree,
            category: studentData.category
          }
        );
      }

      toast.success('Payment verified! Receipt downloading...', { id: 'payment-verify', duration: 3000 });
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message, { id: 'payment-verify' });
      setIsProcessing(false);
    }
  };

  // --- Cash Workflow Handlers ---

  const handleGenerateChallan = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeIds,
          amount: totalAmount,
          paymentMethod: 'cash',
          channel: 'CASH'
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCurrentPaymentId(data.payment._id);

      // Generate Challan PDF
      if (studentData) {
        // Import dynamically to avoid SSR issues if any (though this is client component)
        const { generateReceipt } = await import('@/utils/receiptGenerator');
        generateReceipt(
          {
            receiptNo: data.payment.challanId,
            transactionId: 'PENDING (CHALLAN)',
            paymentDate: new Date(),
            amount: totalAmount,
            paymentMethod: 'cash',
            feeItems: feeNames.map(name => ({ name, amount: totalAmount / feeNames.length })),
            channel: 'CASH'
          },
          {
            usn: studentData.usn,
            name: studentData.studentName,
            branch: `${studentData.department}/${studentData.semester}`,
            degree: studentData.degree,
            category: studentData.category
          }
        );
      }

      setCashStep('verification');
      toast.success('Challan generated! Please pay at bank.');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyCash = async (txnId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: currentPaymentId,
          bankReferenceId: txnId
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Generate Final Receipt
      if (studentData) {
        const { generateReceipt } = await import('@/utils/receiptGenerator');
        generateReceipt(
          {
            receiptNo: data.payment._id.substring(0, 8).toUpperCase(),
            transactionId: txnId,
            paymentDate: new Date(),
            amount: totalAmount,
            paymentMethod: 'cash',
            feeItems: feeNames.map(name => ({ name, amount: totalAmount / feeNames.length })),
            channel: 'CASH'
          },
          {
            usn: studentData.usn,
            name: studentData.studentName,
            branch: `${studentData.department}/${studentData.semester}`,
            degree: studentData.degree,
            category: studentData.category
          }
        );
      }

      toast.success('Payment Verified! Receipt downloading...');
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      toast.error(err.message);
      setIsProcessing(false);
    }
  };

  const renderPaymentMethod = () => {
    const method = paymentMethods[currentMethod];

    switch (method.id) {
      case 'upi':
        return <UPIPayment amount={totalAmount} onSuccess={handleOnlinePaymentSuccess} />;
      case 'netbanking':
        return <NetBanking amount={totalAmount} onSuccess={handleOnlinePaymentSuccess} />;
      case 'cash':
        return (
          <CashPayment
            amount={totalAmount}
            step={cashStep}
            isProcessing={isProcessing}
            onGenerateChallan={handleGenerateChallan}
            onVerify={handleVerifyCash}
          />
        );
      case 'crypto':
        return <CryptoPayment amount={totalAmount} onSuccess={handleOnlinePaymentSuccess} />;
      default:
        return null;
    }
  };
  // ... existing UI return ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-semibold">Back to Dashboard</span>
            </button>

            <LiveClock />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Fee Details */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {feeNames.length === 1 ? feeNames[0] : `${feeNames.length} Fee Payments`}
              </h1>
              {feeNames.length > 1 && (
                <p className="text-gray-600 mb-2">
                  {feeNames.join(' + ')}
                </p>
              )}
              <p className="text-gray-600">Complete your payment securely</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Total Amount</p>
              <p className="text-4xl font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
              {paymentMethods[currentMethod].id === 'crypto' && (
                <p className="text-xs text-gray-500 mt-1">0.0001 ETH (Sepolia Testnet)</p>
              )}
              {paymentMethods[currentMethod].id === 'cash' && (
                <p className="text-xs text-green-600 mt-1 font-semibold">Pay at Bank Counter</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Payment Method Slider */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMethod}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            {renderPaymentMethod()}
          </motion.div>
        </AnimatePresence>

        {/* Method Selector */}
        <div className="mt-8 flex justify-center">
          <div className="bg-white rounded-full p-2 shadow-lg border border-gray-200 inline-flex gap-2 flex-wrap">
            {paymentMethods.map((method, index) => (
              <button
                key={method.id}
                onClick={() => !isProcessing && setCurrentMethod(index)}
                disabled={isProcessing}
                className={`relative px-6 py-3 rounded-full font-semibold transition-all disabled:opacity-50 ${currentMethod === index
                  ? 'bg-gradient-to-r ' + method.color + ' text-white shadow-lg scale-110'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <span className="text-lg mr-2">{method.icon}</span>
                {method.name}
                {currentMethod === index && (
                  <motion.div
                    layoutId="activeMethod"
                    className="absolute inset-0 bg-gradient-to-r opacity-20 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="mt-6 flex justify-center gap-2">
          {paymentMethods.map((_, index) => (
            <button
              key={index}
              onClick={() => !isProcessing && setCurrentMethod(index)}
              disabled={isProcessing}
              className={`w-2 h-2 rounded-full transition-all ${currentMethod === index ? 'bg-gray-900 w-8' : 'bg-gray-300'
                }`}
            />
          ))}
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6"
        >
          <p className="text-sm text-blue-900">
            {paymentMethods[currentMethod].id === 'crypto' ? (
              <><strong>Note:</strong> For testing purposes, all payments use 0.0001 Sepolia ETH on the testnet.</>
            ) : (
              <><strong>Secure Payment:</strong> Your transaction is encrypted and secure.</>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <PaymentProviders>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="three-body">
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
          </div>
        </div>
      }>
        <PaymentContent />
      </Suspense>
    </PaymentProviders>
  );
}