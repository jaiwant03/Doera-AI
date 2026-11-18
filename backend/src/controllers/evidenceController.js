import ExecutionEvidence from '../models/ExecutionEvidence.js';
import Task from '../models/Task.js';

/**
 * DOERA AI — Proof of Execution Controller
 * Delivers verifiable records of external actions, communications, and booking confirmations.
 */

// 1. GET ALL EVIDENCE FOR A TASK
export const getEvidenceByTask = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { taskId } = req.params;

    // Lookup task to support both taskId string and ObjectId
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

    const evidenceList = await ExecutionEvidence.find(query)
      .sort({ executedAt: -1 })
      .lean();

    res.json({
      taskId,
      count: evidenceList.length,
      evidence: evidenceList,
    });
  } catch (error) {
    next(error);
  }
};

// 2. GET SINGLE EVIDENCE RECORD BY ID
export const getEvidenceById = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const evidence = await ExecutionEvidence.findOne({
      _id: id,
      userId,
    }).lean();

    if (!evidence) {
      return res.status(404).json({ error: 'Evidence record not found.' });
    }

    res.json({ evidence });
  } catch (error) {
    next(error);
  }
};
