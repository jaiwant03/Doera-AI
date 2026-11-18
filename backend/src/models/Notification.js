import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Task',
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['TASK_COMPLETED', 'TASK_FAILED', 'APPROVAL_REQUIRED', 'INTEGRATION_UPDATE', 'TASK_UPDATE', 'FOLLOW_UP_DUE'],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
  }
);

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
