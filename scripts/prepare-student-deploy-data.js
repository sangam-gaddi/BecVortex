/*
 * Deployment cleanup script for student test data.
 *
 * What it does:
 * 1) Resets registered student auth data to "new student" state.
 * 2) Excludes one protected USN from reset.
 * 3) Clears historical BEC chat messages.
 * 4) Never touches staff accounts in the users collection.
 *
 * Usage:
 *   Dry run (default):
 *     node --env-file=.env.local scripts/prepare-student-deploy-data.js
 *
 *   Execute changes:
 *     node --env-file=.env.local scripts/prepare-student-deploy-data.js --execute
 */

const mongoose = require('mongoose');

const PROTECTED_USN = '2BA23IS083';
const SHOULD_EXECUTE = process.argv.includes('--execute');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not set. Use --env-file=.env.local or set environment variable.');
  process.exit(1);
}

const StudentSchema = new mongoose.Schema(
  {
    usn: { type: String, uppercase: true, sparse: true },
    email: { type: String, sparse: true, lowercase: true },
    password: { type: String },
    recoveryPhraseHash: { type: String },
    activeSessionId: { type: String, default: null },
    isRegistered: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
  },
  { collection: 'students', strict: false }
);

const PaymentSchema = new mongoose.Schema(
  {
    usn: { type: String, required: true },
    status: { type: String },
  },
  { collection: 'payments', strict: false }
);

const ChatMessageSchema = new mongoose.Schema({}, { collection: 'chatmessages', strict: false });

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const paidUsnDocs = await Payment.find({
    usn: { $exists: true, $ne: null },
    status: { $in: ['completed', 'pending_bank_verification'] },
  })
    .select('usn -_id')
    .lean();

  const paidUsnSet = new Set(
    paidUsnDocs
      .map((p) => String(p.usn || '').trim().toUpperCase())
      .filter(Boolean)
  );

  const studentsToReset = await Student.find({
    isRegistered: true,
    usn: {
      $nin: [PROTECTED_USN, ...paidUsnSet],
    },
  })
    .select('_id usn email isRegistered')
    .lean();

  const resetIds = studentsToReset.map((s) => s._id);
  const resetUsns = studentsToReset.map((s) => s.usn).filter(Boolean);

  const protectedExists = await Student.findOne({ usn: PROTECTED_USN })
    .select('_id usn isRegistered email')
    .lean();

  const chatMessageCount = await ChatMessage.countDocuments({});

  console.log('--- Preview ---');
  console.log(`Protected USN: ${PROTECTED_USN}`);
  console.log(`Registered students eligible for reset: ${studentsToReset.length}`);
  console.log(`Students skipped because of payment records: ${paidUsnSet.size}`);
  console.log(`Chat messages currently stored: ${chatMessageCount}`);
  console.log(`Protected student present: ${protectedExists ? 'yes' : 'no'}`);

  if (resetUsns.length > 0) {
    const sample = resetUsns.slice(0, 20);
    console.log(`Sample USNs to reset (${sample.length}/${resetUsns.length}):`, sample.join(', '));
  }

  if (!SHOULD_EXECUTE) {
    console.log('Dry run only. Re-run with --execute to apply changes.');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log('Applying cleanup...');

  const studentResetResult = await Student.updateMany(
    { _id: { $in: resetIds } },
    {
      $set: {
        isRegistered: false,
        isOnline: false,
        lastSeen: new Date(),
      },
      $unset: {
        email: '',
        password: '',
        recoveryPhraseHash: '',
        activeSessionId: '',
      },
    }
  );

  const chatDeleteResult = await ChatMessage.deleteMany({});

  console.log('--- Applied ---');
  console.log(`Students matched: ${studentResetResult.matchedCount}`);
  console.log(`Students modified: ${studentResetResult.modifiedCount}`);
  console.log(`Chat messages deleted: ${chatDeleteResult.deletedCount || 0}`);
  console.log('Staff records untouched (users collection not modified).');

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error('Cleanup failed:', err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // no-op
  }
  process.exit(1);
});
