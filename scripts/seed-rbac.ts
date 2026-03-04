/**
 * Seed script for RBAC system.
 * Creates the MASTER account and a test PRINCIPAL account.
 *
 * Usage: node --env-file=.env.local node_modules/.bin/tsx scripts/seed-rbac.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env.local');
    process.exit(1);
}

// Inline User schema to avoid path alias issues with tsx
const UserSchema = new mongoose.Schema(
    {
        username: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        fullName: { type: String, required: true, trim: true },
        email: { type: String, sparse: true, lowercase: true, trim: true },
        role: { type: String, required: true, enum: ['MASTER', 'PRINCIPAL', 'HOD', 'OFFICER', 'FACULTY'] },
        department: { type: String, default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        isActive: { type: Boolean, default: true },
        profilePicture: { type: String, default: null },
    },
    { timestamps: true, collection: 'users' }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    // ── 1. MASTER Account ──
    const masterExists = await User.findOne({ username: 'becvortex', role: 'MASTER' });
    if (masterExists) {
        console.log('⏭️  MASTER account "becvortex" already exists, skipping.');
    } else {
        const hashedMasterPass = await bcrypt.hash('becvortex', 10);
        await User.create({
            username: 'becvortex',
            password: hashedMasterPass,
            fullName: 'BEC Vortex Master',
            role: 'MASTER',
            isActive: true,
        });
        console.log('✅ MASTER account created: becvortex / becvortex');
    }

    // ── 2. Test PRINCIPAL Account ──
    const principalExists = await User.findOne({ username: 'principal', role: 'PRINCIPAL' });
    if (principalExists) {
        console.log('⏭️  PRINCIPAL account "principal" already exists, skipping.');
    } else {
        const master = await User.findOne({ username: 'becvortex', role: 'MASTER' });
        const hashedPrincipalPass = await bcrypt.hash('principal123', 10);
        await User.create({
            username: 'principal',
            password: hashedPrincipalPass,
            fullName: 'Dr. Test Principal',
            email: 'principal@bec.edu',
            role: 'PRINCIPAL',
            createdBy: master?._id || undefined,
            isActive: true,
        });
        console.log('✅ PRINCIPAL account created: principal / principal123');
    }

    console.log('\n🎉 Seed complete!');
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
