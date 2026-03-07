const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://sangamgaddi17_db_user:5NfzMYsPbZOD8NdN@cluster0.otetiqx.mongodb.net/bec-vortex-os?retryWrites=true&w=majority&appName=Cluster0';

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('students');

  // test2 (2BA26CS001) had semester='1', currentSemester=5
  const r1 = await col.updateOne(
    { usn: '2BA26CS001' },
    { $set: { semester: '1', currentSemester: 5 } }
  );

  // test (no usn) had semester='1', currentSemester=5
  const r2 = await col.updateOne(
    { studentName: 'test' },
    { $set: { semester: '1', currentSemester: 5 } }
  );

  // is1st (2BA26IS001) and 2nd (2BA26IS002) had semester='1', currentSemester=1
  const r3 = await col.updateOne(
    { usn: '2BA26IS001' },
    { $set: { semester: '1', currentSemester: 1 } }
  );
  const r4 = await col.updateOne(
    { usn: '2BA26IS002' },
    { $set: { semester: '1', currentSemester: 1 } }
  );

  console.log('Reverted:', r1.modifiedCount + r2.modifiedCount + r3.modifiedCount + r4.modifiedCount, 'students');

  const check = await col.find(
    { usn: { $in: ['2BA26CS001', '2BA26IS001', '2BA26IS002'] } },
    { projection: { _id: 0, usn: 1, studentName: 1, semester: 1, currentSemester: 1 } }
  ).toArray();
  console.log('Verification:', JSON.stringify(check, null, 2));

  await client.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
