import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/server.js';
import User from '../src/models/User.js';
import Integration from '../src/models/Integration.js';
import Approval from '../src/models/Approval.js';
import Task from '../src/models/Task.js';
import { setupTestDB } from './setup.js';
import { encrypt } from '../src/utils/encryption.js';
import { config } from '../src/config/env.js';
import executionAuthorizationService from '../src/services/executionAuthorizationService.js';
import emailAdapter from '../src/integrations/emailAdapter.js';
import googleAuthService from '../src/services/googleAuthService.js';

describe('DOERA AI — Dual Execution Modes (Google OAuth vs Manual Login) & 12 Security Tests', () => {
  setupTestDB();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create a verified Google user
  const createGoogleUser = async (name, email, googleId) => {
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      googleId,
      googleSubjectId: googleId,
      googleEmail: email.toLowerCase(),
      authProvider: 'google',
      executionMode: 'REAL',
      gmailIntegrationStatus: 'not_connected',
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role, executionMode: 'REAL', authProvider: 'google' },
      config.jwtSecret,
      { expiresIn: '1d' }
    );

    return { user, token };
  };

  // Helper to connect Gmail integration for a user
  const connectUserGmail = async (userId, email) => {
    return await Integration.create({
      userId,
      provider: 'gmail',
      providerAccountId: `gid_${email}`,
      providerEmail: email.toLowerCase(),
      accountEmail: email.toLowerCase(),
      encryptedRefreshToken: encrypt(`mock_refresh_token_for_${email}`),
      grantedScopes: ['https://www.googleapis.com/auth/gmail.send'],
      connectionStatus: 'connected',
      status: 'connected',
    });
  };

  // =========================================================================
  // TEST A: User A signs in using Google. Connects Gmail A. Sends an approved email. Expected sender: Gmail A.
  // =========================================================================
  it('TEST A: User A with connected Gmail sends approved email strictly from Gmail A', async () => {
    const { user: userA, token: tokenA } = await createGoogleUser('Alice', 'userA@gmail.com', 'google_sub_A');
    await connectUserGmail(userA._id, 'userA@gmail.com');
    await User.findByIdAndUpdate(userA._id, { gmailIntegrationStatus: 'connected' });

    // Mock direct Gmail OAuth dispatch
    const sendSpy = jest.spyOn(emailAdapter, 'sendViaGmailOAuth').mockResolvedValueOnce({
      success: true,
      provider: 'GMAIL_OAUTH2',
      messageId: 'gmail_msg_id_A_123',
      threadId: 'thread_A',
      status: 'DELIVERED',
    });

    // Mock token refresh
    jest.spyOn(googleAuthService, 'getFreshAccessToken').mockResolvedValueOnce({
      accessToken: 'fresh_token_A',
      expiryDate: new Date(Date.now() + 3600000),
    });

    // Create pending approval
    const approval = await Approval.create({
      userId: userA._id,
      actionTitle: 'Inquiry to Clinic A',
      actionType: 'SEND_EMAIL',
      actionPayload: {
        subject: 'Appointment Inquiry',
        emailHtml: '<p>Hello Doctor</p>',
      },
      actionVersion: 1,
      purpose: 'Cardiology appointment coordination',
      target: { email: 'clinic@hospital.com', name: 'Apollo Clinic' },
      status: 'PENDING_APPROVAL',
      executionMode: 'REAL',
      senderEmail: 'userA@gmail.com',
    });

    const res = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ actionVersion: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.executionResult.sender.toLowerCase()).toBe('usera@gmail.com');
    expect(res.body.executionResult.messageId).toBe('gmail_msg_id_A_123');
    expect(sendSpy).toHaveBeenCalled();
  });

  // =========================================================================
  // TEST B: User B signs in using Google. Connects Gmail B. Sends an approved email. Expected sender: Gmail B.
  // =========================================================================
  it('TEST B: User B with connected Gmail sends approved email strictly from Gmail B', async () => {
    const { user: userB, token: tokenB } = await createGoogleUser('Bob', 'userB@gmail.com', 'google_sub_B');
    await connectUserGmail(userB._id, 'userB@gmail.com');
    await User.findByIdAndUpdate(userB._id, { gmailIntegrationStatus: 'connected' });

    const sendSpy = jest.spyOn(emailAdapter, 'sendViaGmailOAuth').mockResolvedValueOnce({
      success: true,
      provider: 'GMAIL_OAUTH2',
      messageId: 'gmail_msg_id_B_456',
      threadId: 'thread_B',
      status: 'DELIVERED',
    });

    jest.spyOn(googleAuthService, 'getFreshAccessToken').mockResolvedValueOnce({
      accessToken: 'fresh_token_B',
      expiryDate: new Date(Date.now() + 3600000),
    });

    const approval = await Approval.create({
      userId: userB._id,
      actionTitle: 'Inquiry to Lab B',
      actionType: 'SEND_EMAIL',
      actionPayload: {
        subject: 'Lab Results Check',
        emailHtml: '<p>Please send report</p>',
      },
      actionVersion: 1,
      purpose: 'Diagnostic report check',
      target: { email: 'lab@diagnostics.com', name: 'Diagnostic Lab' },
      status: 'PENDING_APPROVAL',
      executionMode: 'REAL',
      senderEmail: 'userB@gmail.com',
    });

    const res = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ actionVersion: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.executionResult.sender.toLowerCase()).toBe('userb@gmail.com');
    expect(res.body.executionResult.messageId).toBe('gmail_msg_id_B_456');
    expect(sendSpy).toHaveBeenCalled();
  });

  // =========================================================================
  // TEST C: User A attempts to access Gmail B. Expected: Access denied.
  // =========================================================================
  it('TEST C: User A attempts to access User B approval or credentials -> Access Denied', async () => {
    const { user: userA, token: tokenA } = await createGoogleUser('Alice', 'userA@gmail.com', 'google_sub_A');
    const { user: userB } = await createGoogleUser('Bob', 'userB@gmail.com', 'google_sub_B');

    // Create approval belonging to User B
    const approvalB = await Approval.create({
      userId: userB._id,
      actionTitle: 'Secret Action of User B',
      actionType: 'SEND_EMAIL',
      actionPayload: { subject: 'Confidential' },
      purpose: 'Confidential inquiry',
      target: { email: 'recipient@test.com' },
      status: 'PENDING_APPROVAL',
    });

    // User A tries to view User B approval
    const viewRes = await request(app)
      .get(`/api/approvals/${approvalB._id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(viewRes.status).toBe(500); // Service throws Approval request not found

    // User A tries to approve User B action
    const approveRes = await request(app)
      .post(`/api/approvals/${approvalB._id}/approve`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ actionVersion: 1 });

    expect(approveRes.status).toBe(500);

    // Verify User A cannot fetch integrations of User B
    const integrationsRes = await request(app)
      .get('/api/integrations')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(integrationsRes.status).toBe(200);
    expect(integrationsRes.body.integrations.gmail.connected).toBe(false);
  });

  // =========================================================================
  // TEST D: User signs in using Google but does not connect Gmail. Expected: Real email sending blocked.
  // =========================================================================
  it('TEST D: Google user without connected Gmail -> Real email sending blocked', async () => {
    const { user: userD, token: tokenD } = await createGoogleUser('Dan', 'dan@gmail.com', 'google_sub_D');
    // Deliberately do NOT connect Gmail for Dan

    const approval = await Approval.create({
      userId: userD._id,
      actionTitle: 'Outreach to Specialist',
      actionType: 'SEND_EMAIL',
      actionPayload: { subject: 'Specialist appointment' },
      actionVersion: 1,
      purpose: 'Cardiology appointment',
      target: { email: 'specialist@hospital.com' },
      status: 'PENDING_APPROVAL',
    });

    const res = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${tokenD}`)
      .send({ actionVersion: 1 });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Gmail connection required');
  });

  // =========================================================================
  // TEST E: User registers manually using email/password. Expected: Demo mode only; all outbound actions simulated.
  // =========================================================================
  it('TEST E: Manually registered email/password user receives DEMO mode with simulated actions', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Manual Judge',
        email: 'judge@doera.ai',
        password: 'Password123!',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.authProvider).toBe('local');
    expect(regRes.body.user.executionMode).toBe('DEMO');

    const manualToken = regRes.body.token;

    // Create an approval for this manual user
    const approval = await Approval.create({
      userId: regRes.body.user.id,
      actionTitle: 'Simulated Email Outreach',
      actionType: 'SEND_EMAIL',
      actionPayload: { subject: 'Demo Inquiry', message: 'Simulated test' },
      actionVersion: 1,
      purpose: 'Hackathon demonstration',
      target: { email: 'provider@business.com', name: 'Demo Provider' },
      status: 'PENDING_APPROVAL',
    });

    const approveRes = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${manualToken}`)
      .send({ actionVersion: 1 });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.executionResult.isSimulated).toBe(true);
    expect(approveRes.body.executionResult.simulationNotice).toContain('SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED.');
  });

  // =========================================================================
  // TEST F: Manual user attempts to modify executionMode in frontend or API request. Expected: Ignored/rejected.
  // =========================================================================
  it('TEST F: Manual user cannot spoof executionMode to REAL', async () => {
    // Attempt to register with executionMode: REAL
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker User',
        email: 'hacker@example.com',
        password: 'Password123!',
        executionMode: 'REAL',
        authProvider: 'google',
      });

    expect(regRes.status).toBe(201);
    // Backend strictly ignores payload and enforces local & DEMO
    expect(regRes.body.user.executionMode).toBe('DEMO');
    expect(regRes.body.user.authProvider).toBe('local');

    // /auth/me check
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${regRes.body.token}`);

    expect(meRes.body.user.executionMode).toBe('DEMO');
    expect(meRes.body.user.authProvider).toBe('local');
  });

  // =========================================================================
  // TEST G: Google user attempts to send without approval. Expected: Execution blocked.
  // =========================================================================
  it('TEST G: Direct action execution without valid approval request is blocked', async () => {
    const { token } = await createGoogleUser('Grace', 'grace@gmail.com', 'google_sub_G');

    // Attempt to execute a non-existent approval ID
    const randomId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post(`/api/approvals/${randomId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionVersion: 1 });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('not found');
  });

  // =========================================================================
  // TEST H: Google user changes recipient after approval. Expected: New approval required.
  // =========================================================================
  it('TEST H: Modifying approval payload increments actionVersion and requires review', async () => {
    const { user, token } = await createGoogleUser('Henry', 'henry@gmail.com', 'google_sub_H');

    const approval = await Approval.create({
      userId: user._id,
      actionTitle: 'Original Email to Clinic',
      actionType: 'SEND_EMAIL',
      actionPayload: { subject: 'Original Subject' },
      actionVersion: 1,
      purpose: 'Cardiology appointment',
      target: { email: 'clinic1@hospital.com' },
      status: 'PENDING_APPROVAL',
    });

    // User edits the approval to change recipient/title
    const editRes = await request(app)
      .put(`/api/approvals/${approval._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        actionTitle: 'Tampered Email to Different Recipient',
        target: { email: 'attacker@evil.com' },
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.approval.actionVersion).toBe(2);

    // Attempting to authorize using old actionVersion (v1) must be rejected with 409 Conflict
    const approveOldRes = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionVersion: 1 });

    expect(approveOldRes.status).toBe(409);
    expect(approveOldRes.body.error).toContain('Action version mismatch');
  });

  // =========================================================================
  // TEST I: OAuth token expires. Expected: Secure refresh or reconnect request.
  // =========================================================================
  it('TEST I: Expired or revoked OAuth token triggers clean reconnect error', async () => {
    const { user, token } = await createGoogleUser('Ian', 'ian@gmail.com', 'google_sub_I');
    await connectUserGmail(user._id, 'ian@gmail.com');
    await User.findByIdAndUpdate(user._id, { gmailIntegrationStatus: 'connected' });

    // Mock token refresh failure
    jest.spyOn(googleAuthService, 'getFreshAccessToken').mockRejectedValueOnce(
      new Error('invalid_grant: Token has been expired or revoked.')
    );

    const approval = await Approval.create({
      userId: user._id,
      actionTitle: 'Email with Expired Token',
      actionType: 'SEND_EMAIL',
      actionPayload: { subject: 'Test' },
      actionVersion: 1,
      purpose: 'Test expired token',
      target: { email: 'target@test.com' },
      status: 'PENDING_APPROVAL',
    });

    const res = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionVersion: 1 });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('expired or was revoked');
  });

  // =========================================================================
  // TEST J: Gmail integration disconnected. Expected: Real sending blocked.
  // =========================================================================
  it('TEST J: Disconnecting Gmail integration prevents real email dispatching', async () => {
    const { user, token } = await createGoogleUser('Jack', 'jack@gmail.com', 'google_sub_J');
    await connectUserGmail(user._id, 'jack@gmail.com');
    await User.findByIdAndUpdate(user._id, { gmailIntegrationStatus: 'connected' });

    // Disconnect Gmail via API
    const disconnectRes = await request(app)
      .post('/api/integrations/gmail/disconnect')
      .set('Authorization', `Bearer ${token}`);

    expect(disconnectRes.status).toBe(200);
    expect(disconnectRes.body.success).toBe(true);

    // Verify integration is disconnected
    const integration = await Integration.findOne({ userId: user._id, provider: 'gmail' });
    expect(integration.status).toBe('disconnected');

    // Attempting to send an approved email must now be blocked
    const approval = await Approval.create({
      userId: user._id,
      actionTitle: 'Post-Disconnect Email',
      actionType: 'SEND_EMAIL',
      actionPayload: { subject: 'Blocked email' },
      actionVersion: 1,
      purpose: 'Testing post-disconnect behavior',
      target: { email: 'destination@test.com' },
      status: 'PENDING_APPROVAL',
    });

    const sendRes = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionVersion: 1 });

    expect(sendRes.status).toBe(500);
    expect(sendRes.body.error).toContain('Gmail connection required');
  });

  // =========================================================================
  // TEST K: n8n unavailable. Expected: Correct failure status without duplicate email sending.
  // =========================================================================
  it('TEST K: When n8n webhook is unreachable, falls back to direct dispatch without duplicate sending', async () => {
    const { user, token } = await createGoogleUser('Kevin', 'kevin@gmail.com', 'google_sub_K');
    await connectUserGmail(user._id, 'kevin@gmail.com');
    await User.findByIdAndUpdate(user._id, { gmailIntegrationStatus: 'connected' });

    process.env.N8N_WEBHOOK_URL = 'http://127.0.0.1:59999/unreachable_webhook';

    const sendSpy = jest.spyOn(emailAdapter, 'sendViaGmailOAuth').mockResolvedValueOnce({
      success: true,
      provider: 'GMAIL_OAUTH2',
      messageId: 'gmail_fallback_msg_123',
      threadId: 'thread_fallback',
      status: 'DELIVERED',
    });

    jest.spyOn(googleAuthService, 'getFreshAccessToken').mockResolvedValueOnce({
      accessToken: 'fresh_token_K',
      expiryDate: new Date(Date.now() + 3600000),
    });

    const approval = await Approval.create({
      userId: user._id,
      actionTitle: 'n8n Fallback Test',
      actionType: 'SEND_EMAIL',
      actionPayload: { subject: 'Testing n8n outage' },
      actionVersion: 1,
      purpose: 'Resilience check',
      target: { email: 'provider@test.com' },
      status: 'PENDING_APPROVAL',
    });

    const res = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionVersion: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1); // Executed exactly once
  });

  // =========================================================================
  // TEST L: Duplicate execution request. Expected: Only one email operation.
  // =========================================================================
  it('TEST L: Duplicate execution requests are prevented via idempotency key and status checks', async () => {
    const { user, token } = await createGoogleUser('Leo', 'leo@gmail.com', 'google_sub_L');
    await connectUserGmail(user._id, 'leo@gmail.com');
    await User.findByIdAndUpdate(user._id, { gmailIntegrationStatus: 'connected' });

    const sendSpy = jest.spyOn(emailAdapter, 'sendViaGmailOAuth').mockResolvedValueOnce({
      success: true,
      provider: 'GMAIL_OAUTH2',
      messageId: 'gmail_dedup_msg_789',
      status: 'DELIVERED',
    });

    jest.spyOn(googleAuthService, 'getFreshAccessToken').mockResolvedValue({
      accessToken: 'fresh_token_L',
      expiryDate: new Date(Date.now() + 3600000),
    });

    const approval = await Approval.create({
      userId: user._id,
      actionTitle: 'Single Dispatch Check',
      actionType: 'SEND_EMAIL',
      actionPayload: { subject: 'Idempotency check' },
      actionVersion: 1,
      purpose: 'Prevent duplicate email dispatch',
      target: { email: 'vendor@test.com' },
      status: 'PENDING_APPROVAL',
      idempotencyKey: 'idem_key_unique_12345',
    });

    // First call
    const res1 = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionVersion: 1, idempotencyKey: 'idem_key_unique_12345' });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Second duplicate call
    const res2 = await request(app)
      .post(`/api/approvals/${approval._id}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ actionVersion: 1, idempotencyKey: 'idem_key_unique_12345' });

    expect(res2.status).toBe(200);
    expect(res2.body.alreadyExecuted).toBe(true);
    expect(sendSpy).toHaveBeenCalledTimes(1); // Still exactly one dispatch!
  });
});
