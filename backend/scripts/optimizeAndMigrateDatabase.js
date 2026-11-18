import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';

async function optimizeAndMigrate() {
  console.log('========================================================');
  console.log('  DOERA AI — MongoDB Database Optimization & Migration  ');
  console.log('========================================================');
  console.log(`Connecting to: ${uri}...`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`[DB] Connected to database: "${db.databaseName}"`);

  // 1. Audit current collections
  const initialCols = (await db.listCollections().toArray()).map((c) => c.name);
  console.log(`[AUDIT] Initial collection count: ${initialCols.length}`);
  console.log(`[AUDIT] Existing collections:`, initialCols);

  // 2. Migrate taskevents -> agentexecutions
  if (initialCols.includes('taskevents')) {
    const rawEvents = await db.collection('taskevents').find({}).toArray();
    console.log(`[MIGRATION] Found ${rawEvents.length} records in "taskevents". Migrating to "agentexecutions"...`);

    const agentExecutionDocs = rawEvents.map((evt) => {
      let status = 'completed';
      if (evt.eventType === 'TASK_TRIGGERED') status = 'started';
      else if (evt.eventType === 'task_awaiting_approval') status = 'paused';

      const agentName = ['Orchestrator', 'Discovery', 'Communication', 'Quotation', 'Scheduling', 'Verification', 'Recovery'].includes(evt.agent)
        ? evt.agent
        : 'Orchestrator';

      return {
        executionId: evt._id ? evt._id.toString() : new mongoose.Types.ObjectId().toString(),
        taskId: evt.taskId,
        agentName,
        agentType: 'autonomous',
        status,
        input: evt.details?.userRequest ? { userRequest: evt.details.userRequest } : (evt.details?.step || {}),
        output: evt.details || {},
        startTime: evt.timestamp ? new Date(evt.timestamp) : new Date(),
        endTime: evt.timestamp ? new Date(evt.timestamp) : new Date(),
        latencyMs: 0,
        error: evt.level === 'error' ? (evt.details?.error || evt.action) : null,
        metadata: {
          originalEventType: evt.eventType,
          action: evt.action,
          level: evt.level,
          migratedFrom: 'taskevents',
        },
        createdAt: evt.timestamp ? new Date(evt.timestamp) : new Date(),
        updatedAt: evt.timestamp ? new Date(evt.timestamp) : new Date(),
      };
    });

    if (agentExecutionDocs.length > 0) {
      await db.collection('agentexecutions').insertMany(agentExecutionDocs);
      console.log(`[MIGRATION] Successfully inserted ${agentExecutionDocs.length} records into "agentexecutions".`);
    }

    // Safely drop taskevents
    await db.collection('taskevents').drop();
    console.log(`[CLEANUP] Dropped redundant collection "taskevents".`);
  }

  // 3. Rename or drop filemetadatas
  const currentCols = (await db.listCollections().toArray()).map((c) => c.name);
  if (currentCols.includes('filemetadatas')) {
    const fileCount = await db.collection('filemetadatas').countDocuments();
    if (fileCount > 0) {
      const docs = await db.collection('filemetadatas').find({}).toArray();
      await db.collection('filemetadata').insertMany(docs);
      await db.collection('filemetadatas').drop();
      console.log(`[STANDARDIZE] Migrated and dropped "filemetadatas" -> "filemetadata" (${fileCount} documents).`);
    } else {
      await db.collection('filemetadatas').drop();
      console.log(`[STANDARDIZE] Dropped empty collection "filemetadatas".`);
    }
  }

  // 4. Safely drop obsolete empty collections
  const obsoleteCollections = [
    'projects',
    'researchsessions',
    'workflows',
    'workflowexecutions',
    'notifications',
  ];

  for (const col of obsoleteCollections) {
    if (initialCols.includes(col)) {
      const docCount = await db.collection(col).countDocuments();
      if (docCount === 0) {
        await db.collection(col).drop();
        console.log(`[REMOVAL] Safely dropped obsolete collection "${col}" (0 documents).`);
      } else {
        console.warn(`[WARNING] Collection "${col}" has ${docCount} documents; preserved for safety.`);
      }
    }
  }

  // 5. Build/Verify Production Indexes
  console.log('\n[INDEXING] Creating and optimizing production indexes...');

  // Users
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  console.log(' - users: { email: 1 } (unique)');

  // Conversations
  await db.collection('conversations').createIndex({ userId: 1, lastMessageAt: -1 });
  await db.collection('conversations').createIndex({ userId: 1, updatedAt: -1 });
  await db.collection('conversations').createIndex({ userId: 1, isPinned: -1, lastMessageAt: -1 });
  console.log(' - conversations: { userId: 1, lastMessageAt: -1 }, { userId: 1, updatedAt: -1 }');

  // Messages
  await db.collection('messages').createIndex({ conversationId: 1, createdAt: 1 });
  await db.collection('messages').createIndex({ userId: 1, createdAt: -1 });
  console.log(' - messages: { conversationId: 1, createdAt: 1 }, { userId: 1, createdAt: -1 }');

  // Tasks
  await db.collection('tasks').createIndex({ taskId: 1 }, { unique: true });
  await db.collection('tasks').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('tasks').createIndex({ conversationId: 1 });
  await db.collection('tasks').createIndex({ status: 1 });
  console.log(' - tasks: { taskId: 1 } (unique), { userId: 1, createdAt: -1 }');

  // AgentExecutions
  await db.collection('agentexecutions').createIndex({ taskId: 1, createdAt: -1 });
  await db.collection('agentexecutions').createIndex({ taskId: 1, agentName: 1 });
  console.log(' - agentexecutions: { taskId: 1, createdAt: -1 }, { taskId: 1, agentName: 1 }');

  // Integrations
  await db.collection('integrations').createIndex({ userId: 1, provider: 1 }, { unique: true });
  console.log(' - integrations: { userId: 1, provider: 1 } (unique)');

  // Subscriptions
  await db.collection('subscriptions').createIndex({ userId: 1, status: 1 });
  console.log(' - subscriptions: { userId: 1, status: 1 }');

  // Payments
  try {
    await db.collection('payments').createIndex({ providerPaymentId: 1 }, { unique: true });
  } catch (err) {
    console.log(' - payments: providerPaymentId index already configured');
  }
  await db.collection('payments').createIndex({ userId: 1, createdAt: -1 });
  console.log(' - payments: { providerPaymentId: 1 } (unique), { userId: 1, createdAt: -1 }');

  // UsageRecords
  await db.collection('usagerecords').createIndex({ requestId: 1 }, { unique: true });
  await db.collection('usagerecords').createIndex({ userId: 1, createdAt: -1 });
  console.log(' - usagerecords: { requestId: 1 } (unique), { userId: 1, createdAt: -1 }');

  // FileMetadata
  await db.collection('filemetadata').createIndex({ userId: 1, createdAt: -1 });
  await db.collection('filemetadata').createIndex({ conversationId: 1 });
  console.log(' - filemetadata: { userId: 1, createdAt: -1 }, { conversationId: 1 }');

  // Memories
  await db.collection('memories').createIndex({ userId: 1, category: 1 });
  console.log(' - memories: { userId: 1, category: 1 }');

  // 6. Final State Inspection
  const finalCols = await db.listCollections().toArray();
  const summary = [];
  for (const c of finalCols) {
    const count = await db.collection(c.name).countDocuments();
    const indexes = await db.collection(c.name).indexes();
    summary.push({
      collection: c.name,
      documents: count,
      indexes: indexes.map((i) => i.name).join(', '),
    });
  }

  summary.sort((a, b) => a.collection.localeCompare(b.collection));
  console.log('\n========================================================');
  console.log('               FINAL OPTIMIZED DATABASE STATE           ');
  console.log('========================================================');
  console.table(summary);

  await mongoose.disconnect();
}

optimizeAndMigrate().catch((err) => {
  console.error('[MIGRATION] Migration error:', err);
  process.exit(1);
});
