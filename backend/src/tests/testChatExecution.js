import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import agentGraph from '../workflows/agentGraph.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import buildEvidenceBasedResponse from '../services/evidenceResponseBuilder.js';
import locationService from '../services/locationService.js';

async function runTest() {
  console.log('[TEST] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai');
  console.log('[TEST] MongoDB connected');

  let user = await User.findOne();
  if (!user) {
    user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hash',
    });
  }

  let conversation = await Conversation.findOne({ userId: user._id });
  if (!conversation) {
    conversation = await Conversation.create({
      userId: user._id,
      title: 'Electricians in Coimbatore',
    });
  }

  const userRequest = "Find three verified electricians in Coimbatore, compare their service charges, customer ratings and earliest availability, contact them for quotations after showing me the messages for approval, and help me arrange an appointment with the best option. Track the response and provide the actual confirmation details.";
  const taskId = `task-test-${Date.now().toString().slice(-6)}`;

  console.log('[TEST] Creating initial Task record...');
  const task = await Task.create({
    taskId,
    userId: user._id,
    conversationId: conversation._id,
    userRequest,
    category: 'HOME_SERVICE',
    status: 'RUNNING',
    currentAgent: 'Orchestrator',
    currentAction: 'Starting orchestration...',
  });
  console.log('[TEST] Task created with ID:', task.taskId);

  console.log('[TEST] Invoking agentGraph...');
  try {
    const initialState = {
      taskId: task.taskId,
      userId: user._id,
      userRequest,
      category: 'HOME_SERVICE',
      status: 'RUNNING',
      currentAgent: 'Orchestrator',
      currentAction: 'Planning execution...',
      steps: [],
      externalContacts: [],
      isApproved: false,
      onEvent: async (evt) => {
        console.log(`[EVENT] ${evt.currentAgent || 'Agent'}: ${evt.currentAction || ''}`);
      },
    };

    const resultState = await agentGraph.invoke(initialState);
    console.log('[TEST] agentGraph finished successfully!');
    console.log('[TEST] Result status:', resultState.status);
    console.log('[TEST] Contacts count:', (resultState.externalContacts || []).length);
    console.log('[TEST] Pending approval:', !!resultState.pendingApproval);
    console.log('[TEST] Follow-up:', !!resultState.followUp);

    task.status = resultState.status || 'PARTIALLY_COMPLETED';
    task.steps = resultState.steps || task.steps;
    task.outcome = resultState.outcome || task.outcome;
    task.bookingDetails = resultState.bookingDetails || task.bookingDetails;
    task.externalContacts = resultState.externalContacts || task.externalContacts;
    task.pendingApproval = resultState.pendingApproval || task.pendingApproval;
    task.currentAgent = resultState.currentAgent || 'Orchestrator';
    task.currentAction = resultState.currentAction || 'Execution synthesized.';
    await task.save();

    console.log('[TEST] Building evidence based response...');
    const responseText = buildEvidenceBasedResponse(task);
    console.log('[TEST] Response text length:', responseText.length);
    console.log('[TEST] Response preview:\n', responseText.slice(0, 300));
  } catch (err) {
    console.error('[TEST ERROR] Failed to run agent graph:', err);
  } finally {
    await mongoose.disconnect();
    console.log('[TEST] Done.');
  }
}

runTest();
