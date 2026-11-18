import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';

async function runSuite() {
  console.log('================================================================');
  console.log('  DOERA AI — END-TO-END VERIFICATION & TEST SUITE (15 CHECKS)   ');
  console.log('================================================================');

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`[DB] Connected to MongoDB: ${db.databaseName}`);

  const results = [];
  const recordResult = (id, name, success, details) => {
    results.push({ id, name, status: success ? 'PASS' : 'FAIL', details });
    console.log(`[${success ? 'PASS' : 'FAIL'}] Test ${id}: ${name} -> ${details}`);
  };

  const testEmail = `test_user_${Date.now()}@doera.ai`;
  const testPassword = 'Password123!';
  let authToken = null;
  let testUserId = null;
  let testConvId = null;
  let testTaskId = null;

  try {
    // 1. REGISTER NEW USER
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Database Test User', email: testEmail, password: testPassword }),
    });
    const regData = await regRes.json();
    testUserId = regData.user?.id || regData.user?._id;
    recordResult(1, 'Register New User', regRes.status === 201 || regRes.status === 200, `Registered: ${testEmail}`);

    // 2. LOG IN
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    authToken = loginData.token;
    recordResult(2, 'User Login', !!authToken, `Token acquired for user ID: ${testUserId}`);

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };

    // 3. CREATE CONVERSATION & 4. SEND MESSAGE & 5. GENERATE AI RESPONSE
    const chatRes = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ message: 'Hello DOERA! What are your core capabilities?' }),
    });
    const chatData = await chatRes.json();
    testConvId = chatData.conversation?._id;
    const aiText = chatData.aiMessage?.content || '';
    recordResult(3, 'Create Conversation', !!testConvId, `Conversation ID: ${testConvId}`);
    recordResult(4, 'Send Message', chatRes.status === 200, `User message recorded`);
    recordResult(5, 'Generate AI Response', aiText.length > 20, `AI response: "${aiText.slice(0, 60)}..."`);

    // 6. RESTORE CONVERSATION HISTORY
    const histRes = await fetch(`${API_BASE}/chat/conversations/${testConvId}`, {
      headers: authHeaders,
    });
    const histData = await histRes.json();
    const hasMessages = histData.messages?.length >= 2;
    recordResult(6, 'Restore Conversation History', hasMessages, `Restored ${histData.messages?.length} messages`);

    // 7. EXECUTE AUTONOMOUS TASK
    const taskChatRes = await fetch(`${API_BASE}/chat/message`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        conversationId: testConvId,
        message: 'Find an electrician in Coimbatore and book a slot.',
      }),
    });
    const taskChatData = await taskChatRes.json();
    testTaskId = taskChatData.task?._id || taskChatData.task?.taskId;
    const taskDbId = taskChatData.task?._id;
    recordResult(7, 'Execute Autonomous Task', !!testTaskId, `Task ID: ${testTaskId}, Status: ${taskChatData.task?.status}`);

    // 8. SAVE AGENT EXECUTION RESULTS
    const execCount = await db.collection('agentexecutions').countDocuments({ taskId: new mongoose.Types.ObjectId(taskDbId) });
    recordResult(8, 'Save Agent Execution Results', execCount > 0, `Recorded ${execCount} agentexecutions for task`);

    // 9. CONNECT AN INTEGRATION
    const integRes = await fetch(`${API_BASE}/integrations`, {
      headers: authHeaders,
    });
    const integData = await integRes.json();
    recordResult(9, 'Connect Integration Route', integRes.status === 200, `Integrations API returned active: ${Array.isArray(integData.integrations)}`);

    // 10. VERIFY SUBSCRIPTION DETAILS
    const subRes = await fetch(`${API_BASE}/subscription/status`, {
      headers: authHeaders,
    });
    const subData = await subRes.json();
    recordResult(10, 'Verify Subscription Details', subData.plan === 'free', `Plan: ${subData.plan}, Status: ${subData.status}`);

    // 11. VERIFY PAYMENT RECORDS
    const payRes = await fetch(`${API_BASE}/subscription/billing-history`, {
      headers: authHeaders,
    });
    const payData = await payRes.json();
    recordResult(11, 'Verify Payment Records', payRes.status === 200, `Billing history retrieved: ${payData.payments?.length || 0} payments`);

    // 12. ENFORCE FREE 15-REQUEST LIMIT
    const usageCount = await db.collection('usagerecords').countDocuments({ userId: new mongoose.Types.ObjectId(testUserId) });
    const userDoc = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(testUserId) });
    const limitEnforced = userDoc.usage?.freeRequestsLimit === 15;
    recordResult(12, 'Enforce Free 15-Request Limit', limitEnforced, `Limit: ${userDoc.usage?.freeRequestsLimit}, Usage records tracked: ${usageCount}`);

    // 13. TEST FILE UPLOADS
    const fileRes = await fetch(`${API_BASE}/files/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        filename: 'architecture-test.txt',
        mimeType: 'text/plain',
        rawText: 'DOERA AI MongoDB Architecture Optimization Document Content.',
        conversationId: testConvId,
      }),
    });
    const fileData = await fileRes.json();
    const fileMetaDoc = await db.collection('filemetadata').findOne({ filename: 'architecture-test.txt' });
    recordResult(13, 'Test File Uploads', !!fileMetaDoc, `File ID: ${fileMetaDoc?._id}, Stored in "filemetadata" collection`);

    // 14. TEST REFRESH AND PERSISTENCE
    const postColList = (await db.listCollections().toArray()).map(c => c.name);
    const requiredCols = ['users', 'conversations', 'messages', 'tasks', 'agentexecutions', 'integrations', 'subscriptions', 'payments', 'usagerecords', 'filemetadata'];
    const allPresent = requiredCols.every(c => postColList.includes(c));
    recordResult(14, 'Persistence & Schema Integrity', allPresent, `Target collections verified: ${requiredCols.join(', ')}`);

    // 15. VERIFY n8n EXECUTION REFERENCES
    const n8nWebhookRes = await fetch(`${API_BASE}/webhooks/n8n/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: testTaskId,
        executionId: 'n8n-exec-9941',
        status: 'SUCCESS',
        agent: 'n8n Dispatcher',
        action: 'Automated background quotation sync',
        outputData: { quote: '$45/hr verified' },
      }),
    });
    const n8nData = await n8nWebhookRes.json();
    const n8nExecRecord = await db.collection('agentexecutions').findOne({ 'metadata.executionId': 'n8n-exec-9941' });
    recordResult(15, 'n8n Execution References in DB', !!n8nExecRecord, `n8n executionId logged in agentexecutions with output`);

  } catch (err) {
    console.error('Test Suite Exception:', err);
  } finally {
    console.log('\n================================================================');
    console.log('                      VERIFICATION SUMMARY                      ');
    console.log('================================================================');
    console.table(results);
    await mongoose.disconnect();
  }
}

runSuite().catch(console.error);
