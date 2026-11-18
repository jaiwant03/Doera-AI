import approvalService from '../services/approvalService.js';
import Approval from '../models/Approval.js';
import { buildTaskLookup } from '../utils/queryHelper.js';
import Task from '../models/Task.js';

export const createApproval = async (req, res, next) => {
  try {
    const approval = await approvalService.createApproval({
      ...req.body,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, approval });
  } catch (error) {
    next(error);
  }
};

export const getApprovals = async (req, res, next) => {
  try {
    const result = await approvalService.getApprovals(req.user._id, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getApprovalCounts = async (req, res, next) => {
  try {
    const counts = await approvalService.getApprovalCounts(req.user._id);
    res.json({ success: true, counts });
  } catch (error) {
    next(error);
  }
};

export const getApproval = async (req, res, next) => {
  try {
    const approval = await approvalService.getApprovalById(req.user._id, req.params.id);
    res.json({ success: true, approval });
  } catch (error) {
    next(error);
  }
};

export const editApproval = async (req, res, next) => {
  try {
    const approval = await approvalService.editApproval(req.user._id, req.params.id, req.body);
    res.json({ success: true, approval });
  } catch (error) {
    next(error);
  }
};

export const approveAction = async (req, res, next) => {
  try {
    const { comments, actionVersion, idempotencyKey } = req.body;
    const key = idempotencyKey || req.headers['x-idempotency-key'];
    const result = await approvalService.approveAndExecute(req.user._id, req.params.id, {
      comments,
      actionVersion: typeof actionVersion === 'number' ? actionVersion : undefined,
      idempotencyKey: key,
    });
    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    next(error);
  }
};

export const rejectAction = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const approval = await approvalService.rejectApproval(req.user._id, req.params.id, reason);
    res.json({ success: true, approval });
  } catch (error) {
    next(error);
  }
};

export const executeAction = async (req, res, next) => {
  try {
    const approval = await approvalService.getApprovalById(req.user._id, req.params.id);
    const result = await approvalService.executeAction(approval, req.user._id);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
};

export const getApprovalsByTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      ...buildTaskLookup(req.params.taskId),
      userId: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const approvals = await Approval.find({
      taskId: task._id,
      userId: req.user._id,
    }).sort({ requestedAt: -1 });

    res.json({ success: true, approvals });
  } catch (error) {
    next(error);
  }
};
