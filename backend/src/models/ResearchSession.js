import mongoose from 'mongoose';

const ResearchSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
      index: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      enum: ['quick', 'detailed', 'deep'],
      default: 'detailed',
    },
    status: {
      type: String,
      enum: ['queued', 'researching', 'synthesizing', 'completed', 'failed'],
      default: 'completed',
    },
    subtasks: [
      {
        query: { type: String, required: true },
        status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'completed' },
        resultSummary: { type: String, default: '' },
      },
    ],
    sources: [
      {
        id: { type: Number, required: true },
        title: { type: String, required: true },
        url: { type: String, required: true },
        snippet: { type: String, default: '' },
        relevanceScore: { type: Number, default: 0.9 },
        verified: { type: Boolean, default: true },
      },
    ],
    findingsReport: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

ResearchSessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.ResearchSession || mongoose.model('ResearchSession', ResearchSessionSchema);
