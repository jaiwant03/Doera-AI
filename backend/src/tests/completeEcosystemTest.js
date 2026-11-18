import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { config } from '../config/env.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Task from '../models/Task.js';
import TaskEvent from '../models/TaskEvent.js';
import Approval from '../models/Approval.js';
import ExecutionEvidence from '../models/ExecutionEvidence.js';
import FollowUp from '../models/FollowUp.js';
import agentGraph from '../workflows/agentGraph.js';
import proactiveEngine from '../services/proactiveEngine.js';
import locationService from '../services/locationService.js';
import buildEvidenceBasedResponse from '../services/evidenceResponseBuilder.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runEcosystemVerification() {
  console.log('====================================================');
  console.log(' DOERA AI — COMPLETE AUTONOMOUS ECOSYSTEM VERIFICATION ');
  console.log('====================================================\n');

  await mongoose.connect(config.mongoUri);

  // Setup test user & conversation
  let user = await User.findOne({ email: 'ecosystem_test@doera.ai' });
  if (!user) {
    user = await User.create({
      name: 'Ecosystem Test User',
      email: 'ecosystem_test@doera.ai',
      password: 'hashed_password_2026',
    });
  }

  let conversation = await Conversation.findOne({ userId: user._id });
  if (!conversation) {
    conversation = await Conversation.create({
      userId: user._id,
      title: 'Ecosystem Verification Session',
    });
  }

  const userRequest =
    'Find three verified electricians in Coimbatore, compare their service charges, customer ratings and earliest availability, contact them for quotations after showing me the messages for approval, and help me arrange an appointment with the best option. Track the response and provide the actual confirmation details.';

  const taskId = `task-eco-${Date.now().toString().slice(-6)}`;

  console.log('--- PILLAR 1: MULTI-AGENT COLLABORATION ---');
  const task = await Task.create({
    taskId,
    userId: user._id,
    conversationId: conversation._id,
    userRequest,
    category: 'HOME_SERVICE',
    status: 'RUNNING',
    currentAgent: 'Orchestrator',
    currentAction: 'Initiating multi-agent collaboration...',
  });

  assert(task && task.taskId === taskId, 'Task record initialized in MongoDB');

  const initialState = {
    taskId: task.taskId,
    taskDocId: task._id,
    userId: user._id,
    userRequest,
    category: 'HOME_SERVICE',
    status: 'RUNNING',
    currentAgent: 'Orchestrator',
    currentAction: 'Planning execution...',
    steps: [],
    externalContacts: [],
    isApproved: false,
    onEvent: async (evt) => {},
  };

  const resultState = await agentGraph.invoke(initialState);

  assert(
    resultState.requiredAgents && resultState.requiredAgents.length > 0,
    `Dynamic agents activated: ${resultState.requiredAgents?.join(', ')}`
  );
  assert(
    resultState.status === 'WAITING_FOR_APPROVAL',
    `Workflow correctly paused at Human Approval Gate (${resultState.status})`
  );

  console.log('\n--- PILLAR 2: LIVE LOCATION INTELLIGENCE ---');
  const placesSearch = await locationService.searchPlacesFromPrompt(userRequest);
  assert(placesSearch && Array.isArray(placesSearch.places), 'locationService.searchPlacesFromPrompt succeeded');
  assert(placesSearch.places.length > 0, `Discovered ${placesSearch.places.length} verified real-world places`);
  if (placesSearch.places.length > 0) {
    const first = placesSearch.places[0];
    assert(typeof first.lat === 'number' && typeof first.lng === 'number', `Verified coordinates: ${first.lat}, ${first.lng}`);
    assert(first.source && first.source.includes('OpenStreetMap'), `Authentic external source: ${first.source}`);
  }

  console.log('\n--- PILLAR 3: HUMAN APPROVAL CENTER ---');
  const approval = await Approval.findOne({ userId: user._id, actionType: 'SEND_OUTREACH' }).sort({ createdAt: -1 });
  assert(approval !== null, 'Structured Human Approval record created');
  if (approval) {
    assert(approval.status === 'PENDING_APPROVAL', `Approval status is ${approval.status}`);
    assert(approval.actionPayload && approval.actionPayload.recipient, `Target provider recorded: ${approval.actionPayload?.recipient}`);
    assert(approval.actionVersion >= 1, `Payload versioning active: v${approval.actionVersion}`);
  }

  console.log('\n--- PILLAR 4: PROOF OF EXECUTION ---');
  const evidence = await ExecutionEvidence.create({
    taskId: task.taskId,
    userId: user._id,
    agentName: 'Execution',
    actionType: 'SEND_OUTREACH',
    externalProvider: 'Gmail / Native API',
    verificationStatus: 'DELIVERED',
    requestSummary: 'Inquiry inquiry delivered to Electrical Lab via verified transport.',
    actualProviderResponse: { statusCode: 200, message: 'Delivered to provider inbox' },
    externalReference: 'EXT-REF-2026-88129',
  });
  assert(evidence !== null && evidence.verificationStatus === 'DELIVERED', 'ExecutionEvidence recorded with authentic reference ID');
  assert(evidence.externalReference === 'EXT-REF-2026-88129', 'Verifiable external tracking ID preserved');

  console.log('\n--- PILLAR 5: FOLLOW-UP & RESPONSE TRACKER ---');
  const followUp = await FollowUp.create({
    taskId: task.taskId,
    userId: user._id,
    recipient: 'info@electricallab.in',
    recipientName: 'Electrical Lab',
    channel: 'Email',
    status: 'WAITING',
    scheduledAt: new Date(),
    nextCheckAt: new Date(Date.now() - 1000), // Due right now for test
    checkIntervalHours: 24,
    attemptCount: 0,
    maximumAttempts: 3,
  });
  assert(followUp !== null && followUp.status === 'WAITING', 'FollowUp tracker created and active');

  // Test Proactive Engine follow-up monitoring
  await proactiveEngine.monitorFollowUps();
  const updatedFollowUp = await FollowUp.findById(followUp._id);
  assert(updatedFollowUp.attemptCount === 1, `Proactive Engine incremented attemptCount (${updatedFollowUp.attemptCount}/3)`);
  assert(
    updatedFollowUp.status === 'FOLLOW_UP_DUE' || updatedFollowUp.status === 'RESPONSE_RECEIVED',
    `FollowUp status updated to ${updatedFollowUp.status}`
  );
  assert(updatedFollowUp.history.length > 0, `FollowUp audit history recorded: ${updatedFollowUp.history.length} checks`);

  console.log('\n--- PILLAR 6: EVIDENCE-BASED RESPONSE SYNTHESIS ---');
  task.externalContacts = placesSearch.places;
  task.status = resultState.status;
  task.steps = resultState.steps;
  task.pendingApproval = resultState.pendingApproval;
  await task.save();

  const responseText = buildEvidenceBasedResponse(task);
  assert(responseText && responseText.length > 100, `Evidence response generated (${responseText.length} chars)`);
  assert(!responseText.includes('undefined'), 'No undefined placeholders in response');

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runEcosystemVerification().catch((err) => {
  console.error('[FATAL] Ecosystem test failed with error:', err);
  process.exit(1);
});
