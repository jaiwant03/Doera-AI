import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import conversationContextEngine from '../src/services/conversationContextEngine.js';
import fileStorageService from '../src/services/fileStorageService.js';
import spreadsheetService from '../src/services/spreadsheetService.js';
import dataAnalysisAgent from '../src/agents/dataAnalysisAgent.js';
import planningAgent from '../src/agents/planningAgent.js';
import budgetAgent from '../src/agents/budgetAgent.js';
import communicationAgent from '../src/agents/communicationAgent.js';
import universalIntentService from '../src/services/universalIntentService.js';
import buildUniversalResponse from '../src/services/universalResponseBuilder.js';
import Conversation from '../src/models/Conversation.js';
import Message from '../src/models/Message.js';
import User from '../src/models/User.js';
import Task from '../src/models/Task.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';

async function runTests() {
  console.log('=== DOERA AI — UNIVERSAL MULTI-TURN CONVERSATION & DATA VERIFICATION SUITE ===\n');

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.warn('⚠️ MongoDB connection note:', err.message);
  }

  const userIdA = new mongoose.Types.ObjectId();
  const userIdB = new mongoose.Types.ObjectId();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  // =========================================================================
  // TEST 1: 100,000-ROW EXCEL DATASET GENERATION, PARSING & DETERMINISTIC CALCULATION
  // =========================================================================
  console.log('\n--- TEST 1: 100,000 Transaction Records Excel Parsing & Calculation ---');
  
  const categories = ['Engineering', 'Marketing', 'Operations', 'Human Resources', 'Travel & Entertainment'];
  const testRows = [];
  let expectedTotal = 0;
  const expectedCategoryTotals = {};
  categories.forEach(c => expectedCategoryTotals[c] = 0);

  const NUM_ROWS = 100000;
  console.log(`Generating in-memory test workbook with ${NUM_ROWS.toLocaleString()} rows...`);
  for (let i = 1; i <= NUM_ROWS; i++) {
    const cat = categories[i % categories.length];
    const amount = (i % 50) + 10; // predictable amounts 10..59
    expectedTotal += amount;
    expectedCategoryTotals[cat] += amount;
    testRows.push({
      'Transaction ID': `TXN-${100000 + i}`,
      'Date': '2026-11-20',
      'Expense Category': cat,
      'Amount': amount,
      'Description': `Operational expense item ${i}`,
    });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(testRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  console.log(`Workbook generated. Size: ${(xlsxBuffer.length / (1024 * 1024)).toFixed(2)} MB`);

  // Verify Base64 / Buffer handling in spreadsheetService
  const parsed = await spreadsheetService.parseSpreadsheet({
    buffer: xlsxBuffer,
    filename: 'financial_expense_tracker_100k.xlsx',
  });

  assert(parsed.summary.totalRows === NUM_ROWS, `Spreadsheet parsed exactly ${NUM_ROWS} rows (got ${parsed.summary.totalRows})`);
  assert(parsed.primarySheet.headers.includes('Expense Category'), 'Headers correctly include Expense Category');
  assert(parsed.primarySheet.headers.includes('Amount'), 'Headers correctly include Amount');

  // Verify Analysis: "Calculate total expenses and number of transactions."
  const analysisCalc = spreadsheetService.executeAnalysis(parsed, 'Calculate total expenses and number of transactions.');
  assert(analysisCalc.success === true, 'Analysis executed successfully');
  assert(analysisCalc.rowCount === NUM_ROWS, `Analysis rowCount is exactly ${NUM_ROWS}`);
  assert(Math.abs(analysisCalc.calculation.totalSum - expectedTotal) < 1, `Total expenses calculation is EXACT ($${analysisCalc.calculation.totalSum.toLocaleString()} vs expected $${expectedTotal.toLocaleString()})`);
  assert(analysisCalc.calculation.totalSum > 0, `Total expenses is NOT $0 (Problem 1 Fix Verified!)`);
  assert(analysisCalc.calculation.highest !== null, `Highest category identified: ${analysisCalc.calculation.highest?.label}`);

  // =========================================================================
  // TEST 2: MULTI-TURN CONVERSATION CONTEXT ENGINE & DATA ANALYTICS CONTINUATION
  // =========================================================================
  console.log('\n--- TEST 2: Multi-Turn Conversation Context Engine (Spreadsheet Follow-Ups) ---');

  // Turn 1: User uploads spreadsheet and requests chart
  const convA = await Conversation.create({
    userId: userIdA,
    title: 'Financial Analysis',
  });

  const turn1Context = await conversationContextEngine.resolveConversationContext({
    conversationId: convA._id,
    userId: userIdA,
    message: 'Analyze this expense spreadsheet, calculate the highest spending category, and create an interactive bar chart.',
    incomingAttachments: [{
      name: 'financial_expense_tracker_100k.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: xlsxBuffer,
      size: xlsxBuffer.length,
    }],
  });

  assert(turn1Context.effectiveAttachments.length === 1, 'Turn 1 registered 1 effective attachment');
  assert(Boolean(turn1Context.effectiveAttachments[0].storagePath), 'Attachment saved to disk with secure storagePath');
  assert(fs.existsSync(turn1Context.effectiveAttachments[0].storagePath), 'File physically exists on disk in user-scoped directory');

  // Agent analyzes Turn 1
  const turn1AgentResult = await dataAnalysisAgent.analyzeData({
    userRequest: 'Analyze this expense spreadsheet, calculate the highest spending category, and create an interactive bar chart.',
    attachments: turn1Context.effectiveAttachments,
  });

  assert(turn1AgentResult.status === 'completed', 'Turn 1 agent completed analysis');
  assert(turn1AgentResult.chartConfig !== null, 'Turn 1 created chartConfig');
  assert(turn1AgentResult.chartConfig.data.length > 0, 'Turn 1 chartConfig contains aggregated category data');

  // Turn 1 completion: save to conversation context
  await conversationContextEngine.updateConversationContext({
    conversationId: convA._id,
    userId: userIdA,
    userRequest: 'Analyze this expense spreadsheet, calculate the highest spending category, and create an interactive bar chart.',
    category: 'DATA_ANALYSIS',
    chartConfig: turn1AgentResult.chartConfig,
    calculation: turn1AgentResult.analysis.calculation,
  });

  // Save Assistant Message in DB
  const turn1Response = buildUniversalResponse({
    category: 'DATA_ANALYSIS',
    discoveredData: { dataAnalysis: turn1AgentResult.analysis },
    chartConfig: turn1AgentResult.chartConfig,
    userRequest: 'Analyze this expense spreadsheet, calculate the highest spending category, and create an interactive bar chart.',
  });

  await Message.create({
    conversationId: convA._id,
    userId: userIdA,
    sender: 'user',
    content: 'Analyze this expense spreadsheet, calculate the highest spending category, and create an interactive bar chart.',
  });

  await Message.create({
    conversationId: convA._id,
    userId: userIdA,
    sender: 'assistant',
    content: turn1Response,
    chartConfig: turn1AgentResult.chartConfig,
    calculation: turn1AgentResult.analysis.calculation,
  });

  // Turn 2: Follow-up message in the SAME conversation: "In this chart, give me the interpretation."
  const turn2Context = await conversationContextEngine.resolveConversationContext({
    conversationId: convA._id,
    userId: userIdA,
    message: 'In this chart, give me the interpretation.',
    incomingAttachments: [], // NO ATTACHMENTS PASSED!
  });

  assert(turn2Context.isFollowUp === true, 'Turn 2 detected as follow-up continuation');
  assert(turn2Context.followUpType === 'CHART_INSPECTION', 'Turn 2 followUpType resolved as CHART_INSPECTION');
  assert(turn2Context.resolvedCategory === 'DATA_ANALYSIS', 'Turn 2 resolvedCategory is DATA_ANALYSIS');
  assert(turn2Context.lastChartConfig !== null, 'Turn 2 successfully retrieved lastChartConfig from context');
  assert(turn2Context.lastCalculation !== null, 'Turn 2 successfully retrieved lastCalculation from context');
  assert(turn2Context.effectiveAttachments.length === 1, 'Turn 2 successfully hydrated spreadsheet attachment from disk storage');

  // Agent executes Turn 2
  const turn2AgentResult = await dataAnalysisAgent.analyzeData({
    userRequest: 'In this chart, give me the interpretation.',
    attachments: turn2Context.effectiveAttachments,
    lastCalculation: turn2Context.lastCalculation,
    lastChartConfig: turn2Context.lastChartConfig,
    isFollowUp: turn2Context.isFollowUp,
  });

  assert(turn2AgentResult.status === 'completed', 'Turn 2 agent completed interpretation');
  assert(turn2AgentResult.analysis.calculation.totalSum > 0, `Turn 2 preserved total sum of $${turn2AgentResult.analysis.calculation.totalSum.toLocaleString()} without re-calculating from zero`);

  const turn2Response = buildUniversalResponse({
    category: 'DATA_ANALYSIS',
    discoveredData: { dataAnalysis: turn2AgentResult.analysis },
    chartConfig: turn2AgentResult.chartConfig,
    userRequest: 'In this chart, give me the interpretation.',
  });

  assert(turn2Response.includes('Chart Interpretation & Dataset Analysis'), 'Turn 2 response includes dedicated Chart Interpretation header');
  assert(!turn2Response.includes('Appointment Status'), 'Turn 2 has NO appointment contamination');
  assert(!turn2Response.includes('Authorize & Execute Action'), 'Turn 2 has NO workflow authorization contamination');

  // Turn 3: Follow-up message: "Change the chart to a pie chart."
  const turn3Context = await conversationContextEngine.resolveConversationContext({
    conversationId: convA._id,
    userId: userIdA,
    message: 'Change the chart to a pie chart.',
    incomingAttachments: [],
  });

  assert(turn3Context.isFollowUp === true, 'Turn 3 recognized as follow-up');
  assert(turn3Context.instructionType === 'CONVERT_TO_PIE', 'Turn 3 recognized CONVERT_TO_PIE instruction');

  const turn3AgentResult = await dataAnalysisAgent.analyzeData({
    userRequest: 'Change the chart to a pie chart.',
    attachments: turn3Context.effectiveAttachments,
    lastCalculation: turn2AgentResult.analysis.calculation,
    lastChartConfig: turn2AgentResult.chartConfig,
    isFollowUp: true,
  });

  assert(turn3AgentResult.chartConfig.type === 'pie' || turn3AgentResult.chartConfig.chartType === 'pie', 'Turn 3 successfully switched chart type to pie');
  assert(turn3AgentResult.chartConfig.data.length === turn1AgentResult.chartConfig.data.length, 'Turn 3 retained all original data series');

  // =========================================================================
  // TEST 3: MULTI-AGENT PLANNING MULTI-TURN CONTINUATION
  // =========================================================================
  console.log('\n--- TEST 3: Multi-Agent Planning Follow-Ups (Hackathon / Event) ---');

  const convPlan = await Conversation.create({
    userId: userIdA,
    title: 'Hackathon Planning',
  });

  // Turn 1: Initial plan
  const planTurn1 = await planningAgent.planMission({
    userRequest: 'Plan a 2-day national hackathon for 200 participants with an initial budget of ₹50,000.',
  });
  const budgetTurn1 = await budgetAgent.calculateBudget({
    userRequest: 'Allocate ₹50,000 budget for 2-day national hackathon.',
    plan: planTurn1.plan,
  });

  await Message.create({
    conversationId: convPlan._id,
    userId: userIdA,
    sender: 'user',
    content: 'Plan a 2-day national hackathon for 200 participants with an initial budget of ₹50,000.',
  });

  await Message.create({
    conversationId: convPlan._id,
    userId: userIdA,
    sender: 'assistant',
    content: 'I have formulated a comprehensive 2-day hackathon execution plan with ₹50,000 budget allocation.',
  });

  await conversationContextEngine.updateConversationContext({
    conversationId: convPlan._id,
    userId: userIdA,
    userRequest: 'Plan a 2-day national hackathon for 200 participants with an initial budget of ₹50,000.',
    category: 'MISSION_PLANNING',
    planningData: { ...planTurn1.plan, budgetBreakdown: budgetTurn1.budget },
  });

  // Turn 2: Follow-up: "Reduce the budget to ₹40,000 and show revised breakdown."
  const planTurn2Context = await conversationContextEngine.resolveConversationContext({
    conversationId: convPlan._id,
    userId: userIdA,
    message: 'Reduce the budget to ₹40,000 and show revised breakdown.',
  });

  assert(planTurn2Context.isFollowUp === true, 'Planning Turn 2 detected as follow-up');
  assert(planTurn2Context.followUpType === 'MISSION_PLANNING_CONTINUATION', 'Planning Turn 2 followUpType is MISSION_PLANNING_CONTINUATION');
  assert(planTurn2Context.lastPlan !== null, 'Planning Turn 2 retrieved previous plan artifact');

  const budgetTurn2 = await budgetAgent.calculateBudget({
    userRequest: 'Reduce the budget to ₹40,000 and show revised breakdown.',
    lastPlan: planTurn2Context.lastPlan,
    historyContext: planTurn2Context.historyContext,
  });

  assert(budgetTurn2.status === 'completed', 'Revised budget allocated successfully');
  const finalBudget = budgetTurn2.budget?.totalBudget || budgetTurn2.output?.totalBudget;
  assert(finalBudget === 40000, `Revised budget total is exactly ₹40,000 (got ₹${finalBudget})`);

  // =========================================================================
  // TEST 4: EMAIL ASSISTANT MULTI-TURN REVISION
  // =========================================================================
  console.log('\n--- TEST 4: Email Assistant Multi-Turn Drafting & Revision ---');

  const convEmail = await Conversation.create({
    userId: userIdA,
    title: 'Approval Email',
  });

  // Turn 1: Draft initial email
  const emailTurn1 = await communicationAgent.prepareOutreach({
    userRequest: 'Draft an email to HOD requesting event approval for technical symposium.',
  });

  assert(emailTurn1.status === 'drafted' || emailTurn1.status === 'completed', 'Initial email drafted');
  const initialDraft = emailTurn1.draft || emailTurn1;

  await Message.create({
    conversationId: convEmail._id,
    userId: userIdA,
    sender: 'user',
    content: 'Draft an email to HOD requesting event approval for technical symposium.',
  });

  await Message.create({
    conversationId: convEmail._id,
    userId: userIdA,
    sender: 'assistant',
    content: `Subject: ${initialDraft?.subject || 'Approval Request'}\n\n${initialDraft?.emailText || initialDraft?.body || 'Dear HOD...'}`,
  });

  await conversationContextEngine.updateConversationContext({
    conversationId: convEmail._id,
    userId: userIdA,
    userRequest: 'Draft an email to HOD requesting event approval for technical symposium.',
    category: 'COMMUNICATION',
    draftData: initialDraft,
  });

  // Turn 2: "Make it more professional and add workshop date as Dec 15th at Main Auditorium."
  const emailTurn2Context = await conversationContextEngine.resolveConversationContext({
    conversationId: convEmail._id,
    userId: userIdA,
    message: 'Make it more professional and add workshop date as Dec 15th at Main Auditorium.',
  });

  assert(emailTurn2Context.isFollowUp === true, 'Email Turn 2 recognized as follow-up');
  assert(emailTurn2Context.followUpType === 'EMAIL_REVISION', 'Email Turn 2 followUpType is EMAIL_REVISION');
  assert(emailTurn2Context.lastDraft !== null, 'Email Turn 2 retrieved lastDraft');

  const emailTurn2 = await communicationAgent.prepareOutreach({
    userRequest: 'Make it more professional and add workshop date as Dec 15th at Main Auditorium.',
    lastDraft: emailTurn2Context.lastDraft,
    historyContext: emailTurn2Context.historyContext,
  });

  assert(emailTurn2.status === 'drafted' || emailTurn2.status === 'completed', 'Email Turn 2 successfully revised draft');
  assert(Boolean(emailTurn2.draft?.emailText || emailTurn2.emailText), 'Revised email has body text');

  // =========================================================================
  // TEST 5: DOCUMENT & IMAGE REFERENCE RESOLUTION
  // =========================================================================
  console.log('\n--- TEST 5: Document Intelligence & Vision Reference Resolution ---');

  const docResolution = conversationContextEngine.analyzeFollowUpIntent({
    text: 'Explain the second weakness and suggest improvements for it.',
    lower: 'explain the second weakness and suggest improvements for it.',
    hasIncomingAttachments: false,
    hasEffectiveAttachments: true,
    activeCategory: 'DOCUMENT_ANALYSIS',
    rawMessages: [{ sender: 'user', content: 'Analyze this project proposal.' }],
  });

  assert(docResolution.isFollowUp === true, 'Document follow-up detected');
  assert(docResolution.followUpType === 'DOCUMENT_INSPECTION', 'Document followUpType is DOCUMENT_INSPECTION');
  assert(docResolution.instructionType === 'WEAKNESS_ELABORATION', 'Document instructionType is WEAKNESS_ELABORATION');

  const visionResolution = conversationContextEngine.analyzeFollowUpIntent({
    text: 'Fix the spacing and alignment issue, and suggest a better color combination.',
    lower: 'fix the spacing and alignment issue, and suggest a better color combination.',
    hasIncomingAttachments: false,
    hasEffectiveAttachments: true,
    activeCategory: 'IMAGE_ANALYSIS',
    rawMessages: [{ sender: 'user', content: 'Review this UI screenshot.' }],
  });

  assert(visionResolution.isFollowUp === true, 'Vision follow-up detected');
  assert(visionResolution.followUpType === 'IMAGE_INSPECTION', 'Vision followUpType is IMAGE_INSPECTION');

  const localServiceResolution = conversationContextEngine.analyzeFollowUpIntent({
    text: 'Compare the first three and show their locations on the map.',
    lower: 'compare the first three and show their locations on the map.',
    hasIncomingAttachments: false,
    hasEffectiveAttachments: false,
    lastResearchResults: [{ name: 'Repair Center 1' }, { name: 'Repair Center 2' }, { name: 'Repair Center 3' }],
    activeCategory: 'LOCATION_DISCOVERY',
    rawMessages: [{ sender: 'user', content: 'Find laptop repair centers in Indiranagar.' }],
  });

  assert(localServiceResolution.isFollowUp === true, 'Local Service follow-up detected');
  assert(localServiceResolution.followUpType === 'LOCAL_RESEARCH_CONTINUATION', 'Local service followUpType is LOCAL_RESEARCH_CONTINUATION');

  // =========================================================================
  // TEST 6: USER ISOLATION & SECURITY GUARANTEE
  // =========================================================================
  console.log('\n--- TEST 6: Strict User Isolation Guarantee ---');

  // User B tries to query conversation belonging to User A
  const userBContext = await conversationContextEngine.resolveConversationContext({
    conversationId: convA._id,
    userId: userIdB, // DIFFERENT USER
    message: 'Give me the previous chart.',
  });

  assert(String(userBContext.conversation._id) !== String(convA._id), 'User B cannot access User A conversation; new conversation generated');
  assert(userBContext.effectiveAttachments.length === 0, 'User B has zero access to User A attachments');
  assert(userBContext.lastChartConfig === null, 'User B has zero access to User A chartConfig');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log(`\n=========================================================================`);
  console.log(`TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`=========================================================================\n`);

  // Clean up test data
  try {
    await Conversation.deleteMany({ _id: { $in: [convA._id, convPlan._id, convEmail._id] } });
    await Message.deleteMany({ userId: { $in: [userIdA, userIdB] } });
  } catch (_) {}

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runTests().catch(err => {
  console.error('Test execution fatal error:', err);
  process.exit(1);
});
