import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    googleId: {
      type: String,
      default: null,
      index: true,
    },
    authProvider: {
      type: String,
      enum: ['google', 'local'],
      default: 'local',
      index: true,
    },
    googleSubjectId: {
      type: String,
      default: null,
      index: true,
    },
    googleEmail: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    executionMode: {
      type: String,
      enum: ['REAL', 'DEMO'],
      default: 'DEMO',
      index: true,
    },
    gmailIntegrationStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'not_connected'],
      default: 'not_connected',
    },
    avatar: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    subscription: {
      plan: {
        type: String,
        enum: ['free', 'pro', 'max'],
        default: 'free',
      },
      status: {
        type: String,
        enum: ['active', 'past_due', 'canceled', 'trialing'],
        default: 'active',
      },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      currentPeriodEnd: { type: Date, default: null },
      cancelAtPeriodEnd: { type: Boolean, default: false },
      isDemo: { type: Boolean, default: false },
    },
    usage: {
      dailyRequestsLimit: { type: Number, default: 20 },
      lastRequestAt: { type: Date, default: null },
    },
    preferences: {
      defaultLanguage: { type: String, default: 'en' },
      requireApprovalForEmail: { type: Boolean, default: true },
      requireApprovalForMessaging: { type: Boolean, default: true },
      requireApprovalForBooking: { type: Boolean, default: true },
      memoryEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password helper
UserSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
