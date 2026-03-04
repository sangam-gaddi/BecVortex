const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://sangamgaddi:Y1XhM6E2JDBPteYv@cluster0.k025o.mongodb.net/bec?retryWrites=true&w=majority';

// The extracted syllabus data from the Master Prompt constraint:
// "CS, IS, AI, BT share Chemistry/Physics groups"
const SYLLABUS_SEED = [
    // 1st Semester (Chemistry Group)
    { subjectCode: '22UMA103C', title: 'Mathematics for Computer Sciences-I', credits: 4, category: 'BSC', semester: 1, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UCH111C', title: 'Chemistry for Computer Sciences', credits: 4, category: 'BSC', semester: 1, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UCS119C', title: "Principles of Programming using 'C'", credits: 3, category: 'ESC', semester: 1, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UHS124C', title: 'Communicative English', credits: 1, category: 'HSSC', semester: 1, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UHS126C', title: 'Samskruthika Kannada', credits: 1, category: 'HSSC', semester: 1, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UHS129C', title: 'Innovation and Design Thinking', credits: 1, category: 'ETC', semester: 1, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },

    // 2nd Semester (Physics Group)
    { subjectCode: '22UMA203C', title: 'Mathematics for Computer Sciences-II', credits: 4, category: 'BSC', semester: 2, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UPH207C', title: 'Physics for Computer Sciences', credits: 4, category: 'BSC', semester: 2, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UME223C', title: 'Computer Aided Engineering Drawing (CAED)', credits: 3, category: 'ESC', semester: 2, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UHS224C', title: 'Professional writing skills in English', credits: 1, category: 'HSSC', semester: 2, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UHS225C', title: 'Constitution of India', credits: 1, category: 'HSSC', semester: 2, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },
    { subjectCode: '22UHS228C', title: 'Scientific Foundations of Health', credits: 1, category: 'HSSC', semester: 2, applicableBranches: ['CS', 'IS', 'AI', 'BT'] },

    // Common Elective Pools (Tagged as 'ALL' or explicitly shared for 1st Year)
    // ESC-I
    { subjectCode: '22UME122N', title: 'Intro to Mechanical Engineering', credits: 3, category: 'ESC', semester: 1, applicableBranches: ['ALL'] },
    { subjectCode: '22UCV118N', title: 'Intro to Civil Engineering', credits: 3, category: 'ESC', semester: 1, applicableBranches: ['ALL'] },
    { subjectCode: '22UEE116N', title: 'Intro to Electrical Engineering', credits: 3, category: 'ESC', semester: 1, applicableBranches: ['ALL'] },
    { subjectCode: '22UEC114N', title: 'Intro to Electronics Engineering', credits: 3, category: 'ESC', semester: 1, applicableBranches: ['ALL'] },

    // ETC-I
    { subjectCode: '22UEC134B', title: 'Intro to Embedded Systems', credits: 3, category: 'ETC', semester: 1, applicableBranches: ['ALL'] },
    { subjectCode: '22UCS140B', title: 'Intro to IoT', credits: 3, category: 'ETC', semester: 1, applicableBranches: ['ALL'] },
    { subjectCode: '22UCS141B', title: 'Intro to Cyber Security', credits: 3, category: 'ETC', semester: 1, applicableBranches: ['ALL'] },

    // PLC-I
    { subjectCode: '22UCS130B', title: 'Intro to Web Programming', credits: 3, category: 'PLC', semester: 1, applicableBranches: ['ALL'] },
    { subjectCode: '22UCS131B', title: 'Intro to Python', credits: 3, category: 'PLC', semester: 1, applicableBranches: ['ALL'] },
    { subjectCode: '22UCS132B', title: 'Basics of JAVA', credits: 3, category: 'PLC', semester: 1, applicableBranches: ['ALL'] },
    { subjectCode: '22UCS133B', title: 'Intro to C++', credits: 3, category: 'PLC', semester: 1, applicableBranches: ['ALL'] },
];

(async () => {
    let client;
    try {
        console.log('Connecting to MongoDB database...');
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db();
        const subjectsCollection = db.collection('subjects');

        console.log(`Preparing to seed ${SYLLABUS_SEED.length} subjects...`);

        let inserted = 0;
        let skipped = 0;

        for (const subject of SYLLABUS_SEED) {
            // Check if it already exists
            const existing = await subjectsCollection.findOne({ subjectCode: subject.subjectCode });
            if (!existing) {
                // Add common Mongoose standard fields manually
                const toInsert = {
                    ...subject,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await subjectsCollection.insertOne(toInsert);
                inserted++;
                console.log(`✅ Seeded: ${subject.subjectCode} - ${subject.title}`);
            } else {
                skipped++;
            }
        }

        console.log(`\n🎉 Seeding Complete!\nInserted: ${inserted}\nSkipped (already existed): ${skipped}`);
    } catch (e) {
        console.error('Seeding Error:', e);
    } finally {
        if (client) await client.close();
        process.exit(0);
    }
})();
