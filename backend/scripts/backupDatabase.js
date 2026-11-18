import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';
const backupDir = path.resolve(__dirname, '../backups');

async function backupDatabase() {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDir = path.join(backupDir, `backup_${timestamp}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  console.log(`[BACKUP] Connecting to ${uri}...`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log(`[BACKUP] Backing up ${collections.length} collections from "${db.databaseName}" to ${sessionDir}`);

  const manifest = {
    database: db.databaseName,
    timestamp: new Date().toISOString(),
    collections: {},
  };

  for (const c of collections) {
    const colName = c.name;
    const docs = await db.collection(colName).find({}).toArray();
    manifest.collections[colName] = docs.length;
    const filePath = path.join(sessionDir, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`[BACKUP] Saved "${colName}": ${docs.length} documents -> ${filePath}`);
  }

  fs.writeFileSync(path.join(sessionDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[BACKUP] Backup completed successfully at ${sessionDir}`);

  await mongoose.disconnect();
  return sessionDir;
}

backupDatabase().catch((err) => {
  console.error('[BACKUP] Backup failed:', err);
  process.exit(1);
});
