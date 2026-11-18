import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';
import Task from '../src/models/Task.js';
import AgentExecution from '../src/models/AgentExecution.js';
import TaskEvent from '../src/models/TaskEvent.js';
import UsageRecord from '../src/models/UsageRecord.js';
import User from '../src/models/User.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB:', mongoose.connection.name);
  console.log('Users count:', await User.countDocuments());
  console.log('Conversations count:', await Conversation.countDocuments());
  console.log('Messages count:', await Message.countDocuments());
  console.log('Tasks count:', await Task.countDocuments());
  console.log('AgentExecutions count:', await AgentExecution.countDocuments());
  console.log('TaskEvents count:', await TaskEvent.countDocuments());
  console.log('UsageRecords count:', await UsageRecord.countDocuments());
  await mongoose.disconnect();
}

run().catch(console.error);
