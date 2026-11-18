import mongoose from 'mongoose';

/**
 * Build a query that safely checks either taskId string or MongoDB _id without CastError
 */
export const buildTaskLookup = (id) => {
  if (!id) return { taskId: null };
  const strId = String(id);
  if (mongoose.Types.ObjectId.isValid(strId) && new mongoose.Types.ObjectId(strId).toString() === strId) {
    return { $or: [{ taskId: strId }, { _id: strId }] };
  }
  return { taskId: strId };
};
