import mongoose from 'mongoose';

/**
 * DOERA AI — Execution Evidence Schema
 * Stores verifiable evidence of every external action performed by DOERA agents.
 * STRICT ANTI-HALLUCINATION POLICY:
 * - Real API responses only
 * - Separate states: PREPARED, APPROVAL_PENDING, APPROVED, SUBMITTED, ACCEPTED, DELIVERED, CONFIRMED, VERIFIED, FAILED, UNKNOWN
 */
const ExecutionEvidenceSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'Task',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actionId: {
      type: String,
      default: () => `act-${Math.random().toString(36).substring(2, 9)}`,
      index: true,
    },
    agentName: {
      type: String,
      required: true,
      enum: [
        'Orchestrator',
        'Supervisor',
        'Planner',
        'Research',
        'Location',
        'Communication',
        'Communication Agent',
        'Quotation',
        'Scheduling',
        'Execution',
        'Execution Agent',
        'Verification',
        'FollowUp',
        'Recovery',
      ],
    },
    actionType: {
      type: String,
      required: true, // e.g. 'SEND_EMAIL', 'SEND_WHATSAPP', 'SEND_TELEGRAM', 'BOOK_APPOINTMENT', 'SUBMIT_FORM', 'DISCOVER_LOCATIONS', 'CALCULATE_ROUTE'
      index: true,
    },
    externalProvider: {
      type: String, // e.g. 'Gmail / SMTP', 'WhatsApp Cloud API', 'Telegram Bot', 'OpenStreetMap', 'OSRM', 'n8n Master Orchestrator'
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: [
        'PREPARED',
        'APPROVAL_PENDING',
        'APPROVED',
        'SUBMITTED',
        'ACCEPTED',
        'DELIVERED',
        'CONFIRMED',
        'VERIFIED',
        'FAILED',
        'UNKNOWN',
      ],
      default: 'PREPARED',
      index: true,
    },
    requestSummary: {
      type: String,
      required: true,
    },
    actualProviderResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    externalReference: {
      type: String, // Real message ID, email messageId, booking reference (ONLY if provider returned one)
      default: null,
    },
    sourceUrls: [
      {
        title: String,
        url: String,
        retrievedAt: { type: Date, default: Date.now },
      },
    ],
    verificationDetails: {
      verifiedBy: { type: String, default: 'Verification Agent' },
      verifiedAt: { type: Date, default: Date.now },
      notes: String,
      isTruthful: { type: Boolean, default: true },
    },
    error: {
      message: String,
      code: String,
      occurredAt: Date,
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

ExecutionEvidenceSchema.pre('validate', function (next) {
  if (!this.requestSummary && this.actionSummary) this.requestSummary = this.actionSummary;
  if (!this.externalProvider && this.service) this.externalProvider = this.service;
  if (!this.externalProvider) this.externalProvider = 'DOERA Execution Engine';
  if (!this.requestSummary) this.requestSummary = this.actionType || 'Verified Action';
  if (!this.verificationStatus && this.status) this.verificationStatus = this.status;
  if (!this.status && this.verificationStatus) this.status = this.verificationStatus;
  if (!this.externalReference && this.externalReferenceId) this.externalReference = this.externalReferenceId;
  next();
});

ExecutionEvidenceSchema.index({ taskId: 1, createdAt: -1 });

export default mongoose.models.ExecutionEvidence || mongoose.model('ExecutionEvidence', ExecutionEvidenceSchema);
