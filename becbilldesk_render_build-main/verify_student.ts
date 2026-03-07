
import fs from 'fs';
import path from 'path';

async function verifyStudentRecord() {
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

    // Target USN
    const usn = '2BA23IS099';

    console.log(`\n🔍 Checking Student Record for: ${usn}`);

    // Use .lean() to get raw object (bypasses Mongoose Document wrapper)
    const student = await Student.findOne({ usn }).lean();

    if (!student) {
        console.log('❌ Student not found!');
        process.exit(1);
    }

    console.log('✅ Student Found:', student.studentName);
    console.log('📦 Full Student Object (relevant fields):');
    console.log(JSON.stringify({
        usn: student.usn,
        studentName: student.studentName,
        paidFees: student.paidFees,
        isRegistered: student.isRegistered,
    }, null, 2));

    // Check if paidFees exists and has 'development'
    if (student.paidFees && Array.isArray(student.paidFees)) {
        console.log(`\n✅ paidFees is an array with ${student.paidFees.length} items:`, student.paidFees);
        if (student.paidFees.includes('development')) {
            console.log('✅ "development" IS in paidFees!');
        } else {
            console.log('❌ "development" is NOT in paidFees!');
        }
    } else {
        console.log('❌ paidFees is missing or not an array:', student.paidFees);
    }

    process.exit(0);
}

verifyStudentRecord().catch(e => {
    console.error(e);
    process.exit(1);
});
