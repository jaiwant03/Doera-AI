import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';

async function audit() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log('=== DATABASE AUDIT: ' + db.databaseName + ' ===');
  console.log('Total collections found:', collections.length);
  
  const report = [];
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    const indexes = await db.collection(c.name).indexes();
    report.push({
      name: c.name,
      count,
      indexes: indexes.map(idx => ({ name: idx.name, key: idx.key, unique: !!idx.unique }))
    });
  }

  report.sort((a, b) => a.name.localeCompare(b.name));
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

audit().catch(console.error);
