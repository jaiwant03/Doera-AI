import mongoose from 'mongoose';
import Conversation from './src/models/Conversation.js';
import { config } from './src/config/env.js';

async function main() {
  await mongoose.connect(config.mongoUri);
  const conv = await Conversation.findOne().sort({ updatedAt: -1 });
  if (conv) {
    console.log('Conv ID:', conv._id, 'Title:', conv.title);
    const msgs = conv.messages.slice(-4);
    for (const msg of msgs) {
      console.log(`\n=== [${msg.sender}] (${msg.timestamp}) ===`);
      console.log(msg.content);
    }
  } else {
    console.log('No conversation found');
  }
  await mongoose.disconnect();
}

main().catch(console.error);
