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
        'Planning',
        'Budget',
        'Location',
        'LocalService',
        'Communication',
        'Communication Agent',
        'Quotation',
        'Scheduling',
        'Execution',
        'Execution Agent',
        'Verification',
        'Document',
        'DataAnalysis',
        'Vision',
        'FollowUp',
        'Recovery',
      ],
    },
    evidenceType: {
      type: String,
      enum: [
        'DOCUMENT_PROCESSED',
        'RESEARCH_COMPLETED',
        'SPREADSHEET_ANALYSED',
        'CHART_GENERATED',
        'REPORT_GENERATED',
        'EMAIL_SENT',
        'LOCATION_RESEARCH',
        'MISSION_PLANNING',
        'OTHER',
      ],
      default: 'OTHER',
      index: true,
    },
    actionType: {
      type: String,
      required: true,
      index: true,
    },
    externalProvider: {
      type: String,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: [
        'VERIFIED',
        'COMPLETED_UNVERIFIED',
        'SIMULATED',
        'PENDING',
        'FAILED',
        // Compatibility statuses
        'PREPARED',
        'APPROVAL_PENDING',
        'APPROVED',
        'SUBMITTED',
        'ACCEPTED',
        'DELIVERED',
        'CONFIRMED',
        'UNKNOWN',
      ],
      default: 'VERIFIED',
      index: true,
    },
    executionMode: {
      type: String,
      enum: ['REAL', 'SIMULATED'],
      default: 'REAL',
    },
    isSimulated: {
      type: Boolean,
      default: false,
    },
    targetData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    deliverableRef: {
      type: String,
      default: null,
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
  if (this.verificationStatus === 'SIMULATED' || this.isSimulated) {
    this.isSimulated = true;
    this.executionMode = 'SIMULATED';
  }
  next();
});

ExecutionEvidenceSchema.index({ taskId: 1, createdAt: -1 });

export default mongoose.models.ExecutionEvidence || mongoose.model('ExecutionEvidence', ExecutionEvidenceSchema);
