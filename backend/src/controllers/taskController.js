import Task from '../models/Task.js';
import AgentExecution from '../models/AgentExecution.js';
import Approval from '../models/Approval.js';
import taskQueue from '../queue/taskQueue.js';
import { buildTaskLookup } from '../utils/queryHelper.js';

export const getTasks = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      Task.find({ userId: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Task.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      ...buildTaskLookup(req.params.id),
      userId: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

export const approveTask = async (req, res, next) => {
  try {
    const { comments } = req.body;
    const task = await taskQueue.approveTask(req.params.id, comments);

    // Sync persistent Approval document if present
    if (task) {
      const approval = await Approval.findOne({
        taskId: task._id,
        status: 'PENDING_APPROVAL',
      });
      if (approval) {
        approval.status = 'EXECUTED';
        approval.approvedAt = new Date();
        approval.executedAt = new Date();
        approval.approvedBy = req.user._id;
        approval.decisionComments = comments || '';
        await approval.save().catch(() => {});
      }
    }

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const rejectTask = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const task = await taskQueue.rejectTask(req.params.id, reason);

    // Sync persistent Approval document if present
    if (task) {
      const approval = await Approval.findOne({
        taskId: task._id,
        status: 'PENDING_APPROVAL',
      });
      if (approval) {
        approval.status = 'REJECTED';
        approval.rejectedAt = new Date();
        approval.failureReason = reason || 'Rejected by user';
        await approval.save().catch(() => {});
      }
    }

    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const cancelTask = async (req, res, next) => {
  try {
    const task = await taskQueue.cancelTask(req.params.id);
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const resumeTask = async (req, res, next) => {
  try {
    const task = await taskQueue.resumeTask(req.params.id);
    res.json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

export const getTaskEvents = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      ...buildTaskLookup(req.params.id),
      userId: req.user._id,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const executions = await AgentExecution.find({ taskId: task._id }).sort({ createdAt: 1 });
    const events = executions.map((exec) => ({
      _id: exec._id,
      taskId: exec.taskId,
      agent: exec.agentName,
      action: exec.metadata?.action || `${exec.agentName} ${exec.status}`,
      eventType: exec.metadata?.originalEventType || 'task_step',
      details: exec.output,
      timestamp: exec.startTime || exec.createdAt,
    }));
    res.json({ events, executions });
  } catch (error) {
    next(error);
  }
};
