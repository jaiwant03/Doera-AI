import mongoose from 'mongoose';

const IntegrationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['gmail', 'google_calendar', 'whatsapp', 'google_places', 'n8n'],
      required: true,
    },
    providerAccountId: {
      type: String,
      default: null,
      index: true,
    },
    providerEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    accountEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    // Sensitive credentials stored encrypted using AES-256-GCM
    encryptedAccessToken: {
      type: String,
      default: null,
    },
    encryptedRefreshToken: {
      type: String,
      default: null,
    },
    grantedScopes: {
      type: [String],
      default: [],
    },
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'revoked', 'expired'],
      default: 'connected',
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'pending', 'revoked'],
      default: 'connected',
    },
    tokenExpiryDate: Date,
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: Date,
    lastVerifiedAt: Date,
    configData: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

IntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.models.Integration || mongoose.model('Integration', IntegrationSchema);
