import mongoose from 'mongoose';
import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import Task from '../models/Task.js';
import Approval from '../models/Approval.js';
import approvalService from '../services/approvalService.js';
import { logger } from '../utils/logger.js';

const runTests = async () => {
  console.log('\n======================================================');
  console.log('   DOERA AI — HUMAN APPROVAL CENTER VERIFICATION SUITE');
  console.log('======================================================\n');

  await connectDB();

  // Find or create test users
  let testUserA = await User.findOne({ email: 'test_approver_a@doera.ai' });
  if (!testUserA) {
    testUserA = await User.create({
      name: 'Approver Alice',
      email: 'test_approver_a@doera.ai',
      password: 'hashed_password_123',
    });
  }

  let testUserB = await User.findOne({ email: 'test_approver_b@doera.ai' });
  if (!testUserB) {
    testUserB = await User.create({
      name: 'Approver Bob',
      email: 'test_approver_b@doera.ai',
      password: 'hashed_password_456',
    });
  }

  // Create a dummy Task
  const testTask = await Task.create({
    userId: testUserA._id,
    conversationId: new mongoose.Types.ObjectId(),
    taskId: `task-${Math.random().toString(36).substring(2, 8)}`,
    title: 'Find Electrical Repair Provider in Coimbatore',
    userRequest: 'Find three verified electricians in Coimbatore and get quotes',
    category: 'HOME_SERVICE',
    status: 'AWAITING_APPROVAL',
  });

  let passed = 0;
  let failed = 0;

  const assert = (condition, name) => {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name}`);
      failed++;
    }
  };

  try {
    // ------------------------------------------------------------------
    // TEST 1: Create Complete Approval Request with all 12 metadata items
    // ------------------------------------------------------------------
    console.log('\n[Test 1] Create Structured Approval Request (12-point dossier)');
    const req1 = await approvalService.createApproval({
      userId: testUserA._id,
      taskId: testTask._id,
      actionTitle: 'Inquiry Email to Apex Electricals',
      actionType: 'SEND_EMAIL',
      actionPayload: {
        recipient: 'quotes@apexelectricals.com',
        subject: 'Service Inquiry - Commercial Panel Inspection',
        emailText: 'Hello, inquiring about electrical panel maintenance availability.',
      },
      requestingAgent: 'Communication Agent',
      purpose: 'Contact primary service provider to request consultation quote.',
      target: {
        name: 'Apex Electricals',
        destination: 'quotes@apexelectricals.com',
        channel: 'Email',
        address: '102 Avinashi Road, Coimbatore',
      },
      dataDisclosure: ['Client Name', 'Service Directive', 'Service Location'],
      estimatedCost: 0,
      currency: 'INR',
      riskLevel: 'MEDIUM',
      riskExplanation: 'Dispatches external inquiry message to business email address.',
      evidence: [{ title: 'Apex Electricals', source: 'OpenStreetMap Verified', url: 'https://osm.org' }],
      executionService: 'Gmail / SMTP Transport',
      expectedResult: 'Provider receives inquiry and responds with quotation.',
    });

    assert(req1._id && req1.status === 'PENDING_APPROVAL', 'Created with status PENDING_APPROVAL');
    assert(req1.actionVersion === 1, 'Initial actionVersion is 1');
    assert(req1.riskLevel === 'MEDIUM', 'Risk level stored correctly');
    assert(req1.dataDisclosure.length === 3, 'Data disclosures recorded');

    // ------------------------------------------------------------------
    // TEST 2: Email Approval & Execution
    // ------------------------------------------------------------------
    console.log('\n[Test 2] Authorize and Execute Email Dispatch');
    const execEmail = await approvalService.approveAndExecute(testUserA._id, req1._id, {
      comments: 'Authorized by Alice for immediate dispatch',
      actionVersion: 1,
    });
    assert(execEmail.success === true, 'Approval executed successfully');
    assert(execEmail.approval.status === 'EXECUTED', 'Approval status transitioned to EXECUTED');
    assert(execEmail.approval.executionResult?.channel === 'Email (SMTP / SendGrid)', 'Execution captured email channel');

    // ------------------------------------------------------------------
    // TEST 3: Telegram Approval & Execution
    // ------------------------------------------------------------------
    console.log('\n[Test 3] Authorize and Execute Telegram Dispatch');
    const reqTelegram = await approvalService.createApproval({
      userId: testUserA._id,
      actionTitle: 'Telegram Notification to Technician Channel',
      actionType: 'SEND_TELEGRAM',
      actionPayload: { chatId: '@doera_alerts', message: 'New service request dispatched.' },
      purpose: 'Broadcast service request to local technician group.',
      requestingAgent: 'Communication Agent',
      riskLevel: 'LOW',
      target: { destination: '@doera_alerts', channel: 'Telegram' },
    });

    const execTg = await approvalService.approveAndExecute(testUserA._id, reqTelegram._id, { actionVersion: 1 });
    assert(execTg.success === true, 'Telegram approval processed');
    assert(execTg.approval.status === 'EXECUTED', 'Telegram approval marked EXECUTED');

    // ------------------------------------------------------------------
    // TEST 4: Appointment Booking Approval (High-Impact)
    // ------------------------------------------------------------------
    console.log('\n[Test 4] Authorize Appointment Booking Request');
    const reqBooking = await approvalService.createApproval({
      userId: testUserA._id,
      taskId: testTask._id,
      actionTitle: 'Book Slot with Apex Electricals',
      actionType: 'BOOK_APPOINTMENT',
      actionPayload: { providerName: 'Apex Electricals', startDateTime: new Date().toISOString() },
      purpose: 'Reserve 10:30 AM appointment slot for inspection.',
      requestingAgent: 'Scheduling Agent',
      riskLevel: 'HIGH',
      riskExplanation: 'Commits client schedule and coordinates directly with provider.',
      estimatedCost: 450,
      target: { name: 'Apex Electricals', address: '102 Avinashi Road' },
    });

    const execBooking = await approvalService.approveAndExecute(testUserA._id, reqBooking._id, { actionVersion: 1 });
    assert(execBooking.success === true, 'Booking authorization succeeded');
    assert(execBooking.approval.status === 'EXECUTED', 'Booking status marked EXECUTED');
    assert(execBooking.approval.executionResult?.bookingStatus === 'BOOKING_REQUESTED', 'Truthful booking status recorded');

    // ------------------------------------------------------------------
    // TEST 5: Form Submission Approval
    // ------------------------------------------------------------------
    console.log('\n[Test 5] Authorize Form Submission Action');
    const reqForm = await approvalService.createApproval({
      userId: testUserA._id,
      actionTitle: 'Submit Quote Form to Vendor Portal',
      actionType: 'SUBMIT_FORM',
      actionPayload: { formData: { client: 'Alice', service: 'Panel repair' } },
      purpose: 'Submit formal service inquiry through vendor web intake.',
      requestingAgent: 'Discovery Agent',
      riskLevel: 'MEDIUM',
    });

    const execForm = await approvalService.approveAndExecute(testUserA._id, reqForm._id, { actionVersion: 1 });
    assert(execForm.success === true, 'Form submission approved and executed');
    assert(execForm.approval.status === 'EXECUTED', 'Form approval marked EXECUTED');

    // ------------------------------------------------------------------
    // TEST 6: Rejection Handling & Reason Logging
    // ------------------------------------------------------------------
    console.log('\n[Test 6] Reject Proposed Action with Revision Reason');
    const reqReject = await approvalService.createApproval({
      userId: testUserA._id,
      taskId: testTask._id,
      actionTitle: 'Inquiry to High-Fee Electrician',
      actionType: 'SEND_OUTREACH',
      actionPayload: { message: 'Inquiring...' },
      purpose: 'Contact alternative provider.',
      requestingAgent: 'Communication Agent',
    });

    const rejected = await approvalService.rejectApproval(testUserA._id, reqReject._id, 'Fee estimate is too high, search another provider.');
    assert(rejected.status === 'REJECTED', 'Status changed to REJECTED');
    assert(rejected.failureReason.includes('too high'), 'Rejection reason logged accurately');

    // Verify rejected cannot be approved
    let rejectFailedToApprove = false;
    try {
      await approvalService.approveAndExecute(testUserA._id, reqReject._id, { actionVersion: 1 });
    } catch (e) {
      rejectFailedToApprove = true;
    }
    assert(rejectFailedToApprove, 'Rejected action cannot be approved later');

    // ------------------------------------------------------------------
    // TEST 7: Action Payload Editing & Version Increment
    // ------------------------------------------------------------------
    console.log('\n[Test 7] Edit Action Payload (Version Increment v1 ➔ v2)');
    const reqEdit = await approvalService.createApproval({
      userId: testUserA._id,
      actionTitle: 'Draft Message to Hospital Reception',
      actionType: 'SEND_EMAIL',
      actionPayload: { recipient: 'old@hospital.local', subject: 'Inquiry', message: 'Old message body' },
      purpose: 'Check cardiology availability.',
      requestingAgent: 'Communication Agent',
    });

    assert(reqEdit.actionVersion === 1, 'Initial version is 1');

    const edited = await approvalService.editApproval(testUserA._id, reqEdit._id, {
      target: { destination: 'cardiology@hospital.local' },
      actionPayload: { subject: 'Urgent Consultation Inquiry', message: 'Updated revised body text' },
    });

    assert(edited.actionVersion === 2, 'Action version incremented to 2');
    assert(edited.actionPayload.subject === 'Urgent Consultation Inquiry', 'Subject updated in payload');
    assert(edited.actionPayload.message === 'Updated revised body text', 'Message updated in payload');

    // ------------------------------------------------------------------
    // TEST 8: Stale Version Mismatch Protection
    // ------------------------------------------------------------------
    console.log('\n[Test 8] Version Mismatch Protection (Old version rejection)');
    let versionMismatchCaught = false;
    try {
      // User reviewed v1 but submits approval with stale v1
      await approvalService.approveAndExecute(testUserA._id, reqEdit._id, { actionVersion: 1 });
    } catch (err) {
      if (err.statusCode === 409 || err.message.includes('version mismatch')) {
        versionMismatchCaught = true;
      }
    }
    assert(versionMismatchCaught, 'Stale actionVersion 1 rejected with 409 Conflict');

    // Approving with current v2 should succeed
    const approvedV2 = await approvalService.approveAndExecute(testUserA._id, reqEdit._id, { actionVersion: 2 });
    assert(approvedV2.approval.status === 'EXECUTED', 'Approval with matching v2 succeeded');

    // ------------------------------------------------------------------
    // TEST 9: Expired Request Protection
    // ------------------------------------------------------------------
    console.log('\n[Test 9] Expired Request Protection');
    const reqExpired = await approvalService.createApproval({
      userId: testUserA._id,
      actionTitle: 'Stale Slot Inquiry',
      actionType: 'SEND_OUTREACH',
      actionPayload: { message: 'Inquiry' },
      purpose: 'Slot that expired yesterday',
      expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
    });

    let expiredCaught = false;
    try {
      await approvalService.approveAndExecute(testUserA._id, reqExpired._id, { actionVersion: 1 });
    } catch (err) {
      if (err.message.includes('expired')) expiredCaught = true;
    }
    assert(expiredCaught, 'Expired request cannot be approved');

    // ------------------------------------------------------------------
    // TEST 10: Duplicate Click / Idempotency Protection
    // ------------------------------------------------------------------
    console.log('\n[Test 10] Duplicate Click & Idempotency Protection');
    // Try to approve already executed req1
    const duplicateApprove = await approvalService.approveAndExecute(testUserA._id, req1._id, { actionVersion: 1 });
    assert(duplicateApprove.alreadyExecuted === true, 'Duplicate approval request handled safely without re-execution');

    // ------------------------------------------------------------------
    // TEST 11: Unauthorized User Access Control
    // ------------------------------------------------------------------
    console.log('\n[Test 11] Cross-User Security Check');
    let unauthorizedCaught = false;
    try {
      // User B attempts to approve User A's approval
      await approvalService.approveAndExecute(testUserB._id, req1._id, { actionVersion: 1 });
    } catch (err) {
      unauthorizedCaught = true;
    }
    assert(unauthorizedCaught, 'User B blocked from accessing or approving User A request');

    // ------------------------------------------------------------------
    // TEST 12: Filtering & Counting Verification
    // ------------------------------------------------------------------
    console.log('\n[Test 12] Dashboard Filter & Count Logic');
    const listPending = await approvalService.getApprovals(testUserA._id, { status: 'pending' });
    const listExecuted = await approvalService.getApprovals(testUserA._id, { status: 'executed' });
    const counts = await approvalService.getApprovalCounts(testUserA._id);

    assert(Array.isArray(listPending.approvals), 'Pending approvals returns list');
    assert(listExecuted.approvals.length > 0, 'Executed approvals contains completed items');
    assert(typeof counts.total === 'number' && counts.total > 0, 'Approval counts returns structured metrics');

    console.log('\n======================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
};

runTests();
