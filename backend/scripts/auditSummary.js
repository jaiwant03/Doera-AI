import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';
console.log('Connecting to URI:', uri);

async function audit() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log('Connected DB:', db.databaseName);
  
  const adminDb = db.admin();
  const dbs = await adminDb.listDatabases();
  console.log('All MongoDB Databases:', dbs.databases.map(d => `${d.name} (${Math.round(d.sizeOnDisk / 1024)} KB)`));

  const collections = await db.listCollections().toArray();
  const summary = [];
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    summary.push({ name: c.name, count });
  }
  summary.sort((a,b) => b.count - a.count || a.name.localeCompare(b.name));
  console.table(summary);
  await mongoose.disconnect();
}

audit().catch(console.error);
