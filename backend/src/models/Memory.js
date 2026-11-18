import mongoose from 'mongoose';

const MemorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['preference', 'contact', 'provider', 'project', 'instruction', 'general'],
      default: 'general',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

MemorySchema.index({ userId: 1, category: 1 });

export default mongoose.models.Memory || mongoose.model('Memory', MemorySchema);
