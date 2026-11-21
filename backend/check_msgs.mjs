import mongoose from 'mongoose';
import { config } from './src/config/env.js';

async function main() {
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  const convs = await db.collection('conversations').find({ title: /expense/i }).toArray();
  for (const c of convs) {
    console.log(`Conv: ${c._id} | Title: ${c.title}`);
    const msgs = await db.collection('messages').find({ conversationId: c._id }).sort({ createdAt: 1 }).toArray();
    for (const m of msgs) {
      console.log(`  -> [${m.sender}]: ${m.content.slice(0, 150).replace(/\n/g, ' ')}`);
    }
  }
  await mongoose.disconnect();
}

main().catch(console.error);
