import mongoose from 'mongoose';

const WorkflowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    workflowId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    trigger: {
      type: {
        type: String,
        enum: ['schedule', 'event', 'webhook', 'follow_up'],
        required: true,
      },
      cronExpression: { type: String, default: null },
      intervalHours: { type: Number, default: null },
      eventName: { type: String, default: null },
      targetTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    },
    conditions: [
      {
        field: String,
        operator: { type: String, enum: ['equals', 'not_equals', 'greater_than', 'contains', 'is_empty'] },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
    actions: [
      {
        type: { type: String, enum: ['SEND_EMAIL', 'SEND_NOTIFICATION', 'DISPATCH_AGENT', 'TRIGGER_N8N', 'CREATE_CALENDAR_EVENT'] },
        params: mongoose.Schema.Types.Mixed,
      },
    ],
    status: {
      type: String,
      enum: ['active', 'paused', 'completed', 'failed', 'archived'],
      default: 'active',
      index: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    nextRunAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    runCount: {
      type: Number,
      default: 0,
    },
    maxRuns: {
      type: Number,
      default: null,
    },
    n8nWorkflowId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

WorkflowSchema.index({ userId: 1, status: 1 });
WorkflowSchema.index({ status: 1, nextRunAt: 1 });

export default mongoose.models.Workflow || mongoose.model('Workflow', WorkflowSchema);
