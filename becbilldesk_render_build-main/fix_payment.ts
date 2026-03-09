
import fs from 'fs';
import path from 'path';

async function fixPayment() {
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
                    const cleanValue = value.replace(/^"(.*)"$/, '$1'); // removing quotes
                    process.env[key] = cleanValue;
                }
            });
            console.log('✅ .env.local loaded.');
        } else {
            console.log('⚠️ .env.local not found.');
        }
    } catch (e) {
        console.log('Could not load .env.local', e);
    }

    if (!process.env.MONGODB_URI) {
        console.error("❌ MONGODB_URI not found in process.env");
        return;
    }

    // 2. Dynamic Import Modules (After Env Load)
    console.log('Connecting to DB...');
    const { connectToDatabase } = await import('@/database/mongoose');
    await connectToDatabase();

    const { default: Payment } = await import('@/database/models/Payment');
    const { default: Student } = await import('@/database/models/Student');

    // 3. Perform Logic
    const partialId = "695AB2F4".toLowerCase();
    console.log(`Searching for payment starting with: ${partialId}`);

    const allPayments = await Payment.find({});
    // @ts-ignore
    const targetPayment = allPayments.find(p => p._id.toString().startsWith(partialId));

    if (!targetPayment) {
        console.log("❌ PAYMENT NOT FOUND via Partial ID search.");
        process.exit(0);
    }

    // @ts-ignore
    console.log(`✅ Payment Found: ${targetPayment._id}`);

    // @ts-ignore
    const student = await Student.findOne({ usn: targetPayment.usn });
    if (!student) {
        console.log("❌ Student record NOT FOUND.");
        process.exit(0);
    }

    console.log(`✅ Student Found: ${student.studentName}`);

    // Handling undefined paidFees
    // @ts-ignore
    if (!Array.isArray(student.paidFees)) {
        console.log('⚠️ Student has no paidFees array (undefined/null). Initializing to empty array.');
        // @ts-ignore
        student.paidFees = [];
    }

    // @ts-ignore
    console.log(`   Current Paid Fees: ${JSON.stringify(student.paidFees)}`);

    let updated = false;
    // @ts-ignore
    for (const feeId of targetPayment.feeIds) {
        // @ts-ignore
        if (!student.paidFees.includes(feeId)) {
            console.log(`⚠️ Fee '${feeId}' is MISSING in student record. Adding it...`);
            // @ts-ignore
            student.paidFees.push(feeId);
            updated = true;
        } else {
            console.log(`ℹ️ Fee '${feeId}' is already present.`);
        }
    }

    if (updated) {
        // @ts-ignore
        await student.save();
        console.log("🎉 Student record UPDATED successfully. The fee should now be hidden.");
    } else {
        console.log("👍 Student record is already correct. No changes needed.");
    }

    process.exit(0);
}

fixPayment().catch(e => {
    console.error(e);
    process.exit(1);
});
