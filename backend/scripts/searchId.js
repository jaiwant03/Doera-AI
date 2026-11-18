import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function search() {
  await mongoose.connect('mongodb://127.0.0.1:27017/admin');
  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  
  for (const dbInfo of dbs.databases) {
    const db = mongoose.connection.client.db(dbInfo.name);
    const cols = await db.listCollections().toArray();
    for (const c of cols) {
      const doc = await db.collection(c.name).findOne({ _id: new mongoose.Types.ObjectId('6af83f9d6c0827a025ad2710') });
      if (doc) {
        console.log(`FOUND in DB: ${dbInfo.name}, Collection: ${c.name}`);
        console.log(doc);
      }
    }
  }
  await mongoose.disconnect();
}

search().catch(console.error);
