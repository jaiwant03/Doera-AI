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

    if (config.demoMode) {
      const simReply = await demoResponseService.generateSimulatedResponse({
        providerName: followUp.recipientName || followUp.recipient,
        recipient: followUp.recipient,
        scenario: 'SUCCESS',
      });

      followUp.status = 'RESPONSE_RECEIVED';
      followUp.lastResponse = simReply;
      followUp.responseDetectedAt = now;
      followUp.notes = `Simulated provider reply verified: "${simReply.responseMessage}"`;
      followUp.history.push({
        checkedAt: now,
        outcome: 'RESPONSE_RECEIVED',
        details: simReply,
      });
      await followUp.save();

      // Sync with task
      if (followUp.taskId) {
        try {
          const task = await Task.findOne({
            $or: [{ taskId: followUp.taskId }, { _id: String(followUp.taskId).match(/^[0-9a-fA-F]{24}$/) ? followUp.taskId : null }],
          });
          if (task) {
            task.currentAction = `Simulated response received from ${followUp.recipientName || 'Provider'}.`;
            await task.save().catch(() => {});
            realtimeServer.sendToUser(userId, 'task_update', { task });
          }
        } catch (_) {}
      }

      realtimeServer.sendToUser(userId, 'followup_updated', { followUp });
      return res.json({ success: true, followUp, simulated: true });
    }

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

// 4. SIMULATE PROVIDER RESPONSE (DEMO MODE HELPER)
export const simulateProviderReply = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { scenario = 'SUCCESS', customMessage } = req.body;

    const followUp = await FollowUp.findOne({ _id: id, userId });
    if (!followUp) {
      return res.status(404).json({ error: 'Follow-up tracker not found.' });
    }

    const simReply = await demoResponseService.generateSimulatedResponse({
      providerName: followUp.recipientName || followUp.recipient,
      recipient: followUp.recipient,
      scenario,
    });

    if (customMessage) {
      simReply.responseMessage = customMessage;
    }

    const now = new Date();
    followUp.status = scenario === 'NO_RESPONSE' ? 'FOLLOW_UP_DUE' : 'RESPONSE_RECEIVED';
    followUp.lastResponse = simReply;
    followUp.responseDetectedAt = now;
    followUp.history.push({
      checkedAt: now,
      outcome: scenario === 'NO_RESPONSE' ? 'NO_RESPONSE_SIMULATED' : 'RESPONSE_RECEIVED',
      details: simReply,
    });
    await followUp.save();

    realtimeServer.sendToUser(userId, 'followup_updated', { followUp });

    res.json({ success: true, followUp, simulatedReply: simReply });
  } catch (error) {
    next(error);
  }
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
