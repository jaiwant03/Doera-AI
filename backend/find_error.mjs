import mongoose from 'mongoose';
import { config } from './src/config/env.js';

async function main() {
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  const msgs = await db.collection('messages').find({ content: /logger/i }).toArray();
  console.log('Found messages with logger:', msgs.length);
  for (const m of msgs) {
    console.log('ID:', m._id, 'ConvId:', m.conversationId, 'CreatedAt:', m.createdAt);
    console.log('Content:', m.content);
    // Find preceding user message
    const userMsg = await db.collection('messages').findOne({
      conversationId: m.conversationId,
      createdAt: { $lt: m.createdAt },
      sender: 'user'
    }, { sort: { createdAt: -1 } });
    if (userMsg) {
      console.log('Preceding user msg:', userMsg.content);
    }
  }
  await mongoose.disconnect();
}

main().catch(console.error);
