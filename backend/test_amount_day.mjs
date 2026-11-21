import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import conversationContextEngine from './src/services/conversationContextEngine.js';
import universalIntentService from './src/services/universalIntentService.js';
import agentGraph from './src/workflows/agentGraph.js';
import buildUniversalResponse from './src/services/universalResponseBuilder.js';

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);

  const convId = '6b016263443012c98b727738';
  const userId = '6af9f47dfd7fce5d5a7e9847';
  const message = 'Amount and Day';

  const contextPayload = await conversationContextEngine.resolveConversationContext({
    conversationId: convId,
    userId,
    message,
    incomingAttachments: [],
  });

  console.log('Context resolved for "Amount and Day":');
  console.log('  isFollowUp:', contextPayload.isFollowUp);
  console.log('  resolvedCategory:', contextPayload.resolvedCategory);
  console.log('  followUpType:', contextPayload.followUpType);

  const intent = await universalIntentService.understandRequest(
    message,
    contextPayload.effectiveAttachments,
    '',
    contextPayload.historyContext
  );

  console.log('Intent understood:');
  console.log('  primaryCategory:', intent.primaryCategory);
  console.log('  clarificationNeeded:', intent.clarificationNeeded);

  if (contextPayload.isFollowUp && contextPayload.resolvedCategory) {
    intent.primaryCategory = contextPayload.resolvedCategory;
  }

  const resultState = await agentGraph.invoke({
    taskId: 'test-amount-day',
    userId,
    userRequest: message,
    category: intent.primaryCategory,
    status: 'IN_PROGRESS',
    steps: [],
    externalContacts: [],
    attachments: contextPayload.effectiveAttachments,
    conversationId: convId,
    historyContext: contextPayload.historyContext,
    isFollowUp: contextPayload.isFollowUp,
    followUpType: contextPayload.followUpType,
    lastChartConfig: contextPayload.lastChartConfig,
    lastCalculation: contextPayload.lastCalculation,
  });

  const responseText = buildUniversalResponse(resultState);
  console.log('\n--- RESPONSE PREVIEW FOR "Amount and Day" ---');
  console.log(responseText.slice(0, 1000));

  await mongoose.disconnect();
}

test().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
