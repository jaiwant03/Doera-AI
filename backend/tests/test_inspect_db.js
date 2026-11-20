import mongoose from 'mongoose';
import Message from '../src/models/Message.js';
import Task from '../src/models/Task.js';
import TaskEvent from '../src/models/TaskEvent.js';

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/doera_hackathon_demo');

  console.log('=== 10 MOST RECENT MESSAGES ===');
  const msgs = await Message.find().sort({ createdAt: -1 }).limit(10);
  msgs.forEach((m) => {
    console.log(m.createdAt.toISOString(), m.sender, JSON.stringify(m.content.slice(0, 80)), 'attach:', m.attachments?.map((a) => a.name));
  });

  console.log('=== 5 MOST RECENT TASKS ===');
  const tasks = await Task.find().sort({ createdAt: -1 }).limit(5);
  tasks.forEach((t) => {
    console.log(t.createdAt.toISOString(), t.taskId, t.status, t.category, t.title);
  });

  console.log('=== 10 MOST RECENT TASK EVENTS ===');
  const events = await TaskEvent.find().sort({ timestamp: -1 }).limit(10);
  events.forEach((e) => {
    console.log(e.timestamp?.toISOString(), e.agent, e.eventType, e.action);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
