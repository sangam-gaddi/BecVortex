const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://sangamgaddi17_db_user:5NfzMYsPbZOD8NdN@cluster0.otetiqx.mongodb.net/bec-vortex-os?retryWrites=true&w=majority&appName=Cluster0';

(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('students');

  // Sample a few 2BA23IS students to see actual types  
  const samples = await col.find(
    { usn: { $regex: '^2BA23IS' } },
    { projection: { _id: 0, usn: 1, studentName: 1, semester: 1, currentSemester: 1 } }
  ).limit(5).toArray();

  console.log('\n--- Sample 2BA23IS students ---');
  samples.forEach(s => {
    console.log(`  USN: ${s.usn} | semester: ${JSON.stringify(s.semester)} (type: ${typeof s.semester}) | currentSemester: ${JSON.stringify(s.currentSemester)}`);
  });

  // Count by semester type
  const asString5 = await col.countDocuments({ semester: '5' });
  const asNumber5 = await col.countDocuments({ semester: 5 });
  console.log(`\nCount with semester='5' (string): ${asString5}`);
  console.log(`Count with semester=5  (number): ${asNumber5}`);

  await client.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
