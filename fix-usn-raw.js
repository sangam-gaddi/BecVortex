const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://sangamgaddi:Y1XhM6E2JDBPteYv@cluster0.k025o.mongodb.net/bec?retryWrites=true&w=majority';

(async () => {
    let client;
    try {
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db('bec');
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
            console.log('Not found: csn 20260001');
        }
    } catch (e) {
        console.error(e);
    } finally {
        if (client) await client.close();
    }
})();
