import mongoose from 'mongoose';
import { config } from '../config/env.js';
import demoExecutionService from './demo/DemoExecutionService.js';
import executionAuthorizationService from './executionAuthorizationService.js';
import Approval from '../models/Approval.js';
import Task from '../models/Task.js';
import Integration from '../models/Integration.js';
import AgentExecution from '../models/AgentExecution.js';
import taskQueue from '../queue/taskQueue.js';
import emailAdapter from '../integrations/emailAdapter.js';
import whatsappAdapter from '../integrations/whatsappAdapter.js';
import calendarAdapter from '../integrations/calendarAdapter.js';
import realtimeServer from '../websocket/wsServer.js';
import { buildTaskLookup } from '../utils/queryHelper.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';

class ApprovalService {
  /**
   * Auto-expire any pending approvals that have exceeded their expiresAt deadline
   */
  async expireStaleApprovals(userId) {
    try {
      const now = new Date();
      await Approval.updateMany(
        {
          userId,
          status: 'PENDING_APPROVAL',
          expiresAt: { $lt: now },
        },
        {
          $set: {
            status: 'EXPIRED',
            failureReason: 'Approval request expired before user confirmation.',
          },
        }
      );
    } catch (err) {
      logger.warn('[ApprovalService] Stale approvals check notice:', err.message);
    }
  }

  /**
   * Create a new Human Approval Request
   */
  async createApproval(data) {
    const {
      userId,
      taskId,
      actionTitle,
      actionType,
      actionPayload,
      requestingAgent,
      purpose,
      target,
      dataDisclosure,
      estimatedCost,
      currency,
      riskLevel,
      riskExplanation,
      evidence,
      executionService,
      expectedResult,
      expiresAt,
      idempotencyKey,
    } = data;

    if (!userId || !actionTitle || !actionType || !actionPayload || !purpose) {
      throw new Error('Missing required fields for approval request creation.');
    }

    // Default expiration is 24 hours from now
    const expirationDate = expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
    const key = idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Resolve task reference safely if taskId provided
    let resolvedTaskId = taskId || null;
    if (taskId) {
      try {
        const linkedTask = await Task.findOne(buildTaskLookup(taskId));
        if (linkedTask) {
          resolvedTaskId = linkedTask._id;
        }
      } catch (err) {
        logger.debug('[ApprovalService] Task lookup notice on create:', err.message);
      }
    }

    // Automatically determine sender identity and execution mode
    let senderEmail = null;
    let effectiveExecutionMode = 'DEMO';
    try {
      const eligibility = await executionAuthorizationService.evaluateUserEligibility(userId);
      if (eligibility.mode === 'REAL') {
        effectiveExecutionMode = 'REAL';
        senderEmail = eligibility.gmailEmail;
      }
    } catch (modeErr) {
      logger.debug('[ApprovalService] Mode evaluation notice on create:', modeErr.message);
    }

    const approval = await Approval.create({
      userId,
      taskId: resolvedTaskId,
      actionTitle,
      actionType,
      actionPayload,
      actionVersion: 1,
      requestingAgent: requestingAgent || 'Communication Agent',
      purpose,
      target: target || {},
      dataDisclosure: Array.isArray(dataDisclosure) ? dataDisclosure : [],
      estimatedCost: Number(estimatedCost) || 0,
      currency: currency || 'INR',
      senderEmail,
      executionMode: effectiveExecutionMode,
      riskLevel: riskLevel || 'MEDIUM',
      riskExplanation: riskExplanation || 'Requires external dispatch or data disclosure.',
      evidence: Array.isArray(evidence) ? evidence : [],
      executionService: executionService || 'Direct Verified Integration',
      expectedResult: expectedResult || 'Action will be executed externally upon approval.',
      status: 'PENDING_APPROVAL',
      requestedAt: new Date(),
      expiresAt: expirationDate,
      idempotencyKey: key,
    });

    // Notify user via WebSocket in real-time
    realtimeServer.sendToUser(userId, 'approval_created', { approval });

    logger.info(`[ApprovalService] Created approval request ${approval._id} (${actionTitle}) for user ${userId}`);
    return approval;
  }

  /**
   * List approvals with status filtering, search, and pagination
   */
  async getApprovals(userId, options = {}) {
    await this.expireStaleApprovals(userId);

    const {
      status = 'all',
      riskLevel,
      search = '',
      page = 1,
      limit = 20,
    } = options;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };

    // Status filter
    if (status === 'pending') {
      filter.status = 'PENDING_APPROVAL';
    } else if (status === 'approved') {
      filter.status = 'APPROVED';
    } else if (status === 'rejected') {
      filter.status = 'REJECTED';
    } else if (status === 'executed') {
      filter.status = 'EXECUTED';
    } else if (status === 'history') {
      filter.status = { $in: ['APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTING', 'EXECUTED', 'FAILED'] };
    }

    // Risk level filter
    if (riskLevel && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(riskLevel.toUpperCase())) {
      filter.riskLevel = riskLevel.toUpperCase();
    }

    // Search query
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { actionTitle: searchRegex },
        { purpose: searchRegex },
        { requestingAgent: searchRegex },
        { 'target.name': searchRegex },
        { 'target.destination': searchRegex },
      ];
    }

    const [rawApprovals, total, countsRaw] = await Promise.all([
      Approval.find(filter)
        .sort({ requestedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Approval.countDocuments(filter),
      Approval.aggregate([
        { $match: { userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // Batch resolve linked tasks safely without CastError
    const validObjectIds = [];
    const stringTaskIds = [];

    for (const appr of rawApprovals) {
      if (appr.taskId) {
        const sId = String(appr.taskId);
        if (mongoose.Types.ObjectId.isValid(sId) && new mongoose.Types.ObjectId(sId).toString() === sId) {
          validObjectIds.push(new mongoose.Types.ObjectId(sId));
        } else {
          stringTaskIds.push(sId);
        }
      }
    }

    const orConditions = [];
    if (validObjectIds.length > 0) {
      orConditions.push({ _id: { $in: validObjectIds } });
    }
    if (stringTaskIds.length > 0) {
      orConditions.push({ taskId: { $in: stringTaskIds } });
    }

    const taskMap = new Map();
    if (orConditions.length > 0) {
      try {
        const tasks = await Task.find({ $or: orConditions })
          .select('taskId title status userRequest category externalContacts')
          .lean();
        tasks.forEach((t) => {
          taskMap.set(String(t._id), t);
          if (t.taskId) taskMap.set(String(t.taskId), t);
        });
      } catch (tErr) {
        logger.warn('[ApprovalService] Batch task lookup notice:', tErr.message);
      }
    }

    const approvals = rawApprovals.map((appr) => {
      const doc = appr.toObject ? appr.toObject({ virtuals: true }) : { ...appr };
      if (doc.taskId) {
        const matched = taskMap.get(String(doc.taskId));
        if (matched) {
          doc.task = matched;
          doc.taskId = matched;
        }
      }
      return doc;
    });

    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      executed: 0,
      failed: 0,
      expired: 0,
      total: 0,
    };

    countsRaw.forEach((c) => {
      counts.total += c.count;
      if (c._id === 'PENDING_APPROVAL') counts.pending = c.count;
      else if (c._id === 'APPROVED') counts.approved = c.count;
      else if (c._id === 'REJECTED') counts.rejected = c.count;
      else if (c._id === 'EXECUTED') counts.executed = c.count;
      else if (c._id === 'FAILED') counts.failed = c.count;
      else if (c._id === 'EXPIRED') counts.expired = c.count;
    });

    return {
      approvals,
      counts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Fast badge counts for header / sidebar
   */
  async getApprovalCounts(userId) {
    await this.expireStaleApprovals(userId);

    const countsRaw = await Approval.aggregate([
      { $match: { userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const counts = {
      pending: 0,
      approved: 0,
      rejected: 0,
      executed: 0,
      failed: 0,
      expired: 0,
      total: 0,
    };

    countsRaw.forEach((c) => {
      counts.total += c.count;
      if (c._id === 'PENDING_APPROVAL') counts.pending = c.count;
      else if (c._id === 'APPROVED') counts.approved = c.count;
      else if (c._id === 'REJECTED') counts.rejected = c.count;
      else if (c._id === 'EXECUTED') counts.executed = c.count;
      else if (c._id === 'FAILED') counts.failed = c.count;
      else if (c._id === 'EXPIRED') counts.expired = c.count;
    });

    return counts;
  }

  /**
   * Get single approval request by ID
   */
  async getApprovalById(userId, id) {
    const approval = await Approval.findOne({ _id: id, userId });

    if (!approval) {
      throw new Error('Approval request not found.');
    }

    if (approval.status === 'PENDING_APPROVAL' && approval.isExpired()) {
      approval.status = 'EXPIRED';
      approval.failureReason = 'Approval request expired before user confirmation.';
      await approval.save();
    }

    const doc = approval.toObject ? approval.toObject({ virtuals: true }) : { ...approval };
    if (doc.taskId) {
      try {
        const task = await Task.findOne(buildTaskLookup(doc.taskId))
          .select('taskId title status userRequest category externalContacts')
          .lean();
        if (task) {
          doc.task = task;
          doc.taskId = task;
        }
      } catch (tErr) {
        logger.warn('[ApprovalService] Task lookup notice on getApprovalById:', tErr.message);
      }
    }

    return doc;
  }

  /**
   * Edit pending approval request
   * Modifying payload increments actionVersion and resets to PENDING_APPROVAL
   */
  async editApproval(userId, id, updates) {
    const approval = await Approval.findOne({ _id: id, userId });
    if (!approval) {
      throw new Error('Approval request not found.');
    }

    if (approval.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot edit an approval request in status "${approval.status}". Only pending requests can be modified.`);
    }

    if (approval.isExpired()) {
      approval.status = 'EXPIRED';
      await approval.save();
      throw new Error('Approval request has expired and cannot be edited.');
    }

    const { actionPayload, target, actionTitle, purpose } = updates;

    if (actionPayload) {
      approval.actionPayload = {
        ...approval.actionPayload,
        ...actionPayload,
      };
    }

    if (target) {
      approval.target = {
        ...approval.target,
        ...target,
      };
    }

    if (actionTitle) approval.actionTitle = actionTitle.trim();
    if (purpose) approval.purpose = purpose.trim();

    // Increment version to enforce explicit review of modified payload
    approval.actionVersion = (approval.actionVersion || 1) + 1;
    approval.requestedAt = new Date();
    await approval.save();

    // Sync updated payload to associated Task if present
    if (approval.taskId) {
      const task = await Task.findOne(buildTaskLookup(approval.taskId));
      if (task && task.pendingApproval) {
        task.pendingApproval.details = approval.actionPayload;
        task.pendingApproval.description = approval.actionTitle;
        await task.save().catch(() => {});
        realtimeServer.sendToUser(userId, 'task_update', { task });
      }
    }

    realtimeServer.sendToUser(userId, 'approval_updated', { approval });
    logger.info(`[ApprovalService] Updated approval request ${id} to version ${approval.actionVersion}`);
    return approval;
  }

  /**
   * Approve and immediately execute the action
   * Enforces version verification, expiration checks, and idempotency protection
   */
  async approveAndExecute(userId, id, options = {}) {
    const { comments = '', actionVersion, idempotencyKey } = options;

    const approval = await Approval.findOne({ _id: id, userId });
    if (!approval) {
      throw new Error('Approval request not found.');
    }

    // Expiration check
    if (approval.isExpired()) {
      approval.status = 'EXPIRED';
      approval.failureReason = 'Approval request expired before user confirmation.';
      await approval.save();
      throw new Error('This approval request has expired and cannot be approved.');
    }

    // Status check
    if (approval.status === 'APPROVED' || approval.status === 'EXECUTED' || approval.status === 'EXECUTING') {
      return {
        alreadyExecuted: true,
        approval,
        message: 'This action has already been authorized or executed.',
      };
    }

    if (approval.status === 'REJECTED') {
      throw new Error('This action was previously rejected and cannot be approved.');
    }

    if (approval.status !== 'PENDING_APPROVAL' && approval.status !== 'FAILED') {
      throw new Error(`Cannot approve request in status "${approval.status}".`);
    }

    // Strict actionVersion verification
    if (typeof actionVersion === 'number' && actionVersion !== approval.actionVersion) {
      const err = new Error(
        `Action version mismatch (Reviewed: v${actionVersion}, Current: v${approval.actionVersion}). The action details were modified. Please review the updated version before authorizing.`
      );
      err.statusCode = 409;
      throw err;
    }

    // Idempotency check
    if (idempotencyKey && approval.idempotencyKey === idempotencyKey && approval.status === 'EXECUTED') {
      return { alreadyExecuted: true, approval };
    }

    // Transition to APPROVED and EXECUTING
    approval.status = 'EXECUTING';
    approval.failureReason = null;
    approval.approvedAt = new Date();
    approval.approvedBy = userId;
    approval.decisionComments = comments;
    if (idempotencyKey) approval.idempotencyKey = idempotencyKey;
    await approval.save();

    realtimeServer.sendToUser(userId, 'approval_updated', { approval });

    // Execute the action with honest tracking
    let executionResult;
    try {
      executionResult = await this.executeAction(approval, userId);
      approval.status = 'EXECUTED';
      approval.executedAt = new Date();
      approval.executionResult = executionResult;
      await approval.save();

      // Log execution trace in AgentExecution
      if (approval.taskId) {
        await AgentExecution.create({
          taskId: approval.taskId,
          agentName: approval.requestingAgent,
          agentType: 'human_authorized_action',
          status: 'completed',
          input: {
            approvalId: approval._id,
            actionType: approval.actionType,
            actionVersion: approval.actionVersion,
            target: approval.target,
          },
          output: executionResult,
          metadata: {
            approvedBy: userId,
            executionService: approval.executionService,
            executedAt: approval.executedAt,
          },
        }).catch(() => {});
      }

      // Resume linked Task
      if (approval.taskId) {
        await this.resumeTaskAfterApproval(approval, executionResult);
      }

      realtimeServer.sendToUser(userId, 'approval_updated', { approval });
      return { success: true, approval, executionResult };
    } catch (execErr) {
      logger.error(`[ApprovalService] Execution failed for approval ${id}:`, execErr.message);
      approval.status = 'FAILED';
      approval.failureReason = execErr.message;
      approval.executionResult = {
        error: execErr.message,
        failedAt: new Date(),
      };
      await approval.save();

      if (approval.taskId) {
        const task = await Task.findOne(buildTaskLookup(approval.taskId));
        if (task) {
          task.status = 'FAILED';
          task.currentAction = `Execution failed: ${execErr.message}`;
          task.error = { message: execErr.message, occurredAt: new Date() };
          await task.save().catch(() => {});
          realtimeServer.sendToUser(userId, 'task_update', { task });
        }
      }

      realtimeServer.sendToUser(userId, 'approval_updated', { approval });
      throw new Error(`Action execution failed: ${execErr.message}`);
    }
  }

  /**
   * Reject an approval request
   */
  async rejectApproval(userId, id, reason = '') {
    const approval = await Approval.findOne({ _id: id, userId });
    if (!approval) {
      throw new Error('Approval request not found.');
    }

    if (approval.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot reject request in status "${approval.status}".`);
    }

    approval.status = 'REJECTED';
    approval.rejectedAt = new Date();
    approval.failureReason = reason || 'Rejected by user';
    approval.decisionComments = reason || '';
    await approval.save();

    // Cancel / update linked Task
    if (approval.taskId) {
      const task = await Task.findOne(buildTaskLookup(approval.taskId));
      if (task) {
        task.status = 'CANCELLED';
        task.currentAction = `Action rejected by user: ${reason || 'No comments provided'}`;
        if (task.pendingApproval) {
          task.pendingApproval.rejectedAt = new Date();
          task.pendingApproval.comments = reason;
        }
        await task.save().catch(() => {});
        realtimeServer.sendToUser(userId, 'task_update', { task });
      }
    }

    realtimeServer.sendToUser(userId, 'approval_updated', { approval });
    logger.info(`[ApprovalService] Approval ${id} rejected by user ${userId}`);
    return approval;
  }

  /**
   * Execute approved action across verified multi-user integrations, n8n, or demo simulator
   * Enforces server-side authorization: Google users with Gmail execute real actions;
   * manual users execute simulated actions via DemoExecutionService.
   */
  async executeAction(approval, userId) {
    logger.info(`[ApprovalService] Authorizing approval ${approval._id} via ExecutionAuthorizationService`);
    return await executionAuthorizationService.executeApprovedAction(approval, userId);
  }

  /**
   * Resume linked Task after approval
   */
  async resumeTaskAfterApproval(approval, executionResult) {
    try {
      const task = await Task.findOne(buildTaskLookup(approval.taskId));
      if (!task) return;

      task.status = 'EXECUTING';
      if (task.pendingApproval) {
        task.pendingApproval.approvedAt = new Date();
        task.pendingApproval.comments = approval.decisionComments;
      }
      task.currentAction = `Authorized action executed via ${approval.executionService}. Resuming task orchestration...`;
      await task.save();

      realtimeServer.sendToUser(task.userId, 'task_update', { task });

      // Enqueue to resume graph progression
      taskQueue.enqueueTask(task, true);
      logger.info(`[ApprovalService] Enqueued Task ${task._id} to resume after approval`);
    } catch (err) {
      logger.warn('[ApprovalService] Resume task notice:', err.message);
    }
  }
}

export const approvalService = new ApprovalService();
export default approvalService;
