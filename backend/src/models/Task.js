import mongoose from 'mongoose';

const StepSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    agent: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
    evidence: {
      url: String,
      label: String,
      data: mongoose.Schema.Types.Mixed,
    },
    error: String,
  },
  { _id: false }
);

const TaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    missionId: {
      type: String,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userRequest: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'RESEARCH',
        'LOCATION_DISCOVERY',
        'PRODUCT_COMPARISON',
        'SERVICE_COMPARISON',
        'TRAVEL_PLANNING',
        'APPOINTMENT_COORDINATION',
        'COMMUNICATION',
        'DOCUMENT_ANALYSIS',
        'IMAGE_ANALYSIS',
        'VISION_ANALYSIS',
        'TECHNICAL_ASSISTANCE',
        'DATA_ANALYSIS',
        'TASK_AUTOMATION',
        'GENERAL_QUESTION',
        'MULTI_STEP_TASK',
        'LOCAL_SERVICE_RESEARCH',
        'MISSION_PLANNING',
        'PLANNING',
        // Legacy compatibility
        'LOCAL_SERVICE',
        'MEDICAL',
        'HOME_SERVICE',
        'REPAIR',
        'DONATION',
        'COMPLAINT',
        'EDUCATION',
        'TRAVEL',
        'SHOPPING',
        'GENERAL_EXECUTION',
      ],
      default: 'GENERAL_EXECUTION',
    },
    status: {
      type: String,
      enum: [
        // Standard Mission Control States
        'CREATED',
        'PLANNING',
        'IN_PROGRESS',
        'WAITING_FOR_INPUT',
        'VERIFICATION',
        'COMPLETED',
        'PARTIALLY_COMPLETED',
        'FAILED',
        'CANCELLED',
        'PAUSED',
        // Legacy & sub-state aliases
        'RECEIVED',
        'UNDERSTANDING',
        'RESEARCHING',
        'DISCOVERING',
        'COMPARING',
        'RUNNING',
        'WAITING_FOR_APPROVAL',
        'AWAITING_APPROVAL',
        'APPROVED',
        'ACTION_REQUIRED',
        'EXECUTING',
        'AWAITING_RESPONSE',
        'VERIFYING',
        'WAITING_FOR_RESPONSE',
        'AWAITING_CONFIRMATION',
      ],
      default: 'CREATED',
      index: true,
    },
    title: {
      type: String,
      default: 'Autonomous Mission',
    },
    taskType: {
      type: String,
      default: 'GENERAL_EXECUTION',
    },
    currentAgent: {
      type: String,
      default: 'Orchestrator',
    },
    activeAgent: {
      type: String,
      default: 'Orchestrator',
    },
    currentAction: {
      type: String,
      default: 'Mission created and queued.',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    executionPlan: {
      summary: String,
      toolsRequired: [String],
      requiredAgents: [String],
      steps: [StepSchema],
    },
    assignedAgents: [{ type: String }],
    subtasks: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        agent: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'in_progress', 'completed', 'failed', 'paused', 'skipped'],
          default: 'pending',
        },
        dependencies: [{ type: String }],
        details: String,
        error: String,
        startedAt: Date,
        completedAt: Date,
        result: mongoose.Schema.Types.Mixed,
        evidenceRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ExecutionEvidence',
        },
      },
    ],
    deliverables: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        type: {
          type: String,
          enum: [
            'DOCUMENT',
            'SPREADSHEET',
            'CHART',
            'REPORT',
            'CODE',
            'EMAIL_DRAFT',
            'DATA_ANALYSIS',
            'LOCATION_DOSSIER',
            'COMMUNICATION_SUITE',
            'PLANNING_SCHEDULE',
            'BUDGET_BREAKDOWN',
            'OTHER',
          ],
          default: 'OTHER',
        },
        format: { type: String, default: 'markdown' },
        content: mongoose.Schema.Types.Mixed,
        summary: String,
        fileUrl: String,
        filename: String,
        generatedAt: { type: Date, default: Date.now },
        verified: { type: Boolean, default: false },
        evidenceRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ExecutionEvidence',
        },
      },
    ],
    executionResults: mongoose.Schema.Types.Mixed,
    verificationResults: mongoose.Schema.Types.Mixed,
    evidenceReferences: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ExecutionEvidence',
      },
    ],
    completedAt: Date,
    steps: [StepSchema],
    externalContacts: [
      {
        name: String,
        businessName: String,
        phone: String,
        email: String,
        address: String,
        website: String,
        rating: Number,
        reviewsCount: Number,
        location: {
          lat: Number,
          lng: Number,
        },
        distanceKm: Number,
        travelTime: String,
        quote: mongoose.Schema.Types.Mixed,
        status: {
          type: String,
          default: 'DISCOVERED',
        },
        source: String,
        sourceUrl: String,
        retrievedAt: { type: Date, default: Date.now },
        domainData: mongoose.Schema.Types.Mixed,
      },
    ],
    locationData: mongoose.Schema.Types.Mixed,
    showMap: {
      type: Boolean,
      default: null,
    },
    responseType: {
      type: String,
      default: null,
    },
    presentationMode: mongoose.Schema.Types.Mixed,
    isFollowUp: {
      type: Boolean,
      default: false,
    },
    followUpAnswer: {
      type: String,
      default: null,
    },
    chartConfig: mongoose.Schema.Types.Mixed,
    discoveredData: mongoose.Schema.Types.Mixed,
    verificationReport: mongoose.Schema.Types.Mixed,
    comparisonMatrix: mongoose.Schema.Types.Mixed,
    intentAnalysis: mongoose.Schema.Types.Mixed,
    bookingDetails: {
      providerName: String,
      dateTime: String,
      internalReferenceId: String,
      providerConfirmationId: String,
      bookingStatus: {
        type: String,
        default: 'DISCOVERED',
      },
      confirmationEvidence: mongoose.Schema.Types.Mixed,
      location: String,
      service: String,
      calendarLink: String,
      notes: String,
    },
    pendingApproval: {
      actionType: String, // 'SEND_EMAIL', 'SEND_WHATSAPP', 'BOOK_APPOINTMENT'
      description: String,
      details: mongoose.Schema.Types.Mixed,
      requestedAt: Date,
      approvedAt: Date,
      rejectedAt: Date,
      comments: String,
    },
    externalApiResponses: [
      {
        provider: String,
        endpoint: String,
        timestamp: { type: Date, default: Date.now },
        responseSummary: mongoose.Schema.Types.Mixed,
      },
    ],
    userLocation: mongoose.Schema.Types.Mixed,
    outcome: {
      actionsPerformed: [String],
      contacted: [mongoose.Schema.Types.Mixed],
      responseReceived: String,
      booking: mongoose.Schema.Types.Mixed,
      evidence: [
        {
          title: String,
          url: String,
          referenceId: String,
        },
      ],
      remainingActions: [String],
    },
    error: {
      message: String,
      stack: String,
      occurredAt: Date,
      recoverable: Boolean,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

TaskSchema.virtual('originalRequest').get(function () {
  return this.userRequest;
});

TaskSchema.virtual('actualProgress').get(function () {
  if (Array.isArray(this.subtasks) && this.subtasks.length > 0) {
    const completed = this.subtasks.filter((s) => s.status === 'completed').length;
    return Math.round((completed / this.subtasks.length) * 100);
  }
  if (this.status === 'COMPLETED') return 100;
  if (this.status === 'FAILED' || this.status === 'CANCELLED') return 0;
  return this.progress || 0;
});

TaskSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
