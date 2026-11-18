import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'razorpay', 'system', 'demo'],
      default: 'system',
    },
    providerCustomerId: {
      type: String,
      default: null,
      index: true,
    },
    providerSubscriptionId: {
      type: String,
      default: null,
      index: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'max'],
      default: 'free',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired'],
      default: 'active',
      index: true,
    },
    billingInterval: {
      type: String,
      enum: ['monthly', 'annual', 'lifetime'],
      default: 'monthly',
    },
    amount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: null,
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

SubscriptionSchema.index({ userId: 1, status: 1 });

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);
