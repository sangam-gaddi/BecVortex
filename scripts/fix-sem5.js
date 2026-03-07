const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI ||
  'mongodb+srv://sangamgaddi17_db_user:5NfzMYsPbZOD8NdN@cluster0.otetiqx.mongodb.net/bec-vortex-os?retryWrites=true&w=majority&appName=Cluster0';

(async () => {
  let client;
  try {
    console.log('Connecting...');
    client = new MongoClient(uri);
    await client.connect();
    const col = client.db().collection('students');

    // Show current state
    const before = await col.find(
      {},
      { projection: { _id: 0, usn: 1, studentName: 1, semester: 1, currentSemester: 1 } }
    ).toArray();
    console.log('\n--- BEFORE ---');
    before.forEach(s => console.log(`  ${s.usn || '(no usn)'} | ${s.studentName} | semester=${s.semester} | currentSemester=${s.currentSemester}`));

    // Update all students where semester string is '1' -> '5'
    const result = await col.updateMany(
      { semester: '1' },
      { $set: { semester: '5', currentSemester: 5 } }
    );
    console.log(`\nUpdated ${result.modifiedCount} student(s) from semester "1" -> "5"`);

    // Confirm
    const after = await col.find(
      {},
      { projection: { _id: 0, usn: 1, studentName: 1, semester: 1, currentSemester: 1 } }
    ).toArray();
    console.log('\n--- AFTER ---');
    after.forEach(s => console.log(`  ${s.usn || '(no usn)'} | ${s.studentName} | semester=${s.semester} | currentSemester=${s.currentSemester}`));

  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    if (client) await client.close();
    process.exit(0);
  }
})();
