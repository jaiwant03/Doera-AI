import mongoose from 'mongoose';

const ReservationSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['reserved', 'completed', 'failed', 'released'],
      default: 'reserved',
      index: true,
    },
    model: {
      type: String,
      default: 'openai/gpt-oss-120b',
    },
    requestType: {
      type: String,
      enum: ['message', 'stream', 'regenerate', 'task', 'research', 'file_analysis'],
      default: 'message',
    },
    tokens: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    reservedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    releasedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  { _id: true }
);

const UsageRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'max'],
      default: 'free',
      index: true,
    },
    usageDate: {
      type: String, // 'YYYY-MM-DD' in UTC
      required: true,
      index: true,
    },
    dailyLimit: {
      type: Number,
      required: true,
      default: 20,
    },
    usedRequests: {
      type: Number,
      default: 0,
    },
    remainingRequests: {
      type: Number,
      default: 20,
    },
    reservedRequests: {
      type: Number,
      default: 0,
    },
    successfulRequests: {
      type: Number,
      default: 0,
    },
    failedRequests: {
      type: Number,
      default: 0,
    },
    resetAt: {
      type: Date,
      required: true,
    },
    reservations: [ReservationSchema],
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: Exactly one record per user per UTC usage date
UsageRecordSchema.index({ userId: 1, usageDate: 1 }, { unique: true });
UsageRecordSchema.index({ userId: 1, resetAt: 1 });

export default mongoose.models.UsageRecord || mongoose.model('UsageRecord', UsageRecordSchema);
