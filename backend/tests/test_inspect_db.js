import mongoose from 'mongoose';
import Message from '../src/models/Message.js';
import Task from '../src/models/Task.js';

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/doera_hackathon_demo');

  const msgs = await Message.find({ sender: 'assistant' }).sort({ createdAt: -1 }).limit(2);
  msgs.forEach((m, i) => {
    console.log(`\n=== MESSAGE ${i + 1} (${m.createdAt.toISOString()}) ===`);
    console.log('Task ID:', m.taskId);
    console.log('ChartConfig:', JSON.stringify(m.chartConfig, null, 2));
    console.log('Content (first 500 chars):\n', m.content.slice(0, 500));
  });

  await mongoose.disconnect();
}

main().catch(console.error);
