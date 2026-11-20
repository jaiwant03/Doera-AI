import FollowUp from '../models/FollowUp.js';
import Task from '../models/Task.js';
import realtimeServer from '../websocket/wsServer.js';
import { config } from '../config/env.js';
import demoResponseService from '../services/demo/DemoResponseService.js';

/**
 * DOERA AI — Follow-Up & Response Tracker Controller
 */

// 1. GET ALL FOLLOW-UPS FOR USER
export const getFollowUps = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const query = { userId };
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const followUps = await FollowUp.find(query)
      .sort({ nextCheckAt: 1 })
      .lean();

    res.json({ followUps });
  } catch (error) {
    next(error);
  }
};

// 2. GET FOLLOW-UP FOR SPECIFIC TASK
export const getFollowUpByTask = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { taskId } = req.params;

    const task = await Task.findOne({
      userId,
      $or: [{ taskId }, { _id: taskId.match(/^[0-9a-fA-F]{24}$/) ? taskId : null }],
    });

    const query = {
      userId,
      $or: [{ taskId }],
    };

    if (task) {
      query.$or.push({ taskId: task._id }, { taskId: task.taskId });
    }

    const followUps = await FollowUp.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ followUps });
  } catch (error) {
    next(error);
  }
};

// 3. TRIGGER IMMEDIATE RESPONSE CHECK NOW
export const checkFollowUpNow = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const followUp = await FollowUp.findOne({ _id: id, userId });
    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up tracker not found.' });
    }

    const now = new Date();
    followUp.attemptCount += 1;

    followUp.history.push({
      checkedAt: now,
      outcome: `Manual check initiated by user. Attempt ${followUp.attemptCount}/${followUp.maximumAttempts}. No external reply detected yet.`,
    });

    const nextTime = new Date(now.getTime() + (followUp.checkIntervalHours || 24) * 3600000);
    followUp.nextCheckAt = nextTime;
    await followUp.save();

    realtimeServer.sendToUser(userId, 'followup_updated', { followUp });

    res.json({ success: true, followUp });
  } catch (error) {
    next(error);
  }
};

// 4. SIMULATE PROVIDER RESPONSE (DISABLED IN UNIFIED EXECUTION)
export const simulateProviderReply = async (req, res, next) => {
  return res.status(400).json({
    error: 'Simulation endpoints are disabled. DOERA AI operates with genuine execution telemetry and does not generate fabricated provider responses.',
  });
};

// 4. STOP TRACKING FOLLOW-UP
export const stopFollowUp = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const followUp = await FollowUp.findOne({ _id: id, userId });
    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up tracker not found.' });
    }

    followUp.status = 'STOPPED';
    followUp.notes = 'Follow-up tracking halted by user.';
    followUp.history.push({
      checkedAt: new Date(),
      outcome: 'Tracking manually stopped by user.',
    });
    await followUp.save();

    realtimeServer.sendToUser(userId, 'followup_updated', { followUp });

    res.json({ success: true, followUp });
  } catch (error) {
    next(error);
  }
};
