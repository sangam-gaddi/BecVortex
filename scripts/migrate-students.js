const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://sangamgaddi17_db_user:5NfzMYsPbZOD8NdN@cluster0.otetiqx.mongodb.net/bec-vortex-os?retryWrites=true&w=majority&appName=Cluster0';

(async () => {
    let client;
    try {
        console.log('Connecting to database to migrate legacy students...');
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db();
        const studentsCollection = db.collection('students');

        // Backfill all students who are missing currentSemester to Semester 5 (as requested by user)
        const result = await studentsCollection.updateMany(
            { currentSemester: { $exists: false } },
            { $set: { currentSemester: 5, backlogs: [], registeredSubjects: [] } }
        );

        console.log(`Migration Complete! Backfilled ${result.modifiedCount} legacy students to Semester 5.`);

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        if (client) await client.close();
        process.exit(0);
    }
})();
