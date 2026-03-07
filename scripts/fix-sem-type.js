const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://sangamgaddi17_db_user:5NfzMYsPbZOD8NdN@cluster0.otetiqx.mongodb.net/bec-vortex-os?retryWrites=true&w=majority&appName=Cluster0';

// Convert all numeric semester values to their string equivalents
(async () => {
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db().collection('students');

  // Find all students where semester is stored as a number
  const numericSems = await col.find(
    { semester: { $type: 'number' } },
    { projection: { _id: 1, usn: 1, semester: 1 } }
  ).toArray();

  console.log(`Found ${numericSems.length} students with numeric semester field`);

  // Update each one: semester: 5 (number) -> semester: '5' (string)
  let updated = 0;
  for (const s of numericSems) {
    const strSem = String(s.semester);
    await col.updateOne({ _id: s._id }, { $set: { semester: strSem } });
    updated++;
  }

  console.log(`Converted ${updated} students: semester (number) -> semester (string)`);

  // Verify
  const remaining = await col.countDocuments({ semester: { $type: 'number' } });
  const asStr5 = await col.countDocuments({ semester: '5' });
  console.log(`Still numeric: ${remaining} | semester='5' (string): ${asStr5}`);

  await client.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
