const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://sangamgaddi17_db_user:5NfzMYsPbZOD8NdN@cluster0.otetiqx.mongodb.net/bec-vortex-os?retryWrites=true&w=majority&appName=Cluster0';

(async () => {
    let client;
    try {
        console.log('Connecting to database...');
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db();
        const studentsCollection = db.collection('students');

        console.log('Finding students with USN starting with 2ba23is...');
        const matchRegex = /^2ba23is/i;

        const count = await studentsCollection.countDocuments({ usn: matchRegex });
        console.log(`Found ${count} students matching '2ba23is'.`);

        if (count > 0) {
            const result = await studentsCollection.updateMany(
                { usn: matchRegex },
                {
                    $set: {
                        currentSemester: 5,
                        department: 'IS',
                        // Ensure arrays exist for new features
                        backlogs: [],
                        registeredSubjects: []
                    }
                }
            );
            console.log(`Successfully updated ${result.modifiedCount} 'IS' 5th semester students!`);
        } else {
            // Check what USNs actually look like to help debug
            console.log('\nWait, looking at a sample of USNs in the database:');
            const sample = await studentsCollection.find({ usn: { $exists: true } }).limit(5).toArray();
            sample.forEach(s => console.log(`- ${s.usn}`));
        }

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        if (client) await client.close();
        process.exit(0);
    }
})();
