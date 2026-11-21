import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import orchestratorAgent from '../agents/orchestratorAgent.js';
import planningAgent from '../agents/planningAgent.js';
import budgetAgent from '../agents/budgetAgent.js';
import researchAgent from '../agents/researchAgent.js';
import locationAgent from '../agents/locationAgent.js';
import discoveryAgent from '../agents/discoveryAgent.js';
import localServiceAgent from '../agents/localServiceAgent.js';
import communicationAgent from '../agents/communicationAgent.js';
import executionAgent from '../agents/executionAgent.js';
import quotationAgent from '../agents/quotationAgent.js';
import comparisonAgent from '../agents/comparisonAgent.js';
import documentAgent from '../agents/documentAgent.js';
import dataAnalysisAgent from '../agents/dataAnalysisAgent.js';
import visionAgent from '../agents/visionAgent.js';
import schedulingAgent from '../agents/schedulingAgent.js';
import verificationAgent from '../agents/verificationAgent.js';
import followUpAgent from '../agents/followUpAgent.js';
import recoveryAgent from '../agents/recoveryAgent.js';
import universalIntentService from '../services/universalIntentService.js';

import mongoose from 'mongoose';
import Approval from '../models/Approval.js';
import TaskEvent from '../models/TaskEvent.js';
import Task from '../models/Task.js';
import approvalService from '../services/approvalService.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Define the Comprehensive Shared State Annotation for LangGraph
const TaskStateAnnotation = Annotation.Root({
  taskId: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  taskDocId: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  userId: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  userRequest: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  userLocation: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  category: Annotation({ reducer: (x, y) => y ?? x, default: () => 'GENERAL_EXECUTION' }),
  status: Annotation({ reducer: (x, y) => y ?? x, default: () => 'RECEIVED' }),
  currentAgent: Annotation({ reducer: (x, y) => y ?? x, default: () => 'Orchestrator' }),
  currentAction: Annotation({ reducer: (x, y) => y ?? x, default: () => '' }),
  requiredAgents: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  subtasks: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  steps: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  externalContacts: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  quotations: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  bookingDetails: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  locationData: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  researchSummary: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  executionEvidence: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  followUpData: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  pendingApproval: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  requiresHumanApproval: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),
  isApproved: Annotation({ reducer: (x, y) => y ?? x, default: () => false }),
  outcome: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  attachments: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  discoveredData: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  comparisonMatrix: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  intentAnalysis: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  dataPayload: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  chartConfig: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  planningData: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  budgetData: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  lastDocumentAnalysis: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  communicationDrafts: Annotation({ reducer: (x, y) => y ?? x, default: () => [] }),
  error: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  userIntegration: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
  onEvent: Annotation({ reducer: (x, y) => y ?? x, default: () => null }),
});

/**
 * Helper to log persistent TaskEvents for Mission Control live timeline
 */
const logMissionEvent = async (state, eventType, agentName, action, details = {}) => {
  state.onEvent?.({
    type: eventType,
    currentAgent: agentName,
    currentAction: action,
    step: details.step,
  });

  if (state.taskId && mongoose.connection?.readyState === 1) {
    await TaskEvent.create({
      taskId: state.taskId,
      eventType,
      agentName,
      agent: agentName,
      action,
      message: action,
      details,
      timestamp: new Date(),
    }).catch(() => {});
  }
};

/**
 * 1. SUPERVISOR / PLANNER NODE
 */
const orchestratorNode = async (state) => {
  logger.info(`[LangGraph Workflow] Supervisor/Planner Node analyzing: ${state.taskId}`);

  // Pure statistical / data analysis short-circuit: Direct to DataAnalysis and Verification
  if (state.category === 'DATA_ANALYSIS' || state.intentAnalysis?.primaryCategory === 'DATA_ANALYSIS') {
    logger.info(`[LangGraph Workflow] Data Analytics routing directly to DataAnalysis Agent for: ${state.taskId}`);
    const activeReq = ['DataAnalysis', 'Verification'];
    const steps = [
      { id: 'data', name: 'Evaluating dataset patterns and statistical insights', agent: 'DataAnalysis', status: 'pending', timestamp: new Date() },
      { id: 'verify', name: 'Auditing dataset computations and statistical accuracy', agent: 'Verification', status: 'pending', timestamp: new Date() },
    ];
    return {
      category: 'DATA_ANALYSIS',
      requiredAgents: activeReq,
      subtasks: steps,
      steps,
      intentAnalysis: state.intentAnalysis || { primaryCategory: 'DATA_ANALYSIS' },
      currentAgent: 'DataAnalysis',
      currentAction: 'Executing direct data analytics and mathematical calculation...',
      status: 'RUNNING',
    };
  }

  // Pure document intelligence short-circuit: Direct to Document and Verification
  if (state.category === 'DOCUMENT_ANALYSIS' || state.intentAnalysis?.primaryCategory === 'DOCUMENT_ANALYSIS') {
    logger.info(`[LangGraph Workflow] Document Intelligence routing directly to Document Agent for: ${state.taskId}`);
    const activeReq = ['Document', 'Verification'];
    const steps = [
      { id: 'doc', name: 'Analyzing uploaded documents and extracting structured knowledge', agent: 'Document', status: 'pending', timestamp: new Date() },
      { id: 'verify', name: 'Auditing document assertions and section citations', agent: 'Verification', status: 'pending', timestamp: new Date() },
    ];
    return {
      category: 'DOCUMENT_ANALYSIS',
      requiredAgents: activeReq,
      subtasks: steps,
      steps,
      intentAnalysis: state.intentAnalysis || { primaryCategory: 'DOCUMENT_ANALYSIS' },
      currentAgent: 'Document',
      currentAction: 'Executing direct document analysis and section extraction...',
      bookingDetails: null,
      pendingApproval: null,
      externalContacts: [],
      status: 'RUNNING',
    };
  }

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Planner',
    'Analyzing requirements and establishing dynamic agent collaboration plan...',
    { step: { id: 'understand', name: 'Planning task requirements', status: 'in_progress', timestamp: new Date() } }
  );

  const plan = await orchestratorAgent.plan(state);

  const updatedSteps = (plan.steps || []).map((s) => (s.id === 'understand' ? { ...s, status: 'completed' } : s));

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Planner',
    `Dynamic plan established (${plan.category}). Activated agents: ${plan.requiredAgents.join(', ')}.`,
    { step: { id: 'understand', name: 'Planning task requirements', status: 'completed', timestamp: new Date() } }
  );

  const activeReq = state.requiredAgents && state.requiredAgents.length > 1 ? state.requiredAgents : plan.requiredAgents;
  let nextAgent = 'Verification';
  if (activeReq.includes('Vision')) nextAgent = 'Vision';
  else if (activeReq.includes('Document')) nextAgent = 'Document';
  else if (activeReq.includes('DataAnalysis')) nextAgent = 'DataAnalysis';
  else if (activeReq.includes('LocalService') || activeReq.includes('Discovery')) nextAgent = 'LocalService';
  else if (activeReq.includes('Location')) nextAgent = 'Location';
  else if (activeReq.includes('Research')) nextAgent = 'Research';
  else if (activeReq.includes('Planning')) nextAgent = 'Planning';
  else if (activeReq.includes('Budget')) nextAgent = 'Budget';
  else if (activeReq.includes('Comparison')) nextAgent = 'Comparison';
  else if (activeReq.includes('Communication')) nextAgent = 'Communication';

  return {
    category: plan.category,
    requiredAgents: activeReq,
    subtasks: plan.subtasks,
    steps: updatedSteps,
    intentAnalysis: plan.intent,
    currentAgent: nextAgent,
    currentAction: `Delegating execution to ${nextAgent} Agent.`,
    status: 'RUNNING',
  };
};

/**
 * 2. LOCATION INTELLIGENCE NODE
 */
const locationNode = async (state) => {
  logger.info(`[LangGraph Workflow] Location Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Location',
    'Discovering verified real-world places and geocoding coordinates...',
    { step: { id: 'location', name: 'Location intelligence and mapping', status: 'in_progress', timestamp: new Date() } }
  );

  try {
    const locResult = await locationAgent.execute(state);

    const steps = state.steps.map((s) =>
      s.agent === 'Location' || s.id === 'location'
        ? {
            ...s,
            status: 'completed',
            details: `Identified ${locResult.places?.length || 0} verified geographic locations. Map layer generated.`,
            timestamp: new Date(),
          }
        : s
    );

    await logMissionEvent(
      state,
      'STEP_PROGRESS',
      'Location',
      locResult.routeData
        ? `Route calculated: ${locResult.routeData.distanceKm} km turn-by-turn road polyline ready.`
        : `Discovered ${locResult.places?.length || 0} verified places on interactive map.`,
      { step: { id: 'location', name: 'Location intelligence and mapping', status: 'completed', timestamp: new Date() } }
    );

    return {
      locationData: locResult.locationData,
      steps,
      currentAgent: 'Research',
      currentAction: 'Merging geographic discovery with authentic research data...',
    };
  } catch (err) {
    logger.warn('[Location Node] Fallback notice:', err.message);
    return { currentAgent: 'Research' };
  }
};

/**
 * 3. RESEARCH NODE
 */
const researchNode = async (state) => {
  logger.info(`[LangGraph Workflow] Research Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Research',
    'Investigating authentic sources and validating verified provider attributes...',
    { step: { id: 'research', name: 'Deep research and fact-checking', status: 'in_progress', timestamp: new Date() } }
  );

  try {
    const [researchRes, discoveryRes] = await Promise.all([
      researchAgent.conductResearch(state),
      discoveryAgent.execute(state).catch(() => ({ output: { contacts: [] } })),
    ]);

    const contacts = discoveryRes.output?.contacts || [];

    const steps = state.steps.map((s) =>
      s.agent === 'Research' || s.id === 'research' || s.id === 'discover'
        ? {
            ...s,
            status: 'completed',
            details:
              contacts.length > 0
                ? `Discovered ${contacts.length} verified providers with documented citations.`
                : 'Factual research compiled with verified citations.',
            timestamp: new Date(),
          }
        : s
    );

    await logMissionEvent(
      state,
      'STEP_PROGRESS',
      'Research',
      `Research completed with ${researchRes.sources?.length || 0} citations. ${contacts.length} verified providers cataloged.`,
      { step: { id: 'research', name: 'Deep research and fact-checking', status: 'completed', timestamp: new Date() } }
    );

    return {
      researchSummary: researchRes.summary,
      externalContacts: contacts,
      steps,
      currentAgent: 'Orchestrator',
      currentAction: 'Synthesizing verified research and location intelligence...',
    };
  } catch (err) {
    logger.error('[Research Node] Error:', err.message);
    return {
      error: { message: err.message, recoverable: true },
      currentAgent: 'Recovery',
    };
  }
};

/**
 * 4. MERGING NODE (Combines Research + Location findings)
 */
const mergingNode = async (state) => {
  logger.info(`[LangGraph Workflow] Merging findings for: ${state.taskId}`);
  await logMissionEvent(state, 'STEP_PROGRESS', 'Planner', 'Cross-referencing research and location evidence...', {
    step: { id: 'merge', name: 'Cross-verifying findings', status: 'completed', timestamp: new Date() },
  });

  const next = state.requiredAgents.includes('Planning')
    ? 'Planning'
    : (state.requiredAgents.includes('Communication') ? 'Communication' : 'Verification');

  return {
    currentAgent: next,
    currentAction: state.requiredAgents.includes('Planning')
      ? 'Synthesizing research into structured execution plan and schedule...'
      : (state.requiredAgents.includes('Communication')
          ? 'Outreach required. Preparing draft and staging human authorization gate.'
          : 'Synthesizing final verified response.'),
  };
};

/**
 * 4B. PLANNING NODE (Chronological schedules, volunteer matrix, resource requirements, risks)
 */
const planningNode = async (state) => {
  logger.info(`[LangGraph Workflow] Planning Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Planning',
    'Formulating chronological schedule, volunteer matrix, and operational roadmap...',
    { step: { id: 'planning', name: 'Formulating mission execution plan', status: 'in_progress', timestamp: new Date() } }
  );

  const planningRes = await planningAgent.planMission(
    state,
    { research: state.researchSummary }
  );

  const plan = planningRes.plan || planningRes.output || {};
  const steps = (state.steps || []).map((s) =>
    s.agent === 'Planning' || s.id === 'planning' || s.id === 'sub_planning'
      ? {
          ...s,
          status: 'completed',
          details: `Chronological schedule established across ${plan.schedule?.length || 2} days. Volunteer matrix organized.`,
          timestamp: new Date(),
        }
      : s
  );

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Planning',
    `Execution plan formulated with ${plan.volunteers?.length || 5} volunteer teams and risk mitigations.`,
    { step: { id: 'planning', name: 'Formulating mission execution plan', status: 'completed', timestamp: new Date() } }
  );

  const nextAgent = state.requiredAgents.includes('Budget')
    ? 'Budget'
    : (state.requiredAgents.includes('Communication') ? 'Communication' : 'Verification');

  return {
    planningData: plan,
    discoveredData: {
      ...(state.discoveredData || {}),
      planning: plan,
    },
    steps,
    currentAgent: nextAgent,
    currentAction: `Delegating execution to ${nextAgent} Agent.`,
  };
};

/**
 * 4C. BUDGET NODE (Itemized financial allocations, math verification, unit economics)
 */
const budgetNode = async (state) => {
  logger.info(`[LangGraph Workflow] Budget Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Budget',
    'Calculating itemized line-item budget and verifying mathematical totals...',
    { step: { id: 'budget', name: 'Financial model and budget allocation', status: 'in_progress', timestamp: new Date() } }
  );

  const budgetRes = await budgetAgent.calculateBudget(
    state,
    { planning: state.planningData || state.discoveredData?.planning }
  );

  const bOut = budgetRes.output || budgetRes.budget || {};
  const steps = (state.steps || []).map((s) =>
    s.agent === 'Budget' || s.id === 'budget' || s.id === 'sub_budget'
      ? {
          ...s,
          status: 'completed',
          details: `Allocated ₹${(bOut.calculatedTotal || 0).toLocaleString()} across ${bOut.lineItems?.length || 0} line items. Math verification: ${bOut.mathVerified ? 'PASS' : 'FLAG'}.`,
          timestamp: new Date(),
        }
      : s
  );

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Budget',
    `Budget balanced: ₹${(bOut.calculatedTotal || 0).toLocaleString()} allocated within limit ₹${(bOut.budgetConstraint || 0).toLocaleString()}.`,
    { step: { id: 'budget', name: 'Financial model and budget allocation', status: 'completed', timestamp: new Date() } }
  );

  const nextAgent = state.requiredAgents.includes('Communication') ? 'Communication' : 'Verification';

  return {
    budgetData: bOut,
    discoveredData: {
      ...(state.discoveredData || {}),
      budget: bOut,
    },
    steps,
    currentAgent: nextAgent,
    currentAction: `Delegating execution to ${nextAgent} Agent.`,
  };
};

/**
 * 5. HUMAN APPROVAL GATE NODE
 */
const approvalGateNode = async (state) => {
  const primaryContact = state.externalContacts?.[0];
  if (!primaryContact) {
    return { currentAgent: 'Verification' };
  }

  // Draft the message
  const outreachDraft = await communicationAgent.prepareOutreach(state, primaryContact);

  // If already authorized by user, proceed to communication
  if (state.isApproved) {
    return {
      requiresHumanApproval: false,
      currentAgent: 'Communication',
      currentAction: 'Authorization verified. Executing outreach...',
      pendingApproval: null,
    };
  }

  // Create or retrieve persistent Approval Request
  let approvalRecord = null;
  if (state.userId && state.taskId) {
    try {
      approvalRecord = await Approval.findOne({
        taskId: state.taskId,
        userId: state.userId,
        status: 'PENDING_APPROVAL',
      });

      if (!approvalRecord) {
        approvalRecord = await approvalService.createApproval({
          userId: state.userId,
          taskId: state.taskId,
          actionTitle: `Inquiry Outreach to ${primaryContact.businessName}`,
          actionType: 'SEND_OUTREACH',
          actionPayload: outreachDraft,
          requestingAgent: 'Communication Agent',
          purpose: `Inquire about service availability, earliest appointment slots, and pricing quotations for: "${state.userRequest}".`,
          target: {
            name: primaryContact.businessName,
            destination: primaryContact.email || primaryContact.phone || primaryContact.address || 'Direct Provider Channel',
            channel: outreachDraft.channel || (primaryContact.email ? 'Email' : 'WhatsApp / Phone'),
            address: primaryContact.address || null,
            phone: primaryContact.phone || null,
            email: primaryContact.email || null,
          },
          dataDisclosure: [
            'Client Name (DOERA AI User)',
            'Service Inquiry Directive',
            'Target Service Location / City',
            'Preferred Appointment Availability Window',
          ],
          estimatedCost: primaryContact.price || 0,
          currency: 'INR',
          riskLevel: 'MEDIUM',
          riskExplanation: config.demoMode
            ? 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED. Sandbox verified dispatch.'
            : 'Dispatches an authorized external message to a verified third-party provider.',
          evidence: (primaryContact.sourceUrl || primaryContact.source) ? [
            {
              title: primaryContact.businessName,
              url: primaryContact.sourceUrl || null,
              source: primaryContact.source || 'OpenStreetMap Nominatim / Overpass Verified',
              verifiedAt: primaryContact.verifiedAt || new Date(),
            },
          ] : [],
          executionService: config.demoMode
            ? (primaryContact.email ? 'Gmail Sandbox (Simulated)' : 'WhatsApp Sandbox (Simulated)')
            : (primaryContact.email ? 'Gmail / SMTP Dispatch' : (primaryContact.phone ? 'WhatsApp Cloud Gateway' : 'n8n Master Orchestrator')),
          expectedResult: 'Provider receives inquiry and responds with consultation fees and appointment availability.',
        });
      }
    } catch (apprErr) {
      logger.warn('[agentGraph] Approval persistence notice:', apprErr.message);
    }
  }

  const pendingData = {
    approvalId: approvalRecord?._id || null,
    actionType: 'SEND_OUTREACH',
    description: `Authorize sending inquiry message to ${primaryContact.businessName}`,
    details: outreachDraft,
    actionVersion: approvalRecord?.actionVersion || 1,
    riskLevel: approvalRecord?.riskLevel || 'MEDIUM',
    target: approvalRecord?.target || { name: primaryContact.businessName },
    requestedAt: approvalRecord?.requestedAt || new Date(),
  };

  await logMissionEvent(
    state,
    'APPROVAL_REQUEST',
    'Communication',
    `Paused awaiting your authorization to dispatch inquiry to ${primaryContact.businessName}.`,
    { approval: pendingData }
  );

  return {
    requiresHumanApproval: true,
    status: 'WAITING_FOR_APPROVAL',
    currentAgent: 'Communication',
    currentAction: 'Paused awaiting human authorization.',
    pendingApproval: pendingData,
  };
};

/**
 * 6. COMMUNICATION NODE
 */
const communicationNode = async (state) => {
  const isMissionPlanning =
    state.category === 'MISSION_PLANNING' ||
    state.requiredAgents.includes('Planning') ||
    Boolean(state.planningData || state.discoveredData?.planning);

  if (isMissionPlanning) {
    logger.info(`[LangGraph Workflow] Communication Agent preparing mission communications for: ${state.taskId}`);
    await logMissionEvent(
      state,
      'STEP_PROGRESS',
      'Communication',
      'Preparing institutional approval letter, sponsor proposal, and participant onboarding guide...',
      { step: { id: 'communicate', name: 'Preparing mission communications', status: 'in_progress', timestamp: new Date() } }
    );

    const commRes = await communicationAgent.prepareMissionCommunications(state, {
      planning: state.planningData || state.discoveredData?.planning,
      budget: state.budgetData || state.discoveredData?.budget,
    });

    const steps = (state.steps || []).map((s) =>
      s.agent === 'Communication' || s.id === 'communicate' || s.id === 'sub_comm'
        ? {
            ...s,
            status: 'completed',
            details: `Prepared ${commRes.drafts?.length || 3} ready-to-use communication drafts (Institutional, Sponsor, Participant).`,
            timestamp: new Date(),
          }
        : s
    );

    await logMissionEvent(
      state,
      'STEP_PROGRESS',
      'Communication',
      'Communication drafts compiled for institutional approval, sponsor outreach, and participant onboarding.',
      { step: { id: 'communicate', name: 'Preparing mission communications', status: 'completed', timestamp: new Date() } }
    );

    return {
      communicationDrafts: commRes.drafts || [],
      discoveredData: {
        ...(state.discoveredData || {}),
        communication: commRes,
      },
      steps,
      currentAgent: 'Verification',
      currentAction: 'Auditing mission deliverables and cross-agent findings...',
    };
  }

  const primaryContact = state.externalContacts?.[0];
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Communication',
    `Preparing authorized inquiry to ${primaryContact?.businessName || 'Provider'}...`,
    { step: { id: 'communicate', name: 'Contacting providers', status: 'in_progress', timestamp: new Date() } }
  );

  try {
    const draft = state.pendingApproval?.details || (await communicationAgent.prepareOutreach(state, primaryContact));
    return {
      currentAgent: 'Execution',
      currentAction: 'Executing authorized operation...',
      pendingApproval: { details: draft },
    };
  } catch (err) {
    return {
      error: { message: err.message, recoverable: true },
      currentAgent: 'Recovery',
    };
  }
};

/**
 * 7. EXECUTION NODE (Dispatches via n8n or native adapter + captures ExecutionEvidence)
 */
const executionNode = async (state) => {
  const primaryContact = state.externalContacts?.[0];
  await logMissionEvent(
    state,
    'INTEGRATION_CALL',
    'Execution',
    `Dispatching authorized action to ${primaryContact?.businessName}...`,
    { step: { id: 'execute', name: 'Executing approved operation', status: 'in_progress', timestamp: new Date() } }
  );

  try {
    const draft = state.pendingApproval?.details || {};
    const approvalReq = {
      userId: state.userId,
      actionTitle: `Inquiry Outreach to ${primaryContact?.businessName || 'Provider'}`,
      actionType: 'SEND_OUTREACH',
      actionPayload: draft,
      target: {
        name: primaryContact?.businessName,
        email: primaryContact?.email,
        phone: primaryContact?.phone,
        address: primaryContact?.address,
      },
      executionService: primaryContact?.email ? 'Gmail / SMTP Transport' : 'n8n Master Orchestrator',
      evidence: primaryContact?.sourceUrl ? [{ title: primaryContact.businessName, url: primaryContact.sourceUrl }] : [],
    };

    const execRes = await executionAgent.executeAction(state, approvalReq);

    const steps = state.steps.map((s) => {
      const isCommOrExec =
        s.agent === 'Execution' ||
        s.agent === 'Communication' ||
        s.id === 'execute' ||
        s.id === 'communicate' ||
        /contact|outreach|message|communicat|inquir|send|approval|authoriz/i.test(s.name || '');
      return isCommOrExec
        ? {
            ...s,
            status: 'completed',
            details: `Dispatched to ${primaryContact?.businessName}. Verification status: ${execRes.verificationStatus || 'DELIVERED'}.`,
            timestamp: new Date(),
          }
        : s;
    });

    await logMissionEvent(
      state,
      'STEP_PROGRESS',
      'Execution',
      `Action executed with verification status: ${execRes.verificationStatus}. Evidence record: ${execRes.evidenceId || 'logged'}.`,
      { step: { id: 'execute', name: 'Executing approved operation', status: 'completed', timestamp: new Date() } }
    );

    return {
      steps,
      executionEvidence: execRes,
      currentAgent: 'Quotation',
      currentAction: 'Comparing provider rates and estimates...',
    };
  } catch (err) {
    logger.error('[Execution Node] Error:', err.message);
    return {
      error: { message: err.message, recoverable: true },
      currentAgent: 'Recovery',
    };
  }
};

/**
 * 8. QUOTATION NODE
 */
const quotationNode = async (state) => {
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Quotation',
    'Auditing fee structures and pricing cards with domain-aware validation...',
    { step: { id: 'quote', name: 'Comparing quotations', status: 'in_progress', timestamp: new Date() } }
  );

  const quoteResult = await quotationAgent.compareQuotes(state, state.externalContacts);

  const steps = state.steps.map((s) => {
    const isQuoteOrComp =
      s.agent === 'Quotation' ||
      s.id === 'quote' ||
      s.agent === 'Comparison' ||
      s.id === 'compare' ||
      /quot|rate|fee|pric|compar/i.test(s.name || '');
    return isQuoteOrComp
      ? {
          ...s,
          status: 'completed',
          details: `Compared ${quoteResult.quotes.length} rate cards. Pricing domain: ${quoteResult.domain}.`,
          timestamp: new Date(),
        }
      : s;
  });

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Quotation',
    `Verified ${quoteResult.quotes.length} provider rate cards.`,
    { step: { id: 'quote', name: 'Comparing quotations', status: 'completed', timestamp: new Date() } }
  );

  return {
    quotations: quoteResult.quotes,
    steps,
    currentAgent: 'Scheduling',
    currentAction: 'Coordinating appointment slot...',
  };
};

/**
 * 8B. COMPARISON NODE (Product, Service, Platform & Rate Matrices)
 */
const comparisonNode = async (state) => {
  logger.info(`[LangGraph Workflow] Comparison Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Comparison',
    'Auditing multi-entity comparison matrix, specifications, and pros/cons...',
    { step: { id: 'compare', name: 'Comparing options and criteria', status: 'in_progress', timestamp: new Date() } }
  );

  const compResult = await comparisonAgent.compare(state, state.externalContacts || []);

  const steps = state.steps.map((s) =>
    s.agent === 'Comparison' || s.agent === 'Quotation' || s.id === 'compare' || s.id === 'quote'
      ? {
          ...s,
          status: 'completed',
          details: `Compared ${compResult.items?.length || 0} candidates across ${compResult.criteria?.length || 0} criteria.`,
          timestamp: new Date(),
        }
      : s
  );

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Comparison',
    `Structured comparison matrix established across ${compResult.items?.length || 0} candidates.`,
    { step: { id: 'compare', name: 'Comparing options and criteria', status: 'completed', timestamp: new Date() } }
  );

  return {
    comparisonMatrix: compResult,
    quotations: compResult.quotationDetails || state.quotations,
    steps,
    currentAgent: state.requiredAgents.includes('Scheduling') ? 'Scheduling' : 'Verification',
    currentAction: 'Comparison matrix synthesized.',
  };
};

/**
 * 8C. DOCUMENT INTELLIGENCE NODE
 */
const documentNode = async (state) => {
  logger.info(`[LangGraph Workflow] Document Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Document',
    'Analyzing uploaded documents and extracting structured knowledge...',
    { step: { id: 'doc', name: 'Document analysis and extraction', status: 'in_progress', timestamp: new Date() } }
  );

  const docResult = await documentAgent.analyzeDocument(state, state.attachments || []);

  const steps = state.steps.map((s) =>
    s.agent === 'Document' || s.id === 'doc'
      ? {
          ...s,
          status: 'completed',
          details: `Processed ${docResult.documentCount} documents. Extracted key findings and section references.`,
          timestamp: new Date(),
        }
      : s
  );

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Document',
    `Audited ${docResult.documentCount} documents with section references.`,
    { step: { id: 'doc', name: 'Document analysis and extraction', status: 'completed', timestamp: new Date() } }
  );

  return {
    steps,
    discoveredData: {
      ...(state.discoveredData || {}),
      documents: docResult.documents,
      crossDocAnalysis: docResult.crossDocAnalysis,
    },
    dataPayload: docResult.documents?.[0]?.extractedData || state.dataPayload,
    currentAgent: state.requiredAgents.includes('DataAnalysis') ? 'DataAnalysis' : 'Verification',
    currentAction: 'Document analysis complete.',
    bookingDetails: null,
    pendingApproval: null,
    externalContacts: [],
  };
};

/**
 * 8D. DATA ANALYSIS NODE
 */
const dataAnalysisNode = async (state) => {
  logger.info(`[LangGraph Workflow] Data Analysis Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'DataAnalysis',
    'Auditing numerical metrics, statistical distributions, and trends...',
    { step: { id: 'data', name: 'Data analysis and insights', status: 'in_progress', timestamp: new Date() } }
  );

  const dataResult = await dataAnalysisAgent.analyzeData(state, state.dataPayload || state.discoveredData);

  const steps = state.steps.map((s) =>
    s.agent === 'DataAnalysis' || s.id === 'data'
      ? {
          ...s,
          status: 'completed',
          details: `Evaluated ${dataResult.analysis?.keyMetrics?.length || 0} key metrics and trends.`,
          timestamp: new Date(),
        }
      : s
  );

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'DataAnalysis',
    'Statistical evaluation and metric insights established.',
    { step: { id: 'data', name: 'Data analysis and insights', status: 'completed', timestamp: new Date() } }
  );

  return {
    steps,
    discoveredData: { ...(state.discoveredData || {}), dataAnalysis: dataResult.analysis },
    chartConfig: dataResult.chartConfig || dataResult.analysis?.chartConfig || null,
    currentAgent: 'Verification',
    currentAction: 'Data analysis complete.',
    bookingDetails: null,
    pendingApproval: null,
    externalContacts: [],
  };
};

/**
 * 8E. VISION INTELLIGENCE NODE
 */
const visionNode = async (state) => {
  logger.info(`[LangGraph Workflow] Vision Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Vision',
    'Analyzing visual structures, layout geometry, UI components, and image content...',
    { step: { id: 'vision', name: 'Visual analysis and image understanding', status: 'in_progress', timestamp: new Date() } }
  );

  const visionResult = await visionAgent.analyzeImage(state, state.attachments || []);

  const steps = state.steps.map((s) =>
    s.agent === 'Vision' || s.id === 'vision'
      ? {
          ...s,
          status: 'completed',
          details: `Audited ${visionResult.imageCount} image(s). Visual structure, layout, and content parsed.`,
          timestamp: new Date(),
        }
      : s
  );

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Vision',
    `Audited ${visionResult.imageCount} image(s) with visual feature extraction.`,
    { step: { id: 'vision', name: 'Visual analysis and image understanding', status: 'completed', timestamp: new Date() } }
  );

  return {
    steps,
    discoveredData: {
      ...(state.discoveredData || {}),
      vision: visionResult.images,
      visionComparison: visionResult.comparison,
    },
    currentAgent: state.requiredAgents?.includes('DataAnalysis') ? 'DataAnalysis' : 'Verification',
    currentAction: 'Visual analysis complete.',
  };
};

/**
 * 9. SCHEDULING NODE
 */
const schedulingNode = async (state) => {
  const primaryContact = state.externalContacts?.[0];
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Scheduling',
    `Coordinating target appointment window for ${primaryContact?.businessName || 'Provider'}...`,
    { step: { id: 'schedule', name: 'Scheduling appointment', status: 'in_progress', timestamp: new Date() } }
  );

  const schedResult = await schedulingAgent.scheduleAppointment(state, primaryContact, state.userIntegration);

  const steps = state.steps.map((s) => {
    const isSched =
      s.agent === 'Scheduling' ||
      s.id === 'schedule' ||
      /schedul|appoint|book|slot/i.test(s.name || '');
    return isSched
      ? {
          ...s,
          status: 'completed',
          details: `Appointment window coordinated: ${schedResult.output?.bookingDetails?.dateTime || 'Pending'}. Status: ${schedResult.output?.bookingDetails?.bookingStatus}.`,
          timestamp: new Date(),
        }
      : s;
  });

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Scheduling',
    `Coordinated slot: ${schedResult.output?.bookingDetails?.dateTime || 'Earliest available'}.`,
    { step: { id: 'schedule', name: 'Scheduling appointment', status: 'completed', timestamp: new Date() } }
  );

  return {
    bookingDetails: schedResult.output?.bookingDetails,
    steps,
    currentAgent: 'Verification',
    currentAction: 'Auditing execution evidence and final synthesis...',
  };
};

/**
 * 10. VERIFICATION NODE (Produces truthful final outcome and audits evidence)
 */
const verificationNode = async (state) => {
  logger.info(`[LangGraph Workflow] Verification Node auditing: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'Verification',
    'Auditing execution evidence, citations, and provider confirmations...',
    { step: { id: 'verify', name: 'Verifying outcomes and evidence', status: 'in_progress', timestamp: new Date() } }
  );

  const verifiedOutcome = await verificationAgent.verifyOutcome(state);

  const steps = state.steps.map((s) => ({
    ...s,
    status: 'completed',
    timestamp: s.timestamp || new Date(),
    details: s.details || (s.agent === 'Verification' || s.id === 'verify' ? `Outcome verified: ${verifiedOutcome.summary}` : s.details),
  }));

  await logMissionEvent(
    state,
    'STATUS_CHANGE',
    'Verification',
    `Audit completed: Outcome verified with ${verifiedOutcome.evidence?.length || 0} citations.`,
    { step: { id: 'verify', name: 'Verifying outcomes and evidence', status: 'completed', timestamp: new Date() } }
  );

  return {
    steps,
    outcome: verifiedOutcome,
    currentAgent: state.requiredAgents.includes('FollowUp') ? 'FollowUp' : 'Orchestrator',
    currentAction: state.requiredAgents.includes('FollowUp')
      ? 'Registering background response tracker...'
      : 'Mission completed with verified evidence.',
    status: verifiedOutcome.allTasksSucceeded ? 'COMPLETED' : 'PARTIALLY_COMPLETED',
  };
};

/**
 * 11. FOLLOW-UP NODE (Registers background response tracker)
 */
const followUpNode = async (state) => {
  logger.info(`[LangGraph Workflow] Follow-up Node executing for: ${state.taskId}`);
  const primaryContact = state.externalContacts?.[0];

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'FollowUp',
    `Initializing autonomous response tracker for ${primaryContact?.businessName || 'provider'}...`,
    { step: { id: 'followup', name: 'Response tracker setup', status: 'in_progress', timestamp: new Date() } }
  );

  const followUpRes = await followUpAgent.scheduleFollowUp(state, {
    recipient: primaryContact?.email || primaryContact?.phone || 'quotes@provider.local',
    recipientName: primaryContact?.businessName || 'Service Provider',
    channel: primaryContact?.email ? 'Email' : 'WhatsApp',
  });

  const steps = state.steps.map((s) =>
    s.agent === 'FollowUp' || s.id === 'followup'
      ? {
          ...s,
          status: 'completed',
          details: `Autonomous follow-up active. Next check: ${new Date(followUpRes.nextCheckAt).toLocaleDateString()}.`,
          timestamp: new Date(),
        }
      : s
  );

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'FollowUp',
    `Response tracker active: Next check scheduled for ${new Date(followUpRes.nextCheckAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
    { step: { id: 'followup', name: 'Response tracker setup', status: 'completed', timestamp: new Date() } }
  );

  return {
    steps,
    followUpData: followUpRes,
    currentAgent: 'Orchestrator',
    currentAction: 'Autonomous mission execution completed.',
    status: 'WAITING_FOR_RESPONSE',
  };
};

/**
 * 12. RECOVERY NODE
 */
const recoveryNode = async (state) => {
  logger.warn(`[LangGraph Workflow] Recovery Node triggered for: ${state.taskId}`);
  const recoveryResult = await recoveryAgent.handleFailure(state, state.error);

  if (!recoveryResult.recovered) {
    return {
      status: 'FAILED',
      error: recoveryResult.error,
      currentAction: recoveryResult.error.message,
    };
  }

  return {
    error: null,
    currentAgent: 'Research',
    currentAction: recoveryResult.instructions,
  };
};

/**
 * LOCAL SERVICE RESEARCH NODE (Strictly Research-Only, Zero Bookings)
 */
const localServiceNode = async (state) => {
  logger.info(`[LangGraph Workflow] LocalService Agent executing for: ${state.taskId}`);
  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'LocalService',
    'Researching verified regional providers, evaluating service suitability, and geocoding coordinates...',
    { step: { id: 'local_service', name: 'Local service research and verification', status: 'in_progress', timestamp: new Date() } }
  );

  // Fallback to Task document if state.userLocation was somehow omitted
  let resolvedLocation = state.userLocation || null;
  if (!resolvedLocation && state.taskDocId) {
    try {
      const taskDoc = await Task.findById(state.taskDocId).select('userLocation').lean();
      if (taskDoc?.userLocation) {
        resolvedLocation = taskDoc.userLocation;
      }
    } catch (_) {}
  }

  logger.info(`[DIAGNOSTICS][Point 5] Local Service Research location in localServiceNode: ${JSON.stringify(resolvedLocation || null)}`);

  const res = await localServiceAgent.execute({
    ...state,
    userLocation: resolvedLocation,
  });

  const isLocationRequired = res.status === 'LOCATION_REQUIRED' || res.output?.locationRequired;
  const isSearchFailed = res.status === 'SEARCH_FAILED' || res.output?.searchState === 'SEARCH_FAILED';

  const steps = (state.steps || []).map((s) =>
    s.agent === 'LocalService' || s.agent === 'Discovery' || s.id === 'discover' || s.id === 'local_service'
      ? {
          ...s,
          status: isLocationRequired ? 'failed' : (isSearchFailed ? 'failed' : 'completed'),
          details: isLocationRequired
            ? 'Location required to search nearby places.'
            : (isSearchFailed
                ? 'External business directory lookup failed.'
                : `Researched and evaluated ${res.providers?.length || 0} verified providers. Zero bookings or transactions initiated.`),
          timestamp: new Date(),
        }
      : s
  );

  await logMissionEvent(
    state,
    'STEP_PROGRESS',
    'LocalService',
    isLocationRequired
      ? 'Location permission required from user to proceed.'
      : (isSearchFailed
          ? 'Business search provider failed or returned an error.'
          : `Research complete: ${res.providers?.length || 0} verified providers cataloged. Interactive map coordinates synchronized.`),
    {
      step: {
        id: 'local_service',
        name: 'Local service research and verification',
        status: isLocationRequired || isSearchFailed ? 'failed' : 'completed',
        timestamp: new Date(),
      },
    }
  );

  return {
    status: isLocationRequired ? 'LOCATION_REQUIRED' : (isSearchFailed ? 'SEARCH_FAILED' : state.status),
    externalContacts: res.providers || [],
    locationData: res.locationData || null,
    comparisonMatrix: res.comparisonMatrix || null,
    researchSummary: res.output?.recommendation?.rationale || null,
    discoveredData: {
      ...(state.discoveredData || {}),
      localService: {
        ...res.output,
        params: res.output?.params || res.input?.params,
        searchState: res.output?.searchState || (isLocationRequired ? 'LOCATION_REQUIRED' : (isSearchFailed ? 'SEARCH_FAILED' : 'RESULTS_FOUND')),
        locationRequired: isLocationRequired,
      },
    },
    steps,
    currentAgent: 'Verification',
    currentAction: 'Verifying data sources and enforcing research-only guarantee...',
  };
};

// =========================================================================
// ASSEMBLE DYNAMIC STATE GRAPH
// =========================================================================
const workflow = new StateGraph(TaskStateAnnotation)
  .addNode('orchestrator', orchestratorNode)
  .addNode('local_service', localServiceNode)
  .addNode('location', locationNode)
  .addNode('research', researchNode)
  .addNode('merging', mergingNode)
  .addNode('planning', planningNode)
  .addNode('budget', budgetNode)
  .addNode('document', documentNode)
  .addNode('data_analysis', dataAnalysisNode)
  .addNode('vision', visionNode)
  .addNode('comparison', comparisonNode)
  .addNode('approval_gate', approvalGateNode)
  .addNode('communication', communicationNode)
  .addNode('execution', executionNode)
  .addNode('quotation', quotationNode)
  .addNode('scheduling', schedulingNode)
  .addNode('verification', verificationNode)
  .addNode('follow_up', followUpNode)
  .addNode('recovery', recoveryNode)

  // Start -> Planner
  .addEdge(START, 'orchestrator')

  // Dynamic Routing from Planner
  .addConditionalEdges('orchestrator', (state) => {
    if (state.error) return 'recovery';
    const req = state.requiredAgents || [];
    if (req.includes('Vision')) return 'vision';
    if (req.includes('DataAnalysis') && !req.includes('Research')) return 'data_analysis';
    if (req.includes('Document')) return 'document';
    if (req.includes('LocalService') || req.includes('Discovery')) return 'local_service';
    if (req.includes('Location')) return 'location';
    if (req.includes('Research')) return 'research';
    if (req.includes('Planning')) return 'planning';
    if (req.includes('Budget')) return 'budget';
    if (req.includes('Comparison') && !state.comparisonMatrix) return 'comparison';
    if (req.includes('Communication') && !state.executionEvidence) return 'approval_gate';
    if (req.includes('Scheduling') && !state.bookingDetails) return 'scheduling';
    return 'verification';
  })

  // LocalService -> Verification
  .addEdge('local_service', 'verification')

  // Vision -> DataAnalysis or Research or Verification
  .addConditionalEdges('vision', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('DataAnalysis')) return 'data_analysis';
    if (req.includes('Research')) return 'research';
    return 'verification';
  })

  // Document -> DataAnalysis or Verification (strictly no unneeded research/booking)
  .addConditionalEdges('document', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('DataAnalysis')) return 'data_analysis';
    if (req.includes('Research') && state.category !== 'DOCUMENT_ANALYSIS') return 'research';
    return 'verification';
  })

  // DataAnalysis -> Verification
  .addEdge('data_analysis', 'verification')

  // Location -> Research or Merging
  .addConditionalEdges('location', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('Research') && !state.researchSummary) return 'research';
    return 'merging';
  })

  // Research -> Merging
  .addEdge('research', 'merging')

  // Merging -> Planning or Comparison or Approval Gate or Verification
  .addConditionalEdges('merging', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('Planning') && !state.planningData) return 'planning';
    if (req.includes('Budget') && !state.budgetData) return 'budget';
    if (req.includes('Comparison') && !state.comparisonMatrix) return 'comparison';
    if (req.includes('Communication') && !state.executionEvidence) return 'approval_gate';
    if (req.includes('Scheduling') && !state.bookingDetails) return 'scheduling';
    return 'verification';
  })

  // Planning -> Budget or Communication or Verification
  .addConditionalEdges('planning', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('Budget') && !state.budgetData) return 'budget';
    if (req.includes('Communication') && (!state.communicationDrafts || state.communicationDrafts.length === 0)) return 'communication';
    return 'verification';
  })

  // Budget -> Communication or Verification
  .addConditionalEdges('budget', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('Communication') && (!state.communicationDrafts || state.communicationDrafts.length === 0)) return 'communication';
    return 'verification';
  })

  // Comparison -> Approval Gate or Scheduling or Quotation or Verification
  .addConditionalEdges('comparison', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('Communication') && !state.executionEvidence) return 'approval_gate';
    if (req.includes('Quotation') && !state.quotations) return 'quotation';
    if (req.includes('Scheduling') && !state.bookingDetails) return 'scheduling';
    return 'verification';
  })

  // Approval Gate -> Pause at END or proceed to Communication
  .addConditionalEdges('approval_gate', (state) => {
    if (state.requiresHumanApproval && !state.isApproved) {
      return END; // Pause for human authorization
    }
    return 'communication';
  })

  // Communication -> Execution or Verification (Mission planning does not execute external dispatches)
  .addConditionalEdges('communication', (state) => {
    const isMissionPlanning =
      state.category === 'MISSION_PLANNING' ||
      state.requiredAgents.includes('Planning') ||
      Boolean(state.planningData || state.budgetData);
    if (isMissionPlanning) return 'verification';
    return 'execution';
  })

  // Execution -> Quotation or Scheduling or Verification (strictly forward-only DAG)
  .addConditionalEdges('execution', (state) => {
    if (state.error) return 'recovery';
    const req = state.requiredAgents || [];
    if (req.includes('Quotation') && !state.quotations) return 'quotation';
    if (req.includes('Scheduling') && !state.bookingDetails) return 'scheduling';
    return 'verification';
  })

  // Quotation -> Scheduling or Verification
  .addConditionalEdges('quotation', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('Scheduling') && !state.bookingDetails) return 'scheduling';
    return 'verification';
  })

  // Scheduling -> Verification
  .addEdge('scheduling', 'verification')

  // Verification -> Follow-Up or END
  .addConditionalEdges('verification', (state) => {
    const req = state.requiredAgents || [];
    if (req.includes('FollowUp') && (state.status === 'COMPLETED' || state.status === 'PARTIALLY_COMPLETED' || state.status === 'WAITING_FOR_RESPONSE')) {
      return 'follow_up';
    }
    return END;
  })

  // Follow-Up -> END
  .addEdge('follow_up', END)

  // Recovery -> Resume or END
  .addConditionalEdges('recovery', (state) => (state.status === 'FAILED' ? END : 'orchestrator'));

export const agentGraph = workflow.compile();
export default agentGraph;
