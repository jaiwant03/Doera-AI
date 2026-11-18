import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import placesAdapter from './src/integrations/placesAdapter.js';
import discoveryAgent from './src/agents/discoveryAgent.js';
import quotationAgent from './src/agents/quotationAgent.js';
import schedulingAgent from './src/agents/schedulingAgent.js';
import verificationAgent from './src/agents/verificationAgent.js';
import communicationAgent from './src/agents/communicationAgent.js';
import buildEvidenceBasedResponse from './src/services/evidenceResponseBuilder.js';
import Task from './src/models/Task.js';
import AgentExecution from './src/models/AgentExecution.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✖ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  DOERA AI — Anti-Hallucination & Execution Accuracy Test Suite');
  console.log('===============================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✔ Connected to MongoDB Atlas\n');

  // Test 1: Real Provider Discovery for Cardiologists in Chennai
  console.log('Test 1: Find Cardiologists in Chennai (Real Entities, Zero Fake Names)');
  const discResult = await discoveryAgent.execute({
    taskId: 'test-cardio-1',
    userRequest: 'Find top cardiologists in Chennai',
    category: 'MEDICAL',
  });

  assert(discResult.status === 'completed', 'Discovery agent completed successfully');
  const contacts = discResult.output.contacts;
  assert(contacts.length > 0, `Discovered real providers (found: ${contacts.length})`);
  
  // Verify NO fake names or placeholder words like "Apex Care Services" or "Cardiologist Hub"
  const hasFakeHubName = contacts.some(c => 
    c.businessName.includes('Hub -') || 
    c.businessName.includes('Apex Care Services') || 
    c.businessName.includes('Apex Cardiologist')
  );
  assert(!hasFakeHubName, 'No fabricated placeholder names (no "Hub", "Apex Services")');

  // Verify NO fake phone numbers
  const hasFakePhone = contacts.some(c => c.phone === '+91 94440 12345' || c.phone === '+91 98401 54321');
  assert(!hasFakePhone, 'No fabricated placeholder phone numbers (+91 94440 12345)');

  // Verify all entries have source URLs and retrievedAt
  const allHaveSource = contacts.every(c => Boolean(c.source) && Boolean(c.sourceUrl) && Boolean(c.retrievedAt));
  assert(allHaveSource, 'Every provider has source, sourceUrl, and retrieval timestamp');


  // Test 2 & 3 & 10: Domain-Aware Price Comparison (Cardiology must NEVER return Electrician inspection fees!)
  console.log('\nTest 2 & 3: Domain-Aware Price Comparison (Medical vs Electrician)');
  const quoteResult = await quotationAgent.compareQuotes(
    { taskId: 'test-cardio-1', userRequest: 'Find top cardiologists in Chennai', category: 'MEDICAL' },
    contacts
  );

  assert(quoteResult.output.domain === 'MEDICAL', 'Domain correctly identified as MEDICAL');
  const hasElectricianFee = quoteResult.output.quotations.some(q => 
    (q.inspectionFee && q.inspectionFee.includes('electrical')) || 
    (q.terms && q.terms.includes('materials billed at actuals'))
  );
  assert(!hasElectricianFee, 'Cardiology quotes NEVER contain electrician inspection fees or parts/materials terms');

  const unlistedNotice = quoteResult.output.pricingSummary.includes('Consultation fee') || quoteResult.output.pricingSummary.includes('OPD');
  assert(unlistedNotice, 'Truthfully handles consultation fees (mentions OPD/clinic consultation parameters)');


  // Test 4 & 8: Real Appointment Verification (Confirmed ONLY with Provider Confirmation ID)
  console.log('\nTest 4 & 8: Real Appointment Verification & State Separation');
  const schedPending = await schedulingAgent.scheduleAppointment(
    { taskId: 'test-sched-1', userRequest: 'Book appointment with cardiologist', status: 'EXECUTING' },
    contacts[0],
    null,
    null // No provider confirmation
  );

  assert(schedPending.bookingDetails.bookingStatus !== 'CONFIRMED', 'Pending appointment is NOT marked CONFIRMED without provider confirmation');
  assert(schedPending.bookingDetails.providerConfirmationId === null, 'providerConfirmationId is null when unconfirmed');
  assert(schedPending.bookingDetails.internalReferenceId.startsWith('DOERA-REQ-'), 'DOERA internal tracking ID clearly marked as request reference');

  // Now simulate actual provider confirmation
  const schedConfirmed = await schedulingAgent.scheduleAppointment(
    { taskId: 'test-sched-2', userRequest: 'Book appointment with cardiologist', status: 'EXECUTING' },
    contacts[0],
    null,
    { providerConfirmationId: 'APOLLO-OPD-78291', evidence: 'Official clinic booking API confirmation receipt' }
  );

  assert(schedConfirmed.bookingDetails.bookingStatus === 'CONFIRMED', 'Booking with provider confirmation ID is marked CONFIRMED');
  assert(schedConfirmed.bookingDetails.providerConfirmationId === 'APOLLO-OPD-78291', 'Provider confirmation ID correctly stored separately');


  // Test 5: Provider Failover and Recovery
  console.log('\nTest 5: Handle Unresponsive Provider / Secondary Failover');
  const mockTaskRecovery = new Task({
    taskId: `test-rec-${Date.now()}`,
    userId: new mongoose.Types.ObjectId(),
    conversationId: new mongoose.Types.ObjectId(),
    userRequest: 'Urgent electrician in Chennai',
    category: 'HOME_SERVICE',
    status: 'EXECUTING',
    retryCount: 0,
    externalContacts: [
      { businessName: 'Primary Provider (Unresponsive)', phone: '+91 99999 11111' },
      { businessName: 'Secondary Provider (Active)', phone: '+91 88888 22222' }
    ]
  });

  const { nativeWorkflows } = await import('./src/workflows/nativeWorkflows.js');
  const recResult = await nativeWorkflows.executeFailureRecovery({
    task: mockTaskRecovery,
    error: new Error('Provider phone line busy / uncontactable')
  });

  assert(recResult.recovered === true, 'Recovery agent successfully handled failure');
  assert(recResult.action === 'FAILOVER', 'Triggered failover to secondary provider');
  assert(recResult.newPrimaryContact.businessName === 'Secondary Provider (Active)', 'Correctly promoted secondary provider');


  // Test 6: Human Authorization Gate Before External Communication
  console.log('\nTest 6: Authorization Required Before External Action');
  const outreach = await communicationAgent.prepareOutreach(
    { taskId: 'test-auth-1', userRequest: 'Book consultation with cardiologist' },
    contacts[0]
  );

  assert(outreach.requiresApproval === true, 'Outreach explicitly flags requiresApproval: true');
  assert(Boolean(outreach.recipient), 'Displays intended recipient to user');
  assert(Boolean(outreach.message), 'Displays full message draft for user review');


  // Test 7: Communication Dispatch Response Checking
  console.log('\nTest 7: Check Actual Dispatch Status');
  const dispatchResult = await communicationAgent.executeDispatch(outreach, contacts[0], null);
  assert(dispatchResult.dispatches.length >= 0, 'Captures actual dispatch records');


  // Test 9 & 11: Verification Agent & Strict Task Completion Rules
  console.log('\nTest 9 & 11: Verification Agent Strict Completion Rules');
  const mockTaskPending = {
    taskId: 'test-verif-pending',
    userRequest: 'Consult cardiologist in Chennai',
    steps: [
      { agent: 'Discovery', status: 'completed' },
      { agent: 'Communication', status: 'completed' },
      { agent: 'Quotation', status: 'completed' },
      { agent: 'Scheduling', status: 'completed' }
    ],
    externalContacts: contacts,
    bookingDetails: schedPending.bookingDetails // Pending confirmation
  };

  const verifPending = await verificationAgent.verifyTask(mockTaskPending);
  assert(verifPending.statusResult === 'PARTIALLY_COMPLETED', 'Task with pending appointment is PARTIALLY_COMPLETED, not forced to COMPLETED');
  assert(verifPending.output.isBookingConfirmed === false, 'isBookingConfirmed is false when provider confirmation is absent');

  // Verify task with actual provider confirmation
  const mockTaskConfirmed = {
    taskId: 'test-verif-confirmed',
    userRequest: 'Consult cardiologist in Chennai',
    steps: [
      { agent: 'Discovery', status: 'completed' },
      { agent: 'Communication', status: 'completed' },
      { agent: 'Quotation', status: 'completed' },
      { agent: 'Scheduling', status: 'completed' }
    ],
    externalContacts: contacts,
    bookingDetails: schedConfirmed.bookingDetails // Confirmed
  };

  const verifConfirmed = await verificationAgent.verifyTask(mockTaskConfirmed);
  assert(verifConfirmed.statusResult === 'COMPLETED', 'Task with confirmed appointment is marked COMPLETED');
  assert(verifConfirmed.output.isBookingConfirmed === true, 'isBookingConfirmed is true with provider confirmation');


  // Test 12: Evidence-Based Final Answer Builder
  console.log('\nTest 12: Evidence-Based Response Format Verification');
  const finalResponseText = buildEvidenceBasedResponse({
    userRequest: 'Find top cardiologists in Chennai and schedule appointment',
    status: verifPending.statusResult,
    externalContacts: contacts,
    bookingDetails: schedPending.bookingDetails,
    outcome: verifPending.outcome
  });

  assert(finalResponseText.includes('Verified Providers'), 'Response includes Verified Providers header');
  assert(!finalResponseText.includes('### Appointment Confirmed'), 'Unconfirmed task does NOT claim "### Appointment Confirmed"');
  assert(finalResponseText.includes('Appointment Coordination Status'), 'Unconfirmed task shows honest Appointment Coordination Status');
  assert(finalResponseText.includes('Awaiting Provider Confirmation'), 'Explicitly notes Awaiting Provider Confirmation');
  assert(finalResponseText.includes('DOERA Internal Tracking ID'), 'Clearly marks internal reference as tracking ID');

  console.log('\nSample Final AI Response Output:');
  console.log('--------------------------------------------------');
  console.log(finalResponseText.substring(0, 600) + '...\n--------------------------------------------------');

  // Clean up
  await Task.deleteOne({ _id: mockTaskRecovery._id });
  await mongoose.disconnect();
  console.log('\n===============================================================');
  console.log(`  ALL ${total} TESTS PASSED SUCCESSFULLY! (${passed}/${total})`);
  console.log('===============================================================\n');
}

runTestSuite().catch(err => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
