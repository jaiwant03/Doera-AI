import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Task',
      trim: true,
    },
    summary: {
      type: String,
      default: '',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    selectedModel: {
      type: String,
      default: 'openai/gpt-oss-120b',
    },
    activeMissionId: {
      type: String,
      default: null,
    },
    activeCategory: {
      type: String,
      default: null,
    },
    contextSummary: {
      type: String,
      default: '',
    },
    activeArtifacts: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    uploadedFiles: [
      {
        fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'FileMetadata' },
        name: String,
        type: { type: String },
        size: Number,
        storagePath: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    lastCalculation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastChartConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastDraft: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastPlan: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastResearchResults: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastDocumentAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastVisionAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    taskState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ userId: 1, isPinned: -1, lastMessageAt: -1 });
ConversationSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
