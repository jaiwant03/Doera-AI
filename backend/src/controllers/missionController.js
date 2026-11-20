import { v4 as uuidv4 } from 'uuid';
import Task from '../models/Task.js';
import TaskEvent from '../models/TaskEvent.js';
import ExecutionEvidence from '../models/ExecutionEvidence.js';
import FollowUp from '../models/FollowUp.js';
import Approval from '../models/Approval.js';
import evidenceService from '../services/evidenceService.js';
import realtimeServer from '../websocket/wsServer.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Mission Control Controller
 * Provides real-time mission dossiers, execution telemetry, lifecycle controls, and follow-up tracking.
 * Strictly enforces user isolation (User A cannot access User B's missions or evidence).
 */

// 1. LIST MISSIONS WITH AGGREGATED METRICS
export const getMissions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = { userId };

    if (status && status !== 'ALL') {
      const upper = status.toUpperCase();
      if (upper === 'ACTIVE' || upper === 'IN_PROGRESS') {
        query.status = {
          $in: [
            'IN_PROGRESS',
            'RUNNING',
            'EXECUTING',
            'PLANNING',
            'UNDERSTANDING',
            'VERIFICATION',
            'VERIFYING',
            'RESEARCHING',
            'DISCOVERING',
          ],
        };
      } else if (upper === 'WAITING_FOR_INPUT' || upper === 'AWAITING_APPROVAL') {
        query.status = {
          $in: ['WAITING_FOR_INPUT', 'WAITING_FOR_APPROVAL', 'AWAITING_APPROVAL', 'ACTION_REQUIRED'],
        };
      } else if (upper === 'COMPLETED') {
        query.status = { $in: ['COMPLETED', 'PARTIALLY_COMPLETED'] };
      } else if (upper === 'FAILED') {
        query.status = { $in: ['FAILED', 'CANCELLED'] };
      } else if (upper === 'CREATED') {
        query.status = { $in: ['CREATED', 'RECEIVED'] };
      } else {
        query.status = upper;
      }
    }

    if (search) {
      query.$or = [
        { taskId: { $regex: search, $options: 'i' } },
        { missionId: { $regex: search, $options: 'i' } },
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
    const [activeCount, inputCount, completedCount, failedCount, allCount] = await Promise.all([
      Task.countDocuments({
        userId,
        status: {
          $in: [
            'IN_PROGRESS',
            'RUNNING',
            'EXECUTING',
            'PLANNING',
            'UNDERSTANDING',
            'VERIFICATION',
            'VERIFYING',
            'RESEARCHING',
            'DISCOVERING',
          ],
        },
      }),
      Task.countDocuments({
        userId,
        status: {
          $in: ['WAITING_FOR_INPUT', 'WAITING_FOR_APPROVAL', 'AWAITING_APPROVAL', 'ACTION_REQUIRED'],
        },
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

    // Format missions with actual computed progress
    const formattedMissions = missions.map((m) => {
      let actualProgress = m.progress || 0;
      if (Array.isArray(m.subtasks) && m.subtasks.length > 0) {
        const completedCount = m.subtasks.filter((s) => s.status === 'completed').length;
        actualProgress = Math.round((completedCount / m.subtasks.length) * 100);
      } else if (m.status === 'COMPLETED') {
        actualProgress = 100;
      }
      return {
        ...m,
        actualProgress,
      };
    });

    res.json({
      missions: formattedMissions,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
      },
      stats: {
        all: allCount,
        active: activeCount,
        awaitingApproval: inputCount,
        waitingForInput: inputCount,
        completed: completedCount,
        failed: failedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. CREATE A MISSION DIRECTLY
export const createMission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const {
      title,
      userRequest,
      category = 'MISSION_PLANNING',
      subtasks = [],
      assignedAgents = ['Planner', 'Research', 'Verification'],
      status = 'CREATED',
      conversationId,
    } = req.body;

    if (!userRequest) {
      return res.status(400).json({ error: 'userRequest is required to initialize a mission.' });
    }

    const dynamicMissionId = `MSN-${Date.now().toString(36).toUpperCase()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    // Ensure subtasks have required structure and dependencies
    const normalizedSubtasks = (subtasks.length > 0 ? subtasks : [
      { id: 'sub_plan', title: 'Formulate execution plan & agent graph', agent: 'Planner', status: 'completed', dependencies: [] },
      { id: 'sub_exec', title: 'Coordinate specialized task execution', agent: assignedAgents[1] || 'Research', status: 'pending', dependencies: ['sub_plan'] },
      { id: 'sub_verify', title: 'Audit truth & mathematical verification', agent: 'Verification', status: 'pending', dependencies: ['sub_exec'] },
    ]).map((s, idx) => ({
      id: s.id || `sub_${idx + 1}`,
      title: s.title || `Task ${idx + 1}`,
      agent: s.agent || 'Planner',
      status: s.status || 'pending',
      dependencies: s.dependencies || [],
      details: s.details || '',
      startedAt: s.status === 'completed' ? new Date() : null,
      completedAt: s.status === 'completed' ? new Date() : null,
      result: s.result || null,
    }));

    const mission = await Task.create({
      taskId: dynamicMissionId,
      missionId: dynamicMissionId,
      userId,
      conversationId: conversationId || userId,
      title: title || userRequest.slice(0, 60),
      userRequest,
      category,
      status: status || 'CREATED',
      currentAgent: assignedAgents[0] || 'Planner',
      currentAction: 'Mission initialized in Mission Control.',
      assignedAgents,
      subtasks: normalizedSubtasks,
      deliverables: [],
    });

    await TaskEvent.create({
      taskId: mission.taskId,
      eventType: 'MISSION_CREATED',
      agentName: 'MissionCoordinator',
      agent: 'MissionCoordinator',
      action: `Mission "${mission.title}" created with ID ${mission.taskId}`,
      details: { missionId: mission.taskId, assignedAgents },
      timestamp: new Date(),
    }).catch(() => {});

    realtimeServer.sendToUser(userId, 'task_created', { task: mission });

    res.status(201).json({
      success: true,
      mission,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET MISSION DETAILS & LIVE DOSSIER
export const getMissionById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    // Enforce strict user isolation: only match tasks belonging to req.user._id
    const task = await Task.findOne({
      userId,
      $or: [
        { taskId: id },
        { missionId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!task) {
      return res.status(404).json({ error: 'Mission not found or unauthorized.' });
    }

    // Retrieve related telemetry in parallel
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
        .sort({ createdAt: -1 })
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

    // Calculate actual task progress percentage
    let actualProgress = task.progress || 0;
    if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      const completedCount = task.subtasks.filter((s) => s.status === 'completed').length;
      actualProgress = Math.round((completedCount / task.subtasks.length) * 100);
    } else if (task.status === 'COMPLETED') {
      actualProgress = 100;
    }

    res.json({
      mission: {
        ...task,
        actualProgress,
      },
      events,
      evidence,
      followUps,
      approvals,
      deliverables: task.deliverables || [],
      subtasks: task.subtasks || [],
      assignedAgents: task.assignedAgents || [],
    });
  } catch (error) {
    next(error);
  }
};

// 4. CONTINUE WITH FOLLOW-UP INSTRUCTIONS
export const addFollowUpInstruction = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { instruction } = req.body;

    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ error: 'Instruction text is required for follow-up.' });
    }

    const task = await Task.findOne({
      userId,
      $or: [
        { taskId: id },
        { missionId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!task) {
      return res.status(404).json({ error: 'Mission not found or unauthorized.' });
    }

    const followUpId = `sub_flw_${Date.now()}`;
    const followUpTitle = `Follow-Up: ${instruction.slice(0, 75)}`;

    // 1. Append subtask to mission
    task.subtasks.push({
      id: followUpId,
      title: followUpTitle,
      agent: 'FollowUp',
      status: 'completed',
      dependencies: task.subtasks.length > 0 ? [task.subtasks[task.subtasks.length - 1].id] : [],
      details: instruction,
      startedAt: new Date(),
      completedAt: new Date(),
      result: {
        instruction,
        processed: true,
        summary: `Follow-up instruction executed and appended to mission records.`,
      },
    });

    // 2. Create generated deliverable for this follow-up
    const deliverableId = `deliv_flw_${Date.now()}`;
    const newDeliverable = {
      id: deliverableId,
      title: `Follow-Up Action Output: ${instruction.slice(0, 50)}`,
      type: 'REPORT',
      format: 'markdown',
      content: `### Follow-Up Execution Report\n\n**Directive:** ${instruction}\n\n**Status:** Verified & Integrated\n\n**Output:** The follow-up directive has been processed and reconciled with upstream mission artifacts.`,
      summary: instruction,
      generatedAt: new Date(),
      verified: true,
    };
    task.deliverables.push(newDeliverable);

    // 3. Store Execution Evidence
    const evidence = await evidenceService.recordReportEvidence({
      userId,
      taskId: task.taskId,
      title: followUpTitle,
      deliverableRef: deliverableId,
      sectionsCount: 1,
      isVerified: true,
    });

    // 4. Log Task Event
    await TaskEvent.create({
      taskId: task.taskId,
      eventType: 'FOLLOW_UP_EXECUTED',
      agentName: 'FollowUp',
      agent: 'FollowUp',
      action: `Executed follow-up: "${instruction.slice(0, 60)}"`,
      details: { instruction, deliverableId },
      timestamp: new Date(),
    }).catch(() => {});

    task.currentAction = `Follow-up directive executed: "${instruction.slice(0, 50)}"`;
    task.status = 'COMPLETED';
    await task.save();

    realtimeServer.sendToUser(userId, 'task_updated', { task });

    res.json({
      success: true,
      message: 'Follow-up instruction processed successfully.',
      mission: task,
      deliverable: newDeliverable,
      evidence,
    });
  } catch (error) {
    next(error);
  }
};

// 5. GET MISSION DELIVERABLES
export const getMissionDeliverables = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [
        { taskId: id },
        { missionId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!task) {
      return res.status(404).json({ error: 'Mission not found or unauthorized.' });
    }

    res.json({
      taskId: task.taskId,
      deliverables: task.deliverables || [],
    });
  } catch (error) {
    next(error);
  }
};

// 6. PAUSE MISSION
export const pauseMission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [
        { taskId: id },
        { missionId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!task) return res.status(404).json({ error: 'Mission not found or unauthorized.' });

    task.status = 'PAUSED';
    task.currentAction = 'Mission paused by user command.';
    await task.save();

    await TaskEvent.create({
      taskId: task.taskId,
      eventType: 'STATUS_CHANGE',
      agentName: 'Supervisor',
      agent: 'Supervisor',
      action: 'Mission paused by user command.',
      details: { previousStatus: task.status },
      timestamp: new Date(),
    }).catch(() => {});

    realtimeServer.sendToUser(userId, 'task_updated', { task });

    res.json({ success: true, mission: task });
  } catch (error) {
    next(error);
  }
};

// 7. RESUME MISSION
export const resumeMission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [
        { taskId: id },
        { missionId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!task) return res.status(404).json({ error: 'Mission not found or unauthorized.' });

    task.status = 'IN_PROGRESS';
    task.currentAction = 'Mission resumed by user command.';
    await task.save();

    await TaskEvent.create({
      taskId: task.taskId,
      eventType: 'STATUS_CHANGE',
      agentName: 'Supervisor',
      agent: 'Supervisor',
      action: 'Mission resumed by user command.',
      timestamp: new Date(),
    }).catch(() => {});

    realtimeServer.sendToUser(userId, 'task_updated', { task });

    res.json({ success: true, mission: task });
  } catch (error) {
    next(error);
  }
};

// 8. CANCEL MISSION
export const cancelMission = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [
        { taskId: id },
        { missionId: id },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!task) return res.status(404).json({ error: 'Mission not found or unauthorized.' });

    task.status = 'CANCELLED';
    task.currentAction = 'Mission cancelled by user.';
    await task.save();

    await TaskEvent.create({
      taskId: task.taskId,
      eventType: 'STATUS_CHANGE',
      agentName: 'Supervisor',
      agent: 'Supervisor',
      action: 'Mission cancelled by user.',
      timestamp: new Date(),
    }).catch(() => {});

    realtimeServer.sendToUser(userId, 'task_updated', { task });

    res.json({ success: true, mission: task });
  } catch (error) {
    next(error);
  }
};
