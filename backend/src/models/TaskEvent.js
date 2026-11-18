import mongoose from 'mongoose';

const TaskEventSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Task',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true, // 'STATUS_CHANGE', 'STEP_PROGRESS', 'APPROVAL_REQUEST', 'INTEGRATION_CALL'
    },
    agent: String,
    agentName: String,
    action: String,
    message: String,
    details: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    level: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info',
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TaskEventSchema.pre('save', function (next) {
  if (!this.agentName && this.agent) this.agentName = this.agent;
  if (!this.agent && this.agentName) this.agent = this.agentName;
  if (!this.message && this.action) this.message = this.action;
  if (!this.action && this.message) this.action = this.message;
  next();
});

TaskEventSchema.index({ taskId: 1, timestamp: 1 });

export default mongoose.models.TaskEvent || mongoose.model('TaskEvent', TaskEventSchema);
