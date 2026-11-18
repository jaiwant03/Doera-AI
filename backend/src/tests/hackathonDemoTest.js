/**
 * DOERA AI — Comprehensive Hackathon Demo & Safe Simulation Verification Suite
 * Tests:
 * 1. Demo Mode Configuration & Fail-Closed Enforcement
 * 2. Dedicated Database Isolation (doera_hackathon_demo)
 * 3. DemoEmailService (DEMO-EMAIL-xxxx)
 * 4. DemoWhatsAppService (DEMO-WHATSAPP-xxxx)
 * 5. DemoTelegramService (DEMO-TELEGRAM-xxxx)
 * 6. DemoBookingService (DEMO-BOOKING-xxxx)
 * 7. DemoPaymentService (DEMO-PAYMENT-xxxx)
 * 8. DemoResponseService (Simulated Vendor Replies)
 * 9. DemoEvidenceService (Audit Proof & Labelling)
 * 10. DemoExecutionService (Master Router & Deduplication)
 * 11. ApprovalService Routing via Demo Simulator
 * 12. Location Intelligence & 3 Guided Scenarios Fallback
 * 13. Follow-Up Response Simulation
 */

import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/database.js';
import demoEmailService from '../services/demo/DemoEmailService.js';
import demoWhatsAppService from '../services/demo/DemoWhatsAppService.js';
import demoTelegramService from '../services/demo/DemoTelegramService.js';
import demoBookingService from '../services/demo/DemoBookingService.js';
import demoPaymentService from '../services/demo/DemoPaymentService.js';
import demoResponseService from '../services/demo/DemoResponseService.js';
import demoEvidenceService from '../services/demo/DemoEvidenceService.js';
import demoExecutionService from '../services/demo/DemoExecutionService.js';
import approvalService from '../services/approvalService.js';
import placesAdapter from '../integrations/placesAdapter.js';
import { getDemoFallbackPlaces } from '../config/demoSeedData.js';
import FollowUp from '../models/FollowUp.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🛡️  DOERA AI — HACKATHON DEMO & SAFE SIMULATION TEST SUITE');
  console.log('===============================================================\n');

  try {
    await connectDB();
    console.log(`Connected to Database: ${mongoose.connection.name}`);

    // Test 1: Centralized Demo Mode Configuration & DB Isolation
    console.log('\n--- 1. Configuration & Database Isolation ---');
    assert(config.demoMode === true, 'DEMO_MODE is true and enforced');
    assert(
      mongoose.connection.name === 'doera_hackathon_demo',
      `Target database is isolated doera_hackathon_demo (actual: ${mongoose.connection.name})`
    );
    assert(
      config.demoIndicatorText === 'DOERA AI — HACKATHON DEMO MODE',
      'Demo visible indicator banner text configured'
    );

    // Test 2: DemoEmailService
    console.log('\n--- 2. DemoEmailService ---');
    const emailResult = await demoEmailService.dispatch({
      to: 'dr.venkatesh@apollo-chennai.org',
      subject: 'Consultation Inquiry',
      textBody: 'Inquiring about cardiology outpatient slots this week.',
      target: { name: 'Apollo Speciality Hospital' },
    });
    assert(emailResult.isSimulated === true, 'Email result explicitly marked isSimulated: true');
    assert(emailResult.status === 'DELIVERED', 'Email status is DELIVERED');
    assert(
      emailResult.demoExecutionId && emailResult.demoExecutionId.startsWith('DEMO-EMAIL-'),
      `Email demo execution ID generated: ${emailResult.demoExecutionId}`
    );
    assert(
      emailResult.providerResponse.simulationBanner.includes('SIMULATED EXECUTION'),
      'Provider response includes SIMULATED EXECUTION banner'
    );

    // Test 3: DemoWhatsAppService
    console.log('\n--- 3. DemoWhatsAppService ---');
    const waResult = await demoWhatsAppService.dispatch({
      to: '+919842101122',
      textMessage: 'Display replacement quote request for Dell XPS 15',
      target: { name: 'Express Chipset Solutions' },
    });
    assert(waResult.isSimulated === true, 'WhatsApp result marked isSimulated: true');
    assert(
      waResult.demoExecutionId && waResult.demoExecutionId.startsWith('DEMO-WHATSAPP-'),
      `WhatsApp demo execution ID generated: ${waResult.demoExecutionId}`
    );
    assert(waResult.providerResponse.messaging_product === 'whatsapp', 'Simulated Meta payload intact');

    // Test 4: DemoTelegramService
    console.log('\n--- 4. DemoTelegramService ---');
    const tgResult = await demoTelegramService.dispatch({
      chatId: '@doera_sandbox',
      text: 'Testing Telegram dispatch',
    });
    assert(tgResult.isSimulated === true, 'Telegram result marked isSimulated: true');
    assert(
      tgResult.demoExecutionId && tgResult.demoExecutionId.startsWith('DEMO-TELEGRAM-'),
      `Telegram demo execution ID generated: ${tgResult.demoExecutionId}`
    );

    // Test 5: DemoBookingService
    console.log('\n--- 5. DemoBookingService ---');
    const bookResult = await demoBookingService.dispatch({
      providerName: 'Apollo Cardiology Centre',
      serviceType: 'Doctor Consultation',
      target: { name: 'Apollo Speciality Hospital', address: 'Greams Road, Chennai' },
    });
    assert(bookResult.isSimulated === true, 'Booking result marked isSimulated: true');
    assert(bookResult.status === 'CONFIRMED', 'Booking status is CONFIRMED');
    assert(
      bookResult.demoExecutionId && bookResult.demoExecutionId.startsWith('DEMO-BOOKING-'),
      `Booking demo execution ID generated: ${bookResult.demoExecutionId}`
    );
    assert(bookResult.calendarLink.includes('calendar.google.com'), 'Simulated calendar URL generated');

    // Test 6: DemoPaymentService
    console.log('\n--- 6. DemoPaymentService ---');
    const payResult = await demoPaymentService.dispatch({
      amount: 800,
      currency: 'INR',
      description: 'Consultation Deposit',
      target: { name: 'Apollo Cardiology' },
    });
    assert(payResult.isSimulated === true, 'Payment result marked isSimulated: true');
    assert(payResult.status === 'PAID', 'Payment status is PAID');
    assert(
      payResult.demoExecutionId && payResult.demoExecutionId.startsWith('DEMO-PAYMENT-'),
      `Payment demo execution ID generated: ${payResult.demoExecutionId}`
    );

    // Test 7: DemoResponseService (Simulated Vendor Replies)
    console.log('\n--- 7. DemoResponseService ---');
    const cardioReply = await demoResponseService.generateSimulatedResponse({
      taskRequest: 'Find top-rated cardiology clinics in Chennai near Greams Road',
      providerName: 'Apollo Speciality Hospital',
    });
    assert(cardioReply.isSimulated === true, 'Vendor response marked simulated');
    assert(cardioReply.status === 'RESPONSE_RECEIVED', 'Vendor response status is RESPONSE_RECEIVED');
    assert(
      cardioReply.responseMessage.includes('consultation') || cardioReply.responseMessage.includes('Dr. Venkatesh'),
      'Cardiology domain response synthesized authentically'
    );

    const laptopReply = await demoResponseService.generateSimulatedResponse({
      taskRequest: 'Find laptop repair in Coimbatore for Dell display replacement',
      providerName: 'Express Chipset & Laptop Solutions',
    });
    assert(
      laptopReply.responseMessage.includes('Dell') || laptopReply.responseMessage.includes('display'),
      'Laptop repair domain quote synthesized authentically'
    );

    // Test 8: Seeded User & Database Entities
    console.log('\n--- 8. User Ownership & Sandbox Context ---');
    let testUser = await User.findOne({ email: 'abc@gmail.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'JK',
        email: 'abc@gmail.com',
        password: 'password123',
        subscription: { plan: 'free', status: 'active' },
      });
    }
    assert(Boolean(testUser?._id), 'Verified test user in demo database');

    let testConv = await Conversation.findOne({ userId: testUser._id });
    if (!testConv) {
      testConv = await Conversation.create({
        userId: testUser._id,
        title: 'Demo Cardiology Consultation',
      });
    }

    const testTask = await Task.create({
      taskId: `task-demo-${Date.now()}`,
      userId: testUser._id,
      conversationId: testConv._id,
      userRequest: 'Find top-rated cardiology clinics in Chennai and book appointment',
      status: 'PLANNING',
      category: 'MEDICAL',
    });
    assert(Boolean(testTask?._id), 'Created test task in demo database');

    // Test 9: DemoEvidenceService
    console.log('\n--- 9. DemoEvidenceService ---');
    const evidenceDoc = await demoEvidenceService.recordEvidence({
      taskId: testTask.taskId,
      userId: testUser._id,
      actionType: 'SEND_OUTREACH',
      externalProvider: 'SIMULATED_GMAIL_DISPATCHER',
      verificationStatus: 'DELIVERED',
      requestSummary: '[SIMULATED] Inquiry Outreach',
      demoExecutionId: 'DEMO-EMAIL-0099',
    });
    assert(Boolean(evidenceDoc?._id), 'Evidence created in MongoDB');
    assert(evidenceDoc.metadata.isSimulated === true, 'Evidence metadata has isSimulated: true');
    assert(
      evidenceDoc.metadata.auditNote === 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
      'Evidence audit note truthfully states simulation notice'
    );

    // Test 10: DemoExecutionService Router
    console.log('\n--- 10. DemoExecutionService (Master Router) ---');
    const testApproval = {
      _id: new mongoose.Types.ObjectId(),
      actionTitle: 'Book Cardiology Appointment',
      actionType: 'BOOK_APPOINTMENT',
      actionPayload: { providerName: 'Apollo Hospital' },
      target: { name: 'Apollo Speciality Hospital' },
      taskId: testTask.taskId,
      userId: testUser._id,
      status: 'PENDING_APPROVAL',
      idempotencyKey: `idem_test_${Date.now()}`,
    };

    const routerResult = await demoExecutionService.executeAction(testApproval, testUser._id);
    assert(routerResult.isSimulated === true, 'Master router executed in demo mode');
    assert(routerResult.demoExecutionId.startsWith('DEMO-BOOKING-'), 'Router generated demo execution ID');
    assert(routerResult.status === 'CONFIRMED', 'Router booking confirmed');

    // Test 11: ApprovalService Integration Routing
    console.log('\n--- 11. ApprovalService Direct Routing ---');
    const approvalRecord = await approvalService.createApproval({
      userId: testUser._id,
      taskId: testTask.taskId,
      actionTitle: 'Inquiry to Express Chipset',
      actionType: 'SEND_OUTREACH',
      actionPayload: { message: 'Inquiry for display replacement', email: 'express@sandbox.doera.local' },
      purpose: 'Inquire regarding laptop screen repair rates.',
      target: { name: 'Express Chipset', email: 'express@sandbox.doera.local' },
    });

    assert(approvalRecord.status === 'PENDING_APPROVAL', 'Approval created as PENDING_APPROVAL');
    const approvalExec = await approvalService.approveAndExecute(testUser._id, approvalRecord._id);
    assert(approvalExec.success === true, 'Approval successfully executed');
    assert(approvalExec.approval.status === 'EXECUTED', 'Approval updated to EXECUTED');
    assert(approvalExec.executionResult.isSimulated === true, 'Execution result was routed through simulator');
    assert(
      approvalExec.executionResult.demoExecutionId.startsWith('DEMO-EMAIL-'),
      'Execution result has DEMO-EMAIL prefix'
    );

    // Test 12: Location Intelligence for 3 Guided Scenarios
    console.log('\n--- 12. Location Intelligence & 3 Guided Scenarios ---');
    const cardioPlaces = getDemoFallbackPlaces('cardiology clinics', 'Chennai');
    assert(cardioPlaces.length >= 3, 'Scenario 1 (Cardiology Chennai) has 3+ verified places');
    assert(cardioPlaces[0].dataSource === 'DEMO DATA', 'Fallback dataset has dataSource: DEMO DATA');

    const laptopPlaces = getDemoFallbackPlaces('laptop repair', 'Coimbatore');
    assert(laptopPlaces.length >= 3, 'Scenario 2 (Laptop Coimbatore) has 3+ verified places');

    const venuePlaces = getDemoFallbackPlaces('symposium venues', 'Chennai');
    assert(venuePlaces.length >= 3, 'Scenario 3 (Event Venues) has 3+ verified places');

    // Test 13: Follow-Up Response Simulation
    console.log('\n--- 13. Follow-Up Response Simulation ---');
    const followUp = await FollowUp.findOne({ userId: testUser._id });
    assert(Boolean(followUp), 'FollowUp record was created for outreach action');
    if (followUp) {
      // Simulate reply
      const simReply = await demoResponseService.generateSimulatedResponse({
        providerName: followUp.recipientName,
        recipient: followUp.recipient,
      });
      followUp.status = 'RESPONSE_RECEIVED';
      followUp.lastResponse = simReply;
      await followUp.save();
      assert(followUp.status === 'RESPONSE_RECEIVED', 'FollowUp status transitioned to RESPONSE_RECEIVED');
      assert(followUp.lastResponse.simulated === true, 'FollowUp lastResponse is marked simulated');
    }

    console.log('\n===============================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');

    await disconnectDB();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test Suite encountered fatal error:', error);
    await disconnectDB();
    process.exit(1);
  }
}

runTests();
