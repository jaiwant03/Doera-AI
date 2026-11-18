import Task from '../models/Task.js';
import TaskEvent from '../models/TaskEvent.js';
import ExecutionEvidence from '../models/ExecutionEvidence.js';
import FollowUp from '../models/FollowUp.js';
import Approval from '../models/Approval.js';
import realtimeServer from '../websocket/wsServer.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Mission Control Controller
 * Provides real-time mission dossiers, execution telemetry, and lifecycle controls.
 */

// 1. LIST MISSIONS WITH AGGREGATED METRICS
export const getMissions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = { userId };

    if (status && status !== 'ALL') {
      if (status === 'ACTIVE') {
        query.status = { $in: ['RUNNING', 'EXECUTING', 'PLANNING', 'UNDERSTANDING', 'VERIFYING'] };
      } else if (status === 'AWAITING_APPROVAL') {
        query.status = { $in: ['WAITING_FOR_APPROVAL', 'AWAITING_APPROVAL', 'ACTION_REQUIRED'] };
      } else if (status === 'COMPLETED') {
        query.status = { $in: ['COMPLETED', 'PARTIALLY_COMPLETED'] };
      } else if (status === 'FAILED') {
        query.status = { $in: ['FAILED', 'CANCELLED'] };
      } else {
        query.status = status;
      }
    }

    if (search) {
      query.$or = [
        { taskId: { $regex: search, $options: 'i' } },
        { userRequest: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const missions = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    const total = await Task.countDocuments(query);

    // Compute status counts for dashboard badges
    const [activeCount, approvalCount, completedCount, failedCount, allCount] = await Promise.all([
      Task.countDocuments({
        userId,
        status: { $in: ['RUNNING', 'EXECUTING', 'PLANNING', 'UNDERSTANDING', 'VERIFYING'] },
      }),
      Task.countDocuments({
        userId,
        status: { $in: ['WAITING_FOR_APPROVAL', 'AWAITING_APPROVAL', 'ACTION_REQUIRED'] },
      }),
      Task.countDocuments({
        userId,
        status: { $in: ['COMPLETED', 'PARTIALLY_COMPLETED'] },
      }),
      Task.countDocuments({
        userId,
        status: { $in: ['FAILED', 'CANCELLED'] },
      }),
      Task.countDocuments({ userId }),
    ]);

    res.json({
      missions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
      stats: {
        all: allCount,
        active: activeCount,
        awaitingApproval: approvalCount,
        completed: completedCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET MISSION DETAILS & LIVE DOSSIER
export const getMissionById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [{ taskId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    }).lean();

    if (!task) {
      return res.status(404).json({ error: 'Mission not found.' });
    }

    // Retrieve related mission telemetry in parallel
    const [events, evidence, followUps, approvals] = await Promise.all([
      TaskEvent.find({
        $or: [{ taskId: task.taskId }, { taskId: task._id }],
      })
        .sort({ timestamp: 1 })
        .lean(),
      ExecutionEvidence.find({
        userId,
        $or: [{ taskId: task.taskId }, { taskId: task._id }],
      })
        .sort({ executedAt: -1 })
        .lean(),
      FollowUp.find({
        userId,
        $or: [{ taskId: task.taskId }, { taskId: task._id }],
      })
        .sort({ scheduledAt: -1 })
        .lean(),
      Approval.find({
        userId,
        $or: [{ taskId: task.taskId }, { taskId: task._id }],
      })
        .sort({ requestedAt: -1 })
        .lean(),
    ]);

    res.json({
      mission: task,
      events,
      evidence,
      followUps,
      approvals,
    });
  } catch (error) {
    next(error);
  }
};

// 3. PAUSE MISSION
export const pauseMission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [{ taskId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!task) return res.status(404).json({ error: 'Mission not found.' });

    task.status = 'PAUSED';
    task.currentAction = 'Mission paused by user.';
    await task.save();

    await TaskEvent.create({
      taskId: task.taskId,
      eventType: 'STATUS_CHANGE',
      agentName: 'Supervisor',
      action: 'Mission paused by user command.',
      details: { previousStatus: task.status },
    }).catch(() => {});

    realtimeServer.sendToUser(userId, 'task_updated', { task });

    res.json({ success: true, mission: task });
  } catch (error) {
    next(error);
  }
};

// 4. RESUME MISSION
export const resumeMission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [{ taskId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!task) return res.status(404).json({ error: 'Mission not found.' });

    task.status = 'RUNNING';
    task.currentAction = 'Mission resumed by user.';
    await task.save();

    await TaskEvent.create({
      taskId: task.taskId,
      eventType: 'STATUS_CHANGE',
      agentName: 'Supervisor',
      action: 'Mission resumed by user command.',
    }).catch(() => {});

    realtimeServer.sendToUser(userId, 'task_updated', { task });

    res.json({ success: true, mission: task });
  } catch (error) {
    next(error);
  }
};

// 5. CANCEL MISSION
export const cancelMission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [{ taskId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!task) return res.status(404).json({ error: 'Mission not found.' });

    task.status = 'CANCELLED';
    task.currentAction = 'Mission cancelled by user.';
    await task.save();

    await TaskEvent.create({
      taskId: task.taskId,
      eventType: 'STATUS_CHANGE',
      agentName: 'Supervisor',
      action: 'Mission cancelled by user.',
    }).catch(() => {});

    realtimeServer.sendToUser(userId, 'task_updated', { task });

    res.json({ success: true, mission: task });
  } catch (error) {
    next(error);
  }
};
