import mongoose from 'mongoose';

/**
 * DOERA AI — Human Approval Request Schema
 * Production-grade authorization model for external actions, integrations,
 * high-stakes bookings, financial transactions, and outreach dispatches.
 */
const ApprovalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.Mixed,
      index: true,
    },
    // Human-readable title of the proposed action (e.g. "Email Inquiry to Apex Electrical")
    actionTitle: {
      type: String,
      required: true,
      trim: true,
    },
    // Structured action category
    actionType: {
      type: String,
      required: true,
      index: true,
      // e.g., 'SEND_EMAIL', 'SEND_WHATSAPP', 'SEND_TELEGRAM', 'BOOK_APPOINTMENT', 'SUBMIT_FORM', 'EXECUTE_PAYMENT', 'API_DISPATCH', 'SEND_OUTREACH'
    },
    // The exact structured payload that will be executed
    actionPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    // Incremented whenever the action payload is edited/modified
    actionVersion: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Specialized requesting agent
    requestingAgent: {
      type: String,
      required: true,
      default: 'Communication Agent',
    },
    // Clear explanation of why this action is required
    purpose: {
      type: String,
      required: true,
    },
    // Target recipient, business, clinic, endpoint, or system
    target: {
      name: { type: String },
      destination: { type: String }, // Email address, phone number, webhook URL, etc.
      channel: { type: String }, // 'Email', 'WhatsApp', 'Telegram', 'Calendar', 'REST API'
      address: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    // Clear user data disclosure listing all items being transmitted externally
    dataDisclosure: [
      {
        type: String,
      },
    ],
    // Estimated monetary cost, if applicable
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    // Risk categorization
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    riskExplanation: {
      type: String,
    },
    // Supporting evidence, citations, or source discovery links
    evidence: [
      {
        title: { type: String },
        url: { type: String },
        source: { type: String },
        verifiedAt: { type: Date, default: Date.now },
      },
    ],
    // Execution pipeline or provider service (e.g., 'Gmail / SMTP', 'Telegram Bot', 'n8n Master Orchestrator')
    executionService: {
      type: String,
      default: 'n8n Automation Pipeline',
    },
    // What the user can expect upon successful execution
    expectedResult: {
      type: String,
    },
    // Production approval state machine
    status: {
      type: String,
      enum: [
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'EXPIRED',
        'EXECUTING',
        'EXECUTED',
        'FAILED',
      ],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    executedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Full capture of actual response from external system (n8n, SMTP, WhatsApp, etc.)
    executionResult: {
      type: mongoose.Schema.Types.Mixed,
    },
    failureReason: {
      type: String,
    },
    // Unique idempotency key to prevent accidental double-submits / duplicate executions
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },
    decisionComments: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Backward-compatibility aliases
ApprovalSchema.virtual('description').get(function () {
  return this.actionTitle || this.purpose;
});

ApprovalSchema.virtual('payload').get(function () {
  return this.actionPayload;
});

// Helper method to check expiration
ApprovalSchema.methods.isExpired = function () {
  return Boolean(this.expiresAt && new Date() > this.expiresAt);
};

// Pre-save normalization
ApprovalSchema.pre('save', function (next) {
  // If legacy lowercase 'pending' is passed, normalize to 'PENDING_APPROVAL'
  if (this.status === 'pending') this.status = 'PENDING_APPROVAL';
  if (this.status === 'approved') this.status = 'APPROVED';
  if (this.status === 'rejected') this.status = 'REJECTED';
  if (this.status === 'expired') this.status = 'EXPIRED';

  // Default expiration: 24 hours from requestedAt if not specified
  if (!this.expiresAt) {
    const base = this.requestedAt || new Date();
    this.expiresAt = new Date(base.getTime() + 24 * 60 * 60 * 1000);
  }

  // Auto-expire if past expiresAt and still PENDING_APPROVAL
  if (this.status === 'PENDING_APPROVAL' && this.expiresAt && new Date() > this.expiresAt) {
    this.status = 'EXPIRED';
  }

  next();
});

export default mongoose.models.Approval || mongoose.model('Approval', ApprovalSchema);
