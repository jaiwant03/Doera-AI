import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    content: {
      type: String,
      default: '',
    },
    attachments: [
      {
        name: String,
        type: { type: String },
        url: String,
        size: Number,
        fileId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FileMetadata',
          default: null,
        },
        storagePath: {
          type: String,
          default: null,
        },
      },
    ],
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    feedback: {
      type: String,
      enum: ['like', 'dislike', null],
      default: null,
    },
    status: {
      type: String,
      enum: ['streaming', 'complete', 'interrupted', 'error'],
      default: 'complete',
    },
    modelUsed: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    locationData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    chartConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    calculation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    artifacts: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    intent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    showMap: {
      type: Boolean,
      default: null,
    },
    responseType: {
      type: String,
      default: null,
    },
    presentationMode: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
