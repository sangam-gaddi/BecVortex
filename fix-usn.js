const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

(async () => {
    try {
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const students = db.collection('students');
        const student = await students.findOne({ csn: '20260001' });
        if (student) {
            console.log('Found student:', student.studentName);
            if (!student.usn) {
                const dep = student.department ? student.department.toUpperCase() : 'CS';
                const newUsn = '2BA26' + dep + '001';
                console.log('Adding USN:', newUsn);

                await students.updateOne(
                    { csn: '20260001' },
                    { $set: { usn: newUsn } }
                );

                console.log('Success!');
            } else {
                console.log('Already has USN:', student.usn);
            }
        } else {
            console.log('Not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
})();
