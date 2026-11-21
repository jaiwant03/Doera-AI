import { v4 as uuidv4 } from 'uuid';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Task from '../models/Task.js';
import AgentExecution from '../models/AgentExecution.js';
import User from '../models/User.js';
import Memory from '../models/Memory.js';
import taskQueue from '../queue/taskQueue.js';
import agentGraph from '../workflows/agentGraph.js';
import llmService from '../services/llmService.js';
import modelManager from '../services/modelManager.js';
import usageService, { QuotaExceededError } from '../services/usageService.js';
import buildUniversalResponse from '../services/universalResponseBuilder.js';
import universalIntentService, { CATEGORIES } from '../services/universalIntentService.js';
import locationService from '../services/locationService.js';
import extractAndRegisterDeliverables from '../services/deliverableExtractor.js';
import conversationContextEngine from '../services/conversationContextEngine.js';
import fileStorageService from '../services/fileStorageService.js';

/**
 * Geocodes missing contact coordinates and creates structured locationData for interactive maps
 */
const enrichLocationData = async (task) => {
  if (task.locationData && Array.isArray(task.locationData.places) && task.locationData.places.length > 0) {
    return task.locationData;
  }
  const contacts = task.externalContacts || [];
  const placesWithCoords = [];

  for (let i = 0; i < contacts.length; i++) {
    const c = contacts[i];
    let lat = c.location?.lat;
    let lng = c.location?.lng;
    if (!lat || !lng) {
      const loc = c.address || `${c.businessName || c.name}`;
      try {
        const geo = await locationService.geocode(loc);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          c.location = { lat, lng };
        }
      } catch (_) {}
    }
    if (lat && lng) {
      placesWithCoords.push({
        id: c._id ? String(c._id) : `place-${i + 1}`,
        index: i + 1,
        name: c.businessName || c.name || `Provider ${i + 1}`,
        address: c.address || 'Address verified on OpenStreetMap',
        phone: c.phone || null,
        rating: c.rating || null,
        reviewsCount: c.reviewsCount || null,
        lat,
        lng,
        source: c.source || 'OpenStreetMap Nominatim',
        sourceUrl: c.sourceUrl || null,
        distanceKm: c.distanceKm || null,
        travelTime: c.travelTime || null,
      });
    }
  }

  if (placesWithCoords.length > 0) {
    const avgLat = placesWithCoords.reduce((sum, p) => sum + p.lat, 0) / placesWithCoords.length;
    const avgLng = placesWithCoords.reduce((sum, p) => sum + p.lng, 0) / placesWithCoords.length;
    const locationData = {
      type: 'places',
      center: { lat: avgLat, lng: avgLng },
      places: placesWithCoords,
    };
    task.locationData = locationData;
    await task.save().catch(() => {});
    return locationData;
  }
  return null;
};

// 1. GET AVAILABLE CONFIGURED MODELS
export const getModels = async (req, res) => {
  const models = modelManager.getAvailableModels();
  res.json({ models });
};

// 2. SERVER-SENT EVENTS (SSE) STREAMING ENDPOINT
export const streamMessage = async (req, res) => {
  const { conversationId, message, model, attachments = [] } = req.body;
  const userId = req.user._id;

  if (!message && attachments.length === 0) {
    return res.status(400).json({ error: 'Message content or attachment is required.' });
  }

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const requestId = req.headers['x-request-id'] || `req-${uuidv4().substring(0, 12)}`;
  const idempotencyKey = req.headers['idempotency-key'] || null;
  const testDate = req.headers['x-test-date'] || null;

  try {
    // Atomic quota reservation
    const quota = await usageService.reserveQuota({
      userId,
      requestId,
      requestType: 'stream',
      model,
      idempotencyKey,
      testDate,
    });

    // Resolve Centralized Universal Conversation Context
    const contextPayload = await conversationContextEngine.resolveConversationContext({
      conversationId,
      userId,
      message,
      incomingAttachments: attachments,
    });

    const conversation = contextPayload.conversation;
    const effectiveAttachments = contextPayload.effectiveAttachments;
    let historyContext = contextPayload.historyContext;

    if (model && conversation.selectedModel !== model) {
      conversation.selectedModel = model;
      await conversation.save().catch(() => {});
    }

    // Save user message with secure disk references (avoiding MongoDB BSON 16MB document overflows)
    const userMessageAttachments = effectiveAttachments.map((a) => ({
      name: a.name,
      type: a.type,
      size: a.size,
      storagePath: a.storagePath || null,
      fileId: a.fileId || null,
    }));

    const userMessage = await Message.create({
      conversationId: conversation._id,
      userId,
      sender: 'user',
      content: message,
      attachments: userMessageAttachments,
    });

    sendEvent('start', {
      conversationId: conversation._id,
      conversationTitle: conversation.title,
      userMessage,
      usage: {
        plan: quota.plan,
        dailyLimit: quota.dailyLimit,
        used: quota.used,
        limit: quota.dailyLimit,
        remaining: quota.remaining,
        resetAt: quota.resetAt,
        resetsIn: quota.resetsIn,
      },
    });

    // Fetch user personalized memories
    let memoryContext = '';
    try {
      const memories = await Memory.find({ userId, isActive: true }).limit(8);
      if (memories && memories.length > 0) {
        memoryContext = `\n[User Personalized Memories]:\n` + memories.map(m => `- ${m.key}: ${m.content}`).join('\n');
      }
    } catch (_) {}

    // 1. Check for Trip Planning / Route Request
    const tripIntent = locationService.detectTripIntent(message);
    if (tripIntent) {
      const originGeo = await locationService.geocode(tripIntent.from);
      const destGeo = await locationService.geocode(tripIntent.to);

      if (originGeo && destGeo) {
        const route = await locationService.calculateRoute({
          origin: originGeo,
          destination: destGeo,
          mode: 'driving',
        });

        if (route) {
          const taskId = `task-${uuidv4().substring(0, 8)}`;
          const locationData = {
            type: 'route',
            center: {
              lat: (originGeo.lat + destGeo.lat) / 2,
              lng: (originGeo.lng + destGeo.lng) / 2,
            },
            places: [
              {
                id: 'origin',
                index: 'A',
                name: originGeo.name,
                address: originGeo.displayName,
                lat: originGeo.lat,
                lng: originGeo.lng,
                category: 'START',
              },
              {
                id: 'destination',
                index: 'B',
                name: destGeo.name,
                address: destGeo.displayName,
                lat: destGeo.lat,
                lng: destGeo.lng,
                category: 'FINISH',
              },
            ],
            route,
          };

          const task = await Task.create({
            taskId,
            userId,
            conversationId: conversation._id,
            userRequest: message,
            category: 'TRAVEL_PLANNING',
            status: 'COMPLETED',
            currentAgent: 'Orchestrator',
            currentAction: 'Route calculated and visualized with verified OSRM coordinates.',
            locationData,
          });

          const aiMessageContent = buildUniversalResponse(task);

          const aiMessage = await Message.create({
            conversationId: conversation._id,
            userId,
            sender: 'assistant',
            content: aiMessageContent,
            taskId: task._id,
            locationData,
            status: 'complete',
          });

          await usageService.completeQuota(requestId);

          await conversationContextEngine.updateConversationContext({
            conversationId: conversation._id,
            category: 'TRAVEL_PLANNING',
            taskDoc: task,
            userMessage: message,
            aiResponse: aiMessageContent,
          });

          await conversationContextEngine.updateConversationContext({
            conversationId: conversation._id,
            category: 'TRAVEL_PLANNING',
            taskDoc: task,
            userMessage: message,
            aiResponse: aiMessageContent,
          });

          sendEvent('task_created', { aiMessage, task, locationData });
          sendEvent('done', {
            conversationId: conversation._id,
            aiMessage,
            task,
            locationData,
            usage: { used: quota.used, limit: quota.limit, remaining: quota.remaining },
          });
          res.end();
          return;
        }
      }
    }

    // 2. Universal Request Understanding & Dynamic Agent Selection
    const intent = await universalIntentService.understandRequest(
      message,
      effectiveAttachments,
      memoryContext,
      historyContext
    );

    // If contextEngine identified an ongoing continuation or follow-up, enforce category
    if (contextPayload.isFollowUp && contextPayload.resolvedCategory) {
      intent.primaryCategory = contextPayload.resolvedCategory;
      if (!intent.categories.includes(contextPayload.resolvedCategory)) {
        intent.categories.unshift(contextPayload.resolvedCategory);
      }
      if (contextPayload.followUpType === 'CHART_INSPECTION' || contextPayload.followUpType === 'MISSION_PLANNING_CONTINUATION' || contextPayload.followUpType === 'STATISTICAL_INSPECTION') {
        intent.isActionTask = true;
      }
    }

    logger.info(
      `[DOERA Router] Intent: ${intent.primaryCategory} | Feature: ${contextPayload.followUpType || 'Standard'} | Agents: ${(intent.requiredAgents || []).join(', ')} | Dataset: ${effectiveAttachments[0]?.name || 'N/A'} | Request: "${message.slice(0, 80)}"`
    );

    // If concise clarification is strictly required
    if (intent.clarificationNeeded) {
      const aiMessage = await Message.create({
        conversationId: conversation._id,
        userId,
        sender: 'assistant',
        content: intent.clarificationNeeded,
        status: 'complete',
      });
      await usageService.completeQuota(requestId);
      sendEvent('done', {
        conversationId: conversation._id,
        aiMessage,
        usage: { used: quota.used, limit: quota.limit, remaining: quota.remaining },
      });
      res.end();
      return;
    }

    // 3. Action Task / Multi-Agent Orchestration
    if (intent.isActionTask) {
      const missionId = `MSN-${Date.now().toString(36).toUpperCase()}-${uuidv4().substring(0, 6).toUpperCase()}`;
      const taskId = missionId;
      const task = await Task.create({
        taskId,
        missionId,
        userId,
        conversationId: conversation._id,
        userRequest: message,
        title: intent.primaryObjective?.slice(0, 70) || message.slice(0, 60),
        category: intent.primaryCategory,
        status: 'EXECUTING',
        currentAgent: 'Orchestrator',
        currentAction: `Coordinating specialized agents for ${intent.primaryCategory.toLowerCase().replace('_', ' ')}...`,
        intentAnalysis: intent,
        assignedAgents: intent.requiredAgents || ['Planner', 'Research', 'Verification'],
      });

      // Run execution through LangGraph dynamic agent workflow
      let resultState = null;
      try {
        const initialState = {
          taskId,
          taskDocId: task._id,
          userId,
          userRequest: message,
          category: intent.primaryCategory,
          status: 'EXECUTING',
          currentAgent: 'Orchestrator',
          currentAction: 'Executing multi-agent coordination with verified discovery...',
          steps: [],
          externalContacts: [],
          attachments: effectiveAttachments,
          conversationId: conversation._id,
          historyContext,
          contextSummary: contextPayload.contextSummary,
          isFollowUp: contextPayload.isFollowUp,
          followUpType: contextPayload.followUpType,
          lastChartConfig: contextPayload.lastChartConfig,
          lastCalculation: contextPayload.lastCalculation,
          lastPlan: contextPayload.lastPlan,
          lastDraft: contextPayload.lastDraft,
          lastResearchResults: contextPayload.lastResearchResults,
          activeArtifacts: contextPayload.activeArtifacts,
          isApproved: false, // Enforce human approval gate before external outreach
          onEvent: async (evt) => {
            await AgentExecution.create({
              taskId: task._id,
              agentName: ['Orchestrator', 'Supervisor', 'Planner', 'Planning', 'Budget', 'Research', 'Discovery', 'Location', 'LocalService', 'Communication', 'Quotation', 'Comparison', 'Document', 'DataAnalysis', 'Vision', 'Scheduling', 'Verification', 'FollowUp', 'Recovery'].includes(evt.currentAgent)
                ? evt.currentAgent
                : 'Orchestrator',
              agentType: 'autonomous',
              status: evt.step?.status === 'completed' ? 'completed' : 'started',
              input: { userRequest: message, action: evt.currentAction },
              output: evt,
              metadata: {
                eventType: evt.type,
                action: evt.currentAction,
              },
            }).catch(() => {});
          },
        };
        resultState = await agentGraph.invoke(initialState);
      } catch (graphErr) {
        console.warn('[DOERA Stream] Agent graph invoke error:', graphErr.message);
      }

      if (resultState) {
        task.status = resultState.status || 'PARTIALLY_COMPLETED';
        task.steps = resultState.steps || task.steps;
        task.outcome = resultState.outcome || task.outcome;
        task.bookingDetails = resultState.bookingDetails || task.bookingDetails;
        task.externalContacts = resultState.externalContacts || task.externalContacts;
        task.pendingApproval = resultState.pendingApproval || task.pendingApproval;
        task.discoveredData = resultState.discoveredData || task.discoveredData;
        task.comparisonMatrix = resultState.comparisonMatrix || task.comparisonMatrix;
        task.verificationReport = resultState.outcome?.verificationDimensions || [];
        task.chartConfig = resultState.chartConfig || resultState.discoveredData?.dataAnalysis?.chartConfig || task.chartConfig || null;
        task.currentAgent = resultState.currentAgent || 'Orchestrator';
        task.currentAction = resultState.currentAction || 'Execution synthesized with verified evidence.';

        if (task.category === 'DATA_ANALYSIS' || task.discoveredData?.dataAnalysis || task.chartConfig) {
          task.bookingDetails = null;
          task.pendingApproval = null;
          task.externalContacts = [];
          task.status = 'COMPLETED';
        }

        await task.save().catch(() => {});
      }

      const locationData = await enrichLocationData(task);
      const chartConfig = task.chartConfig || task.discoveredData?.dataAnalysis?.chartConfig || null;
      const aiMessageContent = buildUniversalResponse(task);

      await extractAndRegisterDeliverables(task, resultState, userId, aiMessageContent);

      const aiMessage = await Message.create({
        conversationId: conversation._id,
        userId,
        sender: 'assistant',
        content: aiMessageContent,
        taskId: task._id,
        locationData,
        chartConfig,
        status: 'complete',
      });

      await conversationContextEngine.updateConversationContext({
        conversationId: conversation._id,
        category: task.category,
        taskDoc: task,
        chartConfig,
        calculation: resultState?.calculation || task.discoveredData?.dataAnalysis?.calculation || null,
        plan: resultState?.plan || task.discoveredData?.planning || null,
        draft: resultState?.emailDraft || resultState?.draft || null,
        researchResults: resultState?.externalContacts || null,
        artifacts: resultState?.activeArtifacts || [],
        userMessage: message,
        aiResponse: aiMessageContent,
      });

      await usageService.completeQuota(requestId);

      sendEvent('task_created', {
        aiMessage,
        task,
        locationData,
        chartConfig,
      });

      sendEvent('done', {
        conversationId: conversation._id,
        aiMessage,
        task,
        locationData,
        chartConfig,
        usage: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
        },
      });
      res.end();
      return;
    }

    // 4. Direct General Knowledge & Technical Explanations (Streaming, No Heavy Task Card)
    const aiMessage = await Message.create({
      conversationId: conversation._id,
      userId,
      sender: 'assistant',
      content: '',
      status: 'streaming',
      modelUsed: model || conversation.selectedModel,
    });

    let fullText = '';
    const abortController = new AbortController();

    req.on('close', () => {
      abortController.abort();
    });

    const systemPrompt = `You are DOERA AI, the personal autonomous execution assistant ("Don't Just Ask AI. Let AI Get It Done.").

CRITICAL ANTI-HALLUCINATION & FACTUAL ACCURACY RULES:
- Never fabricate real-world information: no invented business names, doctor names, phone numbers, email addresses, physical addresses, ratings, consultation fees, or booking confirmations.
- Every real-world claim must originate from an actual external source or verified execution record.
- If information is unavailable or unverified, explicitly state that it could not be verified. Never fill missing details with plausible-sounding placeholders.
- Never mix industry pricing (e.g. searching for doctors or cardiologists must NEVER return electrician inspection fees or hourly repair rates).
- An appointment is ONLY confirmed when actual provider confirmation evidence exists. Never claim an appointment is confirmed if it is pending provider review.

CRITICAL RESPONSE FORMATTING GUIDELINES:
- Structure answers logically with high visual readability and clean hierarchy.
- Use markdown headings (## and ###) to clearly delineate sections.
- Start with a direct, concise executive summary or key takeaway.
- When presenting step-by-step technical explanations, use numbered lists and syntax-highlighted code blocks.
- When comparing multiple items, include a clean markdown comparison table with clear column headers.
- Conclude with actionable next steps or recommendations.
${memoryContext}`;

    // Fetch conversation history context
    const previousMessages = await Message.find({
      conversationId: conversation._id,
      _id: { $ne: aiMessage._id },
    })
      .sort({ createdAt: -1 })
      .limit(6);

    const historyForLlm = previousMessages.reverse().map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    await llmService.streamResponse({
      messages: [...historyForLlm, { role: 'user', content: message }],
      systemPrompt,
      model: model || conversation.selectedModel,
      signal: abortController.signal,
      onToken: (token) => {
        fullText += token;
        sendEvent('token', {
          messageId: aiMessage._id,
          token,
          fullText,
        });
      },
    });

    // Update message to complete
    aiMessage.content = fullText;
    aiMessage.status = abortController.signal.aborted ? 'interrupted' : 'complete';
    await aiMessage.save();

    await conversationContextEngine.updateConversationContext({
      conversationId: conversation._id,
      userMessage: message,
      aiResponse: fullText,
    });

    await usageService.completeQuota(requestId);

    sendEvent('done', {
      conversationId: conversation._id,
      aiMessage,
      status: aiMessage.status,
      usage: {
        plan: quota.plan,
        dailyLimit: quota.dailyLimit,
        used: quota.used,
        limit: quota.dailyLimit,
        remaining: quota.remaining,
        resetAt: quota.resetAt,
        resetsIn: quota.resetsIn,
      },
    });

    res.end();
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      sendEvent('limit_reached', error.details);
      res.end();
      return;
    }
    console.error('[DOERA Stream] Error:', error);
    await usageService.refundQuota(userId, requestId, error.message);
    sendEvent('error', { error: error.message || 'Stream generation failed.' });
    res.end();
  }
};

// 3. STANDARD REST SEND MESSAGE (RETAINED FOR ZERO-REGRESSION TEST & BACKWARD COMPATIBILITY)
export const sendMessage = async (req, res, next) => {
  const { conversationId, message, model, attachments = [] } = req.body;
  const userId = req.user._id;

  if (!message && attachments.length === 0) {
    return res.status(400).json({ error: 'Message content or attachment is required.' });
  }

  const requestId = req.headers['x-request-id'] || `req-${uuidv4().substring(0, 12)}`;
  const idempotencyKey = req.headers['idempotency-key'] || null;
  const testDate = req.headers['x-test-date'] || null;

  try {
    // Atomic quota reservation
    const quota = await usageService.reserveQuota({
      userId,
      requestId,
      requestType: 'message',
      model,
      idempotencyKey,
      testDate,
    });

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
    }

    if (!conversation) {
      const title = message.length > 40 ? `${message.substring(0, 37)}...` : message;
      conversation = await Conversation.create({
        userId,
        title,
        selectedModel: model || modelManager.getDefaultModel(),
        lastMessageAt: new Date(),
      });
    } else {
      conversation.lastMessageAt = new Date();
      if (model) conversation.selectedModel = model;
      await conversation.save();
    }

    // Resolve Centralized Universal Conversation Context
    const contextPayload = await conversationContextEngine.resolveConversationContext({
      conversationId: conversation?._id || conversationId,
      userId,
      message,
      incomingAttachments: attachments,
    });

    conversation = contextPayload.conversation;
    const effectiveAttachments = contextPayload.effectiveAttachments;
    const historyContext = contextPayload.historyContext;

    if (model && conversation.selectedModel !== model) {
      conversation.selectedModel = model;
      await conversation.save().catch(() => {});
    }

    // Save user message with secure disk references
    const userMessageAttachments = effectiveAttachments.map((a) => ({
      name: a.name,
      type: a.type,
      size: a.size,
      storagePath: a.storagePath || null,
      fileId: a.fileId || null,
    }));

    const userMessage = await Message.create({
      conversationId: conversation._id,
      userId,
      sender: 'user',
      content: message,
      attachments: userMessageAttachments,
    });

    // 1. Check for Trip Planning / Route Request
    const tripIntent = locationService.detectTripIntent(message);
    if (tripIntent) {
      const originGeo = await locationService.geocode(tripIntent.from);
      const destGeo = await locationService.geocode(tripIntent.to);

      if (originGeo && destGeo) {
        const route = await locationService.calculateRoute({
          origin: originGeo,
          destination: destGeo,
          mode: 'driving',
        });

        if (route) {
          const taskId = `task-${uuidv4().substring(0, 8)}`;
          const locationData = {
            type: 'route',
            center: {
              lat: (originGeo.lat + destGeo.lat) / 2,
              lng: (originGeo.lng + destGeo.lng) / 2,
            },
            places: [
              {
                id: 'origin',
                index: 'A',
                name: originGeo.name,
                address: originGeo.displayName,
                lat: originGeo.lat,
                lng: originGeo.lng,
                category: 'START',
              },
              {
                id: 'destination',
                index: 'B',
                name: destGeo.name,
                address: destGeo.displayName,
                lat: destGeo.lat,
                lng: destGeo.lng,
                category: 'FINISH',
              },
            ],
            route,
          };

          const task = await Task.create({
            taskId,
            userId,
            conversationId: conversation._id,
            userRequest: message,
            category: 'TRAVEL_PLANNING',
            status: 'COMPLETED',
            currentAgent: 'Orchestrator',
            currentAction: 'Route calculated and visualized with verified OSRM coordinates.',
            locationData,
          });

          const aiMessageContent = buildUniversalResponse(task);

          const aiMessage = await Message.create({
            conversationId: conversation._id,
            userId,
            sender: 'assistant',
            content: aiMessageContent,
            taskId: task._id,
            locationData,
            status: 'complete',
          });

          await usageService.completeQuota(requestId);

          await conversationContextEngine.updateConversationContext({
            conversationId: conversation._id,
            category: 'TRAVEL_PLANNING',
            taskDoc: task,
            userMessage: message,
            aiResponse: aiMessageContent,
          });

          return res.status(200).json({
            conversation,
            userMessage,
            aiMessage: {
              ...aiMessage.toObject(),
              task: task.toObject(),
              locationData,
            },
            task,
            locationData,
            usage: {
              plan: quota.plan,
              dailyLimit: quota.dailyLimit,
              used: quota.used,
              limit: quota.dailyLimit,
              remaining: quota.remaining,
              resetAt: quota.resetAt,
              resetsIn: quota.resetsIn,
            },
          });
        }
      }
    }

    // 2. Universal Request Understanding & Dynamic Agent Selection
    let memoryContext = '';
    try {
      const memories = await Memory.find({ userId, isActive: true }).limit(8);
      if (memories && memories.length > 0) {
        memoryContext = `\n[User Personalized Memories]:\n` + memories.map(m => `- ${m.key}: ${m.content}`).join('\n');
      }
    } catch (_) {}

    const intent = await universalIntentService.understandRequest(
      message,
      effectiveAttachments,
      memoryContext,
      historyContext
    );

    // If contextEngine identified an ongoing continuation or follow-up, enforce category
    if (contextPayload.isFollowUp && contextPayload.resolvedCategory) {
      intent.primaryCategory = contextPayload.resolvedCategory;
      if (!intent.categories.includes(contextPayload.resolvedCategory)) {
        intent.categories.unshift(contextPayload.resolvedCategory);
      }
      if (contextPayload.followUpType === 'CHART_INSPECTION' || contextPayload.followUpType === 'MISSION_PLANNING_CONTINUATION' || contextPayload.followUpType === 'STATISTICAL_INSPECTION') {
        intent.isActionTask = true;
      }
    }

    logger.info(
      `[DOERA Router] Intent: ${intent.primaryCategory} | Feature: ${contextPayload.followUpType || 'Standard'} | Agents: ${(intent.requiredAgents || []).join(', ')} | Dataset: ${effectiveAttachments[0]?.name || 'N/A'} | Request: "${message.slice(0, 80)}"`
    );

    // If concise clarification is strictly required
    if (intent.clarificationNeeded) {
      const aiMessage = await Message.create({
        conversationId: conversation._id,
        userId,
        sender: 'assistant',
        content: intent.clarificationNeeded,
        status: 'complete',
      });
      await usageService.completeQuota(requestId);
      return res.status(200).json({
        conversation,
        userMessage,
        aiMessage,
        task: null,
        locationData: null,
        usage: {
          plan: quota.plan,
          dailyLimit: quota.dailyLimit,
          used: quota.used,
          limit: quota.dailyLimit,
          remaining: quota.remaining,
          resetAt: quota.resetAt,
          resetsIn: quota.resetsIn,
        },
      });
    }

    let aiMessage;
    let task = null;

    if (intent.isActionTask) {
      const missionId = `MSN-${Date.now().toString(36).toUpperCase()}-${uuidv4().substring(0, 6).toUpperCase()}`;
      const taskId = missionId;
      task = await Task.create({
        taskId,
        missionId,
        userId,
        conversationId: conversation._id,
        userRequest: message,
        title: intent.primaryObjective?.slice(0, 70) || message.slice(0, 60),
        category: intent.primaryCategory,
        status: 'EXECUTING',
        currentAgent: 'Orchestrator',
        currentAction: `Coordinating specialized agents for ${intent.primaryCategory.toLowerCase().replace('_', ' ')}...`,
        intentAnalysis: intent,
        assignedAgents: intent.requiredAgents || ['Planner', 'Research', 'Verification'],
      });

      // Run execution through LangGraph dynamic agent workflow
      let resultState = null;
      try {
        const initialState = {
          taskId,
          taskDocId: task._id,
          userId,
          userRequest: message,
          category: intent.primaryCategory,
          status: 'EXECUTING',
          currentAgent: 'Orchestrator',
          currentAction: 'Executing multi-agent coordination with verified discovery...',
          steps: [],
          externalContacts: [],
          attachments: effectiveAttachments,
          conversationId: conversation._id,
          historyContext,
          contextSummary: contextPayload.contextSummary,
          isFollowUp: contextPayload.isFollowUp,
          followUpType: contextPayload.followUpType,
          lastChartConfig: contextPayload.lastChartConfig,
          lastCalculation: contextPayload.lastCalculation,
          lastPlan: contextPayload.lastPlan,
          lastDraft: contextPayload.lastDraft,
          lastResearchResults: contextPayload.lastResearchResults,
          activeArtifacts: contextPayload.activeArtifacts,
          isApproved: false, // Enforce human approval gate before external outreach
          onEvent: async (evt) => {
            await AgentExecution.create({
              taskId: task._id,
              agentName: ['Orchestrator', 'Supervisor', 'Planner', 'Planning', 'Budget', 'Research', 'Discovery', 'Location', 'LocalService', 'Communication', 'Quotation', 'Comparison', 'Document', 'DataAnalysis', 'Vision', 'Scheduling', 'Verification', 'FollowUp', 'Recovery'].includes(evt.currentAgent)
                ? evt.currentAgent
                : 'Orchestrator',
              agentType: 'autonomous',
              status: evt.step?.status === 'completed' ? 'completed' : 'started',
              input: { userRequest: message, action: evt.currentAction },
              output: evt,
              metadata: {
                eventType: evt.type,
                action: evt.currentAction,
              },
            }).catch(() => {});
          },
        };
        resultState = await agentGraph.invoke(initialState);
      } catch (graphErr) {
        console.warn('[DOERA Chat] Agent graph invoke error:', graphErr.message);
      }

      if (resultState) {
        task.status = resultState.status || 'PARTIALLY_COMPLETED';
        task.steps = resultState.steps || task.steps;
        task.outcome = resultState.outcome || task.outcome;
        task.bookingDetails = resultState.bookingDetails || task.bookingDetails;
        task.externalContacts = resultState.externalContacts || task.externalContacts;
        task.pendingApproval = resultState.pendingApproval || task.pendingApproval;
        task.discoveredData = resultState.discoveredData || task.discoveredData;
        task.comparisonMatrix = resultState.comparisonMatrix || task.comparisonMatrix;
        task.verificationReport = resultState.outcome?.verificationDimensions || [];
        task.chartConfig = resultState.chartConfig || resultState.discoveredData?.dataAnalysis?.chartConfig || task.chartConfig || null;
        task.currentAgent = resultState.currentAgent || 'Orchestrator';
        task.currentAction = resultState.currentAction || 'Execution synthesized with verified evidence.';

        if (task.category === 'DATA_ANALYSIS' || task.discoveredData?.dataAnalysis || task.chartConfig) {
          task.bookingDetails = null;
          task.pendingApproval = null;
          task.externalContacts = [];
          task.status = 'COMPLETED';
        }

        await task.save().catch(() => {});
      }

      const locationData = await enrichLocationData(task);
      const chartConfig = task.chartConfig || task.discoveredData?.dataAnalysis?.chartConfig || null;
      const aiMessageContent = buildUniversalResponse(task);

      await extractAndRegisterDeliverables(task, resultState, userId, aiMessageContent);

      aiMessage = await Message.create({
        conversationId: conversation._id,
        userId,
        sender: 'assistant',
        content: aiMessageContent,
        taskId: task._id,
        locationData,
        chartConfig,
        status: 'complete',
      });

      await conversationContextEngine.updateConversationContext({
        conversationId: conversation._id,
        category: task.category,
        taskDoc: task,
        chartConfig,
        calculation: resultState?.calculation || task.discoveredData?.dataAnalysis?.calculation || null,
        plan: resultState?.plan || task.discoveredData?.planning || null,
        draft: resultState?.emailDraft || resultState?.draft || null,
        researchResults: resultState?.externalContacts || null,
        artifacts: resultState?.activeArtifacts || [],
        userMessage: message,
        aiResponse: aiMessageContent,
      });

      await usageService.completeQuota(requestId);
    } else {
      // Direct General Knowledge & Technical Explanations
      const systemPrompt = `You are DOERA AI, the personal autonomous execution assistant ("Don't Just Ask AI. Let AI Get It Done.").

CRITICAL ANTI-HALLUCINATION & FACTUAL ACCURACY RULES:
- Never fabricate real-world information: no invented business names, doctor names, phone numbers, email addresses, physical addresses, ratings, consultation fees, or booking confirmations.
- Every real-world claim must originate from an actual external source or verified execution record.
- If information is unavailable or unverified, explicitly state that it could not be verified. Never fill missing details with plausible-sounding placeholders.
- Never mix industry pricing (e.g. searching for doctors or cardiologists must NEVER return electrician inspection fees or hourly repair rates).
- An appointment is ONLY confirmed when actual provider confirmation evidence exists. Never claim an appointment is confirmed if it is pending provider review.

CRITICAL RESPONSE FORMATTING GUIDELINES:
- Structure answers logically with high visual readability and clean hierarchy.
- Use markdown headings (## and ###) to clearly delineate sections.
- Start with a direct, concise executive summary or key takeaway.
- When presenting step-by-step technical explanations, use numbered lists and syntax-highlighted code blocks.
- When comparing multiple items, include a clean markdown comparison table with clear column headers.
- Conclude with actionable next steps or recommendations.
${memoryContext}`;

      let llmAnswer = '';
      try {
        llmAnswer = await llmService.generate({
          systemPrompt,
          userPrompt: message,
          jsonMode: false,
          temperature: 0.3,
        });
      } catch (err) {
        console.error('[DOERA Chat] LLM direct response failed:', err);
      }

      aiMessage = await Message.create({
        conversationId: conversation._id,
        userId,
        sender: 'assistant',
        content: llmAnswer || `Hello! I am DOERA AI, your personal autonomous assistant. I don't just chat—I get real-world tasks done for you: finding verified local professionals, scheduling appointments, comparing quotes, managing tasks, and verifying outcomes. What would you like to get done today?`,
        status: 'complete',
      });

      await conversationContextEngine.updateConversationContext({
        conversationId: conversation._id,
        userMessage: message,
        aiResponse: aiMessage.content,
      });

      await usageService.completeQuota(requestId);
    }

    const finalLocationData = aiMessage.locationData || task?.locationData || null;
    const finalChartConfig = aiMessage.chartConfig || task?.chartConfig || null;

    res.status(200).json({
      conversation,
      userMessage,
      aiMessage: {
        ...aiMessage.toObject(),
        task: task ? task.toObject() : null,
        locationData: finalLocationData,
        chartConfig: finalChartConfig,
      },
      task,
      locationData: finalLocationData,
      chartConfig: finalChartConfig,
      usage: {
        plan: quota.plan,
        dailyLimit: quota.dailyLimit,
        used: quota.used,
        limit: quota.dailyLimit,
        remaining: quota.remaining,
        resetAt: quota.resetAt,
        resetsIn: quota.resetsIn,
      },
    });
  } catch (error) {
    if (requestId && userId) {
      await usageService.releaseQuota(userId, requestId, error.message).catch(() => {});
    }
    if (error instanceof QuotaExceededError) {
      return res.status(403).json(error.details);
    }
    next(error);
  }
};

// 4. MESSAGE FEEDBACK (THUMBS UP / DOWN)
export const feedbackMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body; // 'like' | 'dislike' | null

    const msg = await Message.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { feedback },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: 'Message not found' });
    res.json({ success: true, message: msg });
  } catch (err) {
    next(err);
  }
};

// 5. PIN / UNPIN CONVERSATION
export const togglePinConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conv = await Conversation.findOne({ _id: id, userId: req.user._id });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    conv.isPinned = !conv.isPinned;
    await conv.save();
    res.json({ success: true, isPinned: conv.isPinned, conversation: conv });
  } catch (err) {
    next(err);
  }
};

// 6. ARCHIVE CONVERSATION
export const archiveConversation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conv = await Conversation.findOne({ _id: id, userId: req.user._id });
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    conv.status = conv.status === 'archived' ? 'active' : 'archived';
    await conv.save();
    res.json({ success: true, status: conv.status, conversation: conv });
  } catch (err) {
    next(err);
  }
};

// 7. GET CONVERSATIONS
export const getConversations = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      Conversation.find({ userId: req.user._id })
        .sort({ isPinned: -1, lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
      Conversation.countDocuments({ userId: req.user._id }),
    ]);

    res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 8. GET CONVERSATION
export const getConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversationId: conversation._id })
      .populate('taskId')
      .sort({ createdAt: 1 });

    const tasks = await Task.find({ conversationId: conversation._id }).sort({ createdAt: -1 });

    res.json({ conversation, messages, tasks });
  } catch (error) {
    next(error);
  }
};

// 9. DELETE CONVERSATION
export const deleteConversation = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    await Message.deleteMany({ conversationId: req.params.id });
    await Task.deleteMany({ conversationId: req.params.id });

    res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    next(error);
  }
};

// 10. RENAME CONVERSATION
export const renameConversation = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }

    const conversation = await Conversation.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title: title.trim() },
      { new: true }
    );

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    res.json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};
