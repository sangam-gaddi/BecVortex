const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://sangamgaddi17_db_user:5NfzMYsPbZOD8NdN@cluster0.otetiqx.mongodb.net/bec-vortex-os?retryWrites=true&w=majority&appName=Cluster0';

(async () => {
    let client;
    try {
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db();

        console.log('--- USERS ---');
        const users = await db.collection('users').find({}).toArray();
        for (const u of users) {
            console.log(`${u.username} | Role: ${u.role} | Dept: ${u.department}`);
        }

        console.log('\n--- STUDENTS SUMMARY ---');
        const stats = await db.collection('students').aggregate([
            {
                $group: {
                    _id: { dept: "$department", sem: "$currentSemester" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.dept": 1, "_id.sem": 1 } }
        ]).toArray();

        console.log(`Total students in DB: ${await db.collection('students').countDocuments()}`);
        for (const stat of stats) {
            console.log(`Branch: ${stat._id.dept || 'None'}, Sem: ${stat._id.sem || 'None'} -> Count: ${stat.count}`);
        }

        console.log('\n--- FINDING usn 2ba26cs001 ---');
        const specificStudent = await db.collection('students').findOne({ usn: /2ba26cs001/i });
        if (specificStudent) {
            console.log(`Found! Name: ${specificStudent.studentName}, Dept: ${specificStudent.department}, Sem: ${specificStudent.currentSemester}`);
        } else {
            console.log("NOT FOUND in database.");
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (client) await client.close();
        process.exit(0);
    }
})();
