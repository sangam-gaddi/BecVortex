import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  usn: {
    type: String,
    required: true,
    index: true,
  },
  feeIds: [{
    type: String,
    required: true,
  }],
  amount: {
    type: Number,
    required: true,
  },
  transactionHash: {
    type: String,
    required: false, // Not required for "CASH" (initially) or pending states
    unique: true,
    sparse: true, // Allows multiple null/undefined values
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['crypto', 'upi', 'netbanking', 'cash'],
  },
  channel: {
    type: String, // 'ONLINE' or 'CASH'
    enum: ['ONLINE', 'CASH'],
    default: 'ONLINE',
  },
  challanId: {
    type: String, // Generated for Cash payments
    sparse: true,
    unique: true,
  },
  bankReferenceId: {
    type: String, // Entered by user after bank deposit
    sparse: true,
  },
  receiptData: {
    type: String, // Stringified JSON of receipt details (snapshot)
    required: false,
  },
  status: {
    type: String,
    default: 'completed',
    enum: ['pending', 'completed', 'failed', 'pending_bank_verification'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

export default Payment;