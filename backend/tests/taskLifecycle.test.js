import request from 'supertest';
import app from '../src/server.js';
import Task from '../src/models/Task.js';
import { setupTestDB } from './setup.js';

describe('DOERA AI — Task Lifecycle & n8n Integration Tests', () => {
  setupTestDB();

  let authToken;
  let testUserId;

  beforeEach(async () => {
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Task Tester',
      email: `tester-${Date.now()}@example.com`,
      password: 'SecurePassword123!',
    });
    authToken = regRes.body.token;
    testUserId = regRes.body.user.id;
  });

  it('should create conversation and launch a real background task from chat message', async () => {
    const res = await request(app)
      .post('/api/chat/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Find an electrician near me, compare quotations and arrange an appointment.',
      });

    expect(res.status).toBe(200);
    expect(res.body.conversation).toBeDefined();
    expect(res.body.userMessage.content).toContain('electrician');
    expect(res.body.task).toBeDefined();
    expect(res.body.task.status).toBe('RECEIVED');
    expect(res.body.task.currentAgent).toBe('Orchestrator');
  });

  it('should allow user to approve a pending task', async () => {
    // Create task in AWAITING_APPROVAL state
    const task = await Task.create({
      taskId: 'test-approval-task',
      userId: testUserId,
      conversationId: '507f1f77bcf86cd799439011',
      userRequest: 'Contact provider',
      status: 'AWAITING_APPROVAL',
      pendingApproval: {
        actionType: 'SEND_OUTREACH',
        description: 'Authorize email outreach',
      },
    });

    const approveRes = await request(app)
      .post(`/api/tasks/${task.taskId}/approve`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ comments: 'Approved by tester' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.task.status).toBe('EXECUTING');
    expect(approveRes.body.task.pendingApproval.approvedAt).toBeDefined();
  });

  it('should allow user to cancel a running task', async () => {
    const task = await Task.create({
      taskId: 'test-cancel-task',
      userId: testUserId,
      conversationId: '507f1f77bcf86cd799439011',
      userRequest: 'Find donation centers',
      status: 'EXECUTING',
    });

    const cancelRes = await request(app)
      .post(`/api/tasks/${task.taskId}/cancel`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.task.status).toBe('CANCELLED');
  });

  it('should execute Native Workflows directly in Node.js without external dependencies', async () => {
    const task = await Task.create({
      taskId: 'native-wf-test-task',
      userId: testUserId,
      conversationId: '507f1f77bcf86cd799439011',
      userRequest: 'Manual native workflow test',
      status: 'EXECUTING',
    });

    const { nativeWorkflows } = await import('../src/workflows/nativeWorkflows.js');

    const triggerRes = await nativeWorkflows.triggerTaskExecution(task);
    expect(triggerRes.success).toBe(true);

    const schedRes = await nativeWorkflows.executeScheduling({
      task,
      providerContact: { businessName: 'Native Service Hub', address: '123 Main St' },
      preferredSlot: 'Tomorrow at 10:30 AM',
    });
    expect(schedRes.success).toBe(true);
    expect(schedRes.bookingDetails.referenceId).toMatch(/^DOERA-BK-/);

    task.status = 'COMPLETED';
    const compRes = await nativeWorkflows.executeTaskCompletion(task);
    expect(compRes.success).toBe(true);
  });
});
