import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log('Checking database:', db.databaseName);
  
  const colNames = ['users', 'conversations', 'messages', 'tasks', 'taskevents', 'usagerecords'];
  for (const name of colNames) {
    const col = db.collection(name);
    const count = await col.countDocuments();
    const docs = await col.find({}).limit(2).toArray();
    console.log(`\n=== Collection: ${name} (Count: ${count}) ===`);
    if (docs.length > 0) {
      console.log('Sample Doc:', JSON.stringify(docs[0], null, 2).slice(0, 300));
    }
  }
  await mongoose.disconnect();
}

check().catch(console.error);
