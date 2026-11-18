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
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'pending'],
      default: 'connected',
    },
    accountEmail: String,
    // Sensitive credentials stored encrypted using AES-256-GCM
    encryptedAccessToken: String,
    encryptedRefreshToken: String,
    tokenExpiryDate: Date,
    configData: mongoose.Schema.Types.Mixed,
    lastVerifiedAt: Date,
  },
  {
    timestamps: true,
  }
);

IntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.models.Integration || mongoose.model('Integration', IntegrationSchema);
