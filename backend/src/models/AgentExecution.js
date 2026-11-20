import mongoose from 'mongoose';

const AgentExecutionSchema = new mongoose.Schema(
  {
    executionId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      enum: [
        'Orchestrator',
        'Supervisor',
        'Planner',
        'Planning',
        'Budget',
        'Research',
        'Discovery',
        'Location',
        'LocalService',
        'Communication',
        'Quotation',
        'Comparison',
        'Document',
        'DataAnalysis',
        'Vision',
        'Scheduling',
        'Execution',
        'Verification',
        'FollowUp',
        'Recovery',
      ],
    },
    evidenceReferences: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExecutionEvidence',
      },
    ],
    agentType: {
      type: String,
      default: 'autonomous',
    },
    status: {
      type: String,
      enum: ['started', 'completed', 'failed', 'paused'],
      required: true,
      default: 'started',
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'agentexecutions',
  }
);

AgentExecutionSchema.index({ taskId: 1, createdAt: -1 });
AgentExecutionSchema.index({ taskId: 1, agentName: 1 });

export default mongoose.models.AgentExecution || mongoose.model('AgentExecution', AgentExecutionSchema, 'agentexecutions');
