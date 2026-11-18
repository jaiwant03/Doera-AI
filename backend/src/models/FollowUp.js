import mongoose from 'mongoose';

/**
 * DOERA AI — Follow-Up & Response Tracker Schema
 * Tracks asynchronous provider replies, quotation responses, and scheduled check-ins.
 */
const FollowUpSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Task',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actionId: {
      type: String,
      default: () => `flw-${Math.random().toString(36).substring(2, 9)}`,
      index: true,
    },
    channel: {
      type: String,
      enum: ['Email', 'WhatsApp', 'Telegram', 'Provider Portal', 'Direct Coordination'],
      default: 'Email',
    },
    recipient: {
      type: String,
      required: true,
    },
    recipientName: {
      type: String,
    },
    purpose: {
      type: String,
      default: 'Monitor provider response for appointment or quotation inquiry.',
    },
    scheduledAt: {
      type: Date,
      default: Date.now,
    },
    nextCheckAt: {
      type: Date,
      required: true,
      index: true,
    },
    checkIntervalHours: {
      type: Number,
      default: 24, // Check every 24 hours
    },
    attemptCount: {
      type: Number,
      default: 0,
    },
    maximumAttempts: {
      type: Number,
      default: 3,
    },
    status: {
      type: String,
      enum: [
        'WAITING',
        'SCHEDULED',
        'RESPONSE_RECEIVED',
        'FOLLOW_UP_DUE',
        'APPROVAL_PENDING',
        'COMPLETED',
        'STOPPED',
        'FAILED',
      ],
      default: 'WAITING',
      index: true,
    },
    lastResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    responseDetectedAt: {
      type: Date,
    },
    requiresApproval: {
      type: Boolean,
      default: true,
    },
    stopCondition: {
      type: String,
      default: 'PROVIDER_REPLY_RECEIVED',
    },
    notes: {
      type: String,
    },
    history: [
      {
        checkedAt: { type: Date, default: Date.now },
        outcome: String,
        details: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

FollowUpSchema.index({ userId: 1, status: 1 });
FollowUpSchema.index({ nextCheckAt: 1, status: 1 });

export default mongoose.models.FollowUp || mongoose.model('FollowUp', FollowUpSchema);
