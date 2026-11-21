import mongoose from 'mongoose';
import { config } from './src/config/env.js';

async function main() {
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  const msgs = await db.collection('messages').find().sort({ createdAt: -1 }).limit(10).toArray();
  for (const m of msgs) {
    console.log(`[${m.createdAt}] [${m.sender}]: ${m.content?.slice(0, 200)?.replace(/\n/g, ' ')}`);
  }
  await mongoose.disconnect();
}
main().catch(console.error);
