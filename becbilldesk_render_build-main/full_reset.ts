
import fs from 'fs';
import path from 'path';

async function fullReset() {
    // 1. Load Environment Variables First
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envFile = fs.readFileSync(envPath, 'utf8');
            envFile.split('\n').forEach(line => {
                const parts = line.split('=');
                const key = parts[0]?.trim();
                const value = parts.slice(1).join('=').trim();
                if (key && value && !key.startsWith('#')) {
                    const cleanValue = value.replace(/^"(.*)"$/, '$1');
                    process.env[key] = cleanValue;
                }
            });
            console.log('✅ .env.local loaded.');
        }
    } catch (e) {
        console.log('Could not load .env.local', e);
    }

    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI not found");
        process.exit(1);
    }

    const { connectToDatabase } = await import('@/database/mongoose');
    await connectToDatabase();

    const { default: Student } = await import('@/database/models/Student');
    const { default: Payment } = await import('@/database/models/Payment');

    console.log('\n🗑️ FULL RESET - Starting...\n');

    // Step 1: Delete all Payment records
    console.log('Step 1: Deleting all Payment records...');
    const paymentResult = await Payment.deleteMany({});
    console.log(`   ✅ Deleted ${paymentResult.deletedCount} payment records.`);

    // Step 2: Reset all students' paidFees to empty array
    console.log('Step 2: Resetting all students\' paidFees to []...');
    const studentResult = await Student.updateMany(
        {}, // Match all students
        { $set: { paidFees: [] } }
    );
    console.log(`   ✅ Updated ${studentResult.modifiedCount} student records.`);

    console.log('\n🎉 FULL RESET COMPLETE!');
    console.log('   - All payment history deleted.');
    console.log('   - All students now have paidFees: []');
    console.log('   - Users will see all fees as "Pending" again.\n');

    process.exit(0);
}

fullReset().catch(e => {
    console.error(e);
    process.exit(1);
});
