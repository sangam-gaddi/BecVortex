
import { connectToDatabase } from '@/database/mongoose';
import Payment from '@/database/models/Payment';
import Student from '@/database/models/Student';

async function debugPayment() {
    await connectToDatabase();

    // The user said Receipt ID is 695AB2F4. This is the first 8 chars of the ObjectID.
    // Converting to lowercase for MongoDB search if needed, but usually hex is lowercase in _id
    const partialId = "695AB2F4".toLowerCase();

    console.log(`Searching for payment starting with: ${partialId}`);

    // Find payment where _id string starts with partialId
    // Since _id is an object, we might need to iterate or use specific query if driver supports string conversion
    // For simplicity in this script, i'll fetch all and filter (not efficient for prod, fine for debug)

    const allPayments = await Payment.find({});
    const targetPayment = allPayments.find(p => p._id.toString().startsWith(partialId));

    if (!targetPayment) {
        console.log("PAYMENT NOT FOUND.");
        return;
    }

    console.log("--- Payment Found ---");
    console.log(JSON.stringify(targetPayment, null, 2));

    console.log("\n--- Checking Student Record ---");
    const student = await Student.findOne({ usn: targetPayment.usn });
    if (student) {
        console.log(`Student Found: ${student.studentName} (${student.usn})`);
        console.log("Paid Fees Array:", student.paidFees);

        const isFeeInArray = targetPayment.feeIds.every(id => student.paidFees.includes(id));
        console.log(`Are fee IDs ${JSON.stringify(targetPayment.feeIds)} in paidFees? ${isFeeInArray}`);
    } else {
        console.log("Student record not found for USN:", targetPayment.usn);
    }
}

debugPayment().catch(console.error).finally(() => process.exit());
