import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import FileMetadata from '../models/FileMetadata.js';
import fileStorageService from './fileStorageService.js';
import llmService from './llmService.js';
import { logger } from '../utils/logger.js';

class ConversationContextEngine {
  /**
   * Main Pipeline Entry:
   * Retrieves, resolves, and enriches the complete multi-turn conversation context.
   */
  async resolveConversationContext({ conversationId, userId, message = '', incomingAttachments = [] }) {
    const text = (message || '').trim();
    const lower = text.toLowerCase();

    // 1. Identify and Validate Current Conversation (Strict User Isolation)
    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, userId });
    }

    if (!conversation) {
      const title = text.length > 40 ? `${text.substring(0, 37)}...` : text || 'New Workspace Task';
      conversation = await Conversation.create({
        userId,
        title,
        lastMessageAt: new Date(),
      });
    }

    // 2. Persist any incoming attachments to disk and register in conversation
    const effectiveAttachments = [];
    const conversationUploadedFiles = Array.isArray(conversation.uploadedFiles) ? [...conversation.uploadedFiles] : [];

    if (Array.isArray(incomingAttachments) && incomingAttachments.length > 0) {
      for (const att of incomingAttachments) {
        try {
          const stored = await fileStorageService.saveAttachment({
            userId,
            conversationId: conversation._id,
            attachment: att,
          });
          if (stored) {
            effectiveAttachments.push(stored);
            // Record in conversation uploaded files if not already present
            const exists = conversationUploadedFiles.some(
              (f) => f.name === stored.name || (f.fileId && stored.fileId && String(f.fileId) === String(stored.fileId))
            );
            if (!exists) {
              conversationUploadedFiles.push({
                fileId: stored.fileId || null,
                name: stored.name,
                type: stored.type,
                size: stored.size,
                storagePath: stored.storagePath || null,
                uploadedAt: new Date(),
              });
            }
          }
        } catch (saveErr) {
          logger.warn(`[ContextEngine] Failed saving attachment "${att.name}": ${saveErr.message}`);
          effectiveAttachments.push(att);
        }
      }
      conversation.uploadedFiles = conversationUploadedFiles;
      await conversation.save().catch(() => {});
    }

    // 3. Retrieve Complete Message History (Chronological order)
    const rawMessages = await Message.find({
      conversationId: conversation._id,
      userId,
    })
      .sort({ createdAt: 1 })
      .lean();

    // If no incoming attachments, hydrate previous conversation attachments from disk
    if (effectiveAttachments.length === 0 && conversationUploadedFiles.length > 0) {
      for (const f of conversationUploadedFiles) {
        let buffer = null;
        if (f.storagePath) {
          buffer = await fileStorageService.getFileBuffer(f.storagePath, userId);
        } else if (f.fileId) {
          buffer = await fileStorageService.getFileBuffer(f.fileId, userId);
        }

        effectiveAttachments.push({
          name: f.name,
          type: f.type,
          size: f.size,
          storagePath: f.storagePath,
          fileId: f.fileId,
          buffer: buffer || null,
        });
      }
    }

    // Also check for messages with attachments if conversation.uploadedFiles was empty
    if (effectiveAttachments.length === 0) {
      const prevMsgWithFiles = rawMessages
        .slice()
        .reverse()
        .find((m) => Array.isArray(m.attachments) && m.attachments.length > 0);

      if (prevMsgWithFiles) {
        for (const att of prevMsgWithFiles.attachments) {
          const buffer = att.storagePath ? await fileStorageService.getFileBuffer(att.storagePath, userId) : null;
          effectiveAttachments.push({
            name: att.name,
            type: att.type,
            size: att.size,
            storagePath: att.storagePath || null,
            fileId: att.fileId || null,
            buffer: buffer || null,
          });
        }
      }
    }

    // 4. Extract Prior Artifacts & Structured State
    const lastChartConfig = conversation.lastChartConfig || this.extractLatestFromMessages(rawMessages, 'chartConfig');
    const lastCalculation = conversation.lastCalculation || this.extractLatestFromMessages(rawMessages, 'calculation');
    const lastDocumentAnalysis = conversation.lastDocumentAnalysis || null;
    const lastPlan = conversation.lastPlan || null;
    const lastDraft = conversation.lastDraft || null;
    let lastResearchResults = conversation.lastResearchResults || null;
    if (!lastResearchResults) {
      const msgLoc = this.extractLatestFromMessages(rawMessages, 'locationData');
      if (msgLoc) lastResearchResults = { locationData: msgLoc, providers: [] };
    } else if (Array.isArray(lastResearchResults)) {
      lastResearchResults = {
        conversationId: conversation._id.toString(),
        providers: lastResearchResults,
        categoryTitle: 'Local Services',
        searchLocation: 'Your Location',
        searchRadius: 15,
      };
    }
    const activeArtifacts = Array.isArray(conversation.activeArtifacts) ? conversation.activeArtifacts : [];

    // 5. Build Formatted Multi-Turn History Context
    const recentMessages = rawMessages.slice(-10);
    const historyContext = recentMessages
      .map((m) => {
        const senderLabel = m.sender === 'user' ? 'User' : 'DOERA AI';
        const contentSnippet = m.content ? m.content.slice(0, 1000) : '';
        let extraInfo = '';
        if (m.chartConfig) {
          extraInfo += ` [Generated Chart: ${m.chartConfig.title || m.chartConfig.type || 'Interactive Chart'}, Metrics: ${JSON.stringify(m.chartConfig.summaryStats || {})}]`;
        }
        if (m.calculation) {
          extraInfo += ` [Calculation: ${m.calculation.operation || 'Computed Summary'}, Total: ${m.calculation.totalSum}, Items: ${m.calculation.items?.length || 0}]`;
        }
        return `${senderLabel}: ${contentSnippet}${extraInfo}`;
      })
      .join('\n\n');

    // 6. Intelligent Reference & Follow-Up Resolution (Phase 8)
    const followUpAnalysis = this.analyzeFollowUpIntent({
      text,
      lower,
      hasIncomingAttachments: incomingAttachments.length > 0,
      hasEffectiveAttachments: effectiveAttachments.length > 0,
      lastChartConfig,
      lastCalculation,
      lastDocumentAnalysis,
      lastPlan,
      lastDraft,
      lastResearchResults,
      activeCategory: conversation.activeCategory,
      rawMessages,
    });

    return {
      conversation,
      conversationId: conversation._id,
      userId,
      rawMessages,
      historyContext,
      recentMessages,
      contextSummary: conversation.contextSummary || '',
      effectiveAttachments,
      activeArtifacts,
      lastChartConfig,
      lastCalculation,
      lastDocumentAnalysis,
      lastPlan,
      lastDraft,
      lastResearchResults,
      activeMissionId: conversation.activeMissionId || null,
      activeCategory: conversation.activeCategory || null,
      isFollowUp: followUpAnalysis.isFollowUp,
      followUpType: followUpAnalysis.followUpType,
      resolvedCategory: followUpAnalysis.resolvedCategory || conversation.activeCategory || null,
      referencedArtifact: followUpAnalysis.referencedArtifact,
      instructionType: followUpAnalysis.instructionType,
    };
  }

  /**
   * Evaluates whether the incoming message is an ongoing follow-up or a new independent task
   */
  analyzeFollowUpIntent({
    text,
    lower,
    hasIncomingAttachments,
    hasEffectiveAttachments,
    lastChartConfig,
    lastCalculation,
    lastDocumentAnalysis,
    lastPlan,
    lastDraft,
    lastResearchResults,
    activeCategory,
    rawMessages,
  }) {
    if (rawMessages.length === 0 && !lastPlan && !lastChartConfig && !lastCalculation && !lastDocumentAnalysis && !lastDraft && !lastResearchResults) {
      return {
        isFollowUp: false,
        followUpType: 'NEW_CONVERSATION',
        resolvedCategory: null,
        referencedArtifact: null,
        instructionType: 'NEW_TASK',
      };
    }

    // Explicit new task declaration
    if (/^start a completely new|^start a new task|^new analysis|^forget the previous|^new project/i.test(lower)) {
      return {
        isFollowUp: false,
        followUpType: 'EXPLICIT_NEW_TASK',
        resolvedCategory: null,
        referencedArtifact: null,
        instructionType: 'NEW_TASK',
      };
    }

    // Check if the previous message was an assistant clarification asking for column names (e.g. covariance)
    const lastAssistantMsg = rawMessages && rawMessages.length > 0
      ? rawMessages.slice().reverse().find(m => m.sender === 'assistant')
      : null;
    const isAnsweringCovarianceClarification =
      lastAssistantMsg &&
      /(covariance|correlation|which two columns|specify which two columns)/i.test(lastAssistantMsg.content || '') &&
      !/^(start|new|cancel|stop|reset)\b/i.test(lower);

    // 1. Statistical & Chart Follow-ups (Phases 7, 8, 9)
    const isStatFollowUp =
      isAnsweringCovarianceClarification ||
      ((activeCategory === 'DATA_ANALYSIS' || hasEffectiveAttachments || Boolean(lastCalculation)) &&
      /(mean|median|mode|average|avg|middle\s*value|most\s*frequent|occurs?\s*most|variance|\bvar\b|variation|standard\s*deviation|std\s*dev|stdev|coefficient\s*of\s*variation|\bcv\b|range|spread|quartile|quartiles|q1|q2|q3|iqr|interquartile|five[\s-]number|skew|skewness|kurtosis|outlier|outliers|anomalies|anomalous|correlation|spearman|pearson|covariance|statistical\s*(summary|analysis|profile|measures?|results?)|full\s*statistics|all\s*statistics|explain\s*(what\s*)?(this|the)?\s*(cv|variance|standard\s*deviation|mean|median|mode)|compare\s*(it\s*)?with\s*(the\s*)?previous\s*(standard\s*deviation|mean|median|variance)|give\s*me\s*a\s*complete\s*statistical\s*summary)/i.test(lower));

    if (isStatFollowUp) {
      return {
        isFollowUp: true,
        followUpType: 'STATISTICAL_INSPECTION',
        resolvedCategory: 'DATA_ANALYSIS',
        referencedArtifact: { calculation: lastCalculation, chart: lastChartConfig },
        instructionType: 'STATISTICAL_CALCULATION',
      };
    }

    const isChartFollowUp =
      /(in this chart|interpret this chart|explain (the|this|that) chart|about this chart|this chart|the chart|change (it|the chart) to (a )?(pie|bar|line|doughnut|area)|convert (it|the chart)|switch to (pie|bar|line)|what does the chart show)/i.test(lower) ||
      (Boolean(lastChartConfig || lastCalculation) && /(which category|highest spending|lowest spending|compare monthly|contributes the highest percentage|highest percentage|total expenses|transactions)/i.test(lower));

    if (isChartFollowUp) {
      let instructionType = 'CHART_EXPLANATION';
      if (/pie|doughnut|donut/i.test(lower)) instructionType = 'CONVERT_TO_PIE';
      else if (/bar/i.test(lower)) instructionType = 'CONVERT_TO_BAR';
      else if (/line/i.test(lower)) instructionType = 'CONVERT_TO_LINE';
      else if (/highest|top/i.test(lower)) instructionType = 'QUERY_HIGHEST';
      else if (/percentage/i.test(lower)) instructionType = 'QUERY_PERCENTAGE';

      return {
        isFollowUp: true,
        followUpType: 'CHART_INSPECTION',
        resolvedCategory: 'DATA_ANALYSIS',
        referencedArtifact: { chart: lastChartConfig, calculation: lastCalculation },
        instructionType,
      };
    }

    // 2. Planning Follow-ups (Hackathon, Event, Budget)
    const isPlanFollowUp =
      activeCategory === 'MISSION_PLANNING' ||
      /(reduce the budget|increase the budget|change the budget|revised schedule|schedule revision|responsibilities of each volunteer|volunteer responsibilities|organizing committee|timeline|venue arrangements)/i.test(lower);

    if (isPlanFollowUp && (activeCategory === 'MISSION_PLANNING' || lastPlan || rawMessages.length > 0)) {
      return {
        isFollowUp: true,
        followUpType: 'MISSION_PLANNING_CONTINUATION',
        resolvedCategory: 'MISSION_PLANNING',
        referencedArtifact: { plan: lastPlan },
        instructionType: /(reduce|budget)/i.test(lower) ? 'BUDGET_MODIFICATION' : 'SCHEDULE_OR_ROLES',
      };
    }

    // 3. Document Follow-ups (Proposal, architecture, weaknesses, improvements, slide explanation, dates)
    const isDocFollowUp =
      activeCategory === 'DOCUMENT_ANALYSIS' ||
      Boolean(lastDocumentAnalysis) ||
      /(weakness|weaknesses|what are the weaknesses|how can i improve|improve the backend|third recommendation|first recommendation|second recommendation|proposed architecture|improved architecture|explain slide|technical requirements|important dates|summarize it again|compare (this|these) (with|and)?|which document is better|in this proposal|about this proposal)/i.test(lower);

    if (isDocFollowUp && (activeCategory === 'DOCUMENT_ANALYSIS' || hasEffectiveAttachments || Boolean(lastDocumentAnalysis))) {
      let instructionType = 'DOCUMENT_QUERY';
      if (/(weakness)/i.test(lower)) instructionType = 'WEAKNESS_ELABORATION';
      else if (/(improve|recommendation)/i.test(lower)) instructionType = 'IMPROVEMENT_ELABORATION';
      else if (/(architecture)/i.test(lower)) instructionType = 'ARCHITECTURE_QUERY';
      else if (/(compare)/i.test(lower)) instructionType = 'DOC_COMPARISON';
      else if (/(slide)/i.test(lower)) instructionType = 'SLIDE_QUERY';

      return {
        isFollowUp: true,
        followUpType: 'DOCUMENT_INSPECTION',
        resolvedCategory: 'DOCUMENT_ANALYSIS',
        referencedArtifact: { documentAnalysis: lastDocumentAnalysis },
        instructionType,
      };
    }

    // 4. Image / Vision Follow-ups
    const isVisionFollowUp =
      activeCategory === 'IMAGE_ANALYSIS' ||
      /(fix the (spacing|alignment|contrast|font) issue|alignment issue|spacing issue|better color combination|suggest colors|compare (it|this) with the previous screenshot|ui feedback)/i.test(lower);

    if (isVisionFollowUp && (activeCategory === 'IMAGE_ANALYSIS' || hasEffectiveAttachments)) {
      return {
        isFollowUp: true,
        followUpType: 'IMAGE_INSPECTION',
        resolvedCategory: 'IMAGE_ANALYSIS',
        referencedArtifact: null,
        instructionType: /(color)/i.test(lower) ? 'COLOR_SUGGESTION' : 'ALIGNMENT_FIX',
      };
    }

    // 5. Local Service Follow-ups (Closest, ordinal, ratings, distance filter, compare, directions, map)
    const hasPreviousLocalResults = Boolean(
      lastResearchResults &&
      (Array.isArray(lastResearchResults.providers)
        ? lastResearchResults.providers.length > 0
        : Array.isArray(lastResearchResults)
          ? lastResearchResults.length > 0
          : false)
    );

    // Check if user is asking for a brand new search in another category
    const prevCategory = (lastResearchResults?.serviceCategory || lastResearchResults?.categoryTitle || '').toLowerCase();
    const isNewCategorySearch =
      (/\b(laptop|computer)\b/i.test(lower) && !/laptop|computer/i.test(prevCategory)) ||
      (/\b(cinema|theatre|theater|multiplex|movie)\b/i.test(lower) && !/cinema|theatre|theater|movie/i.test(prevCategory)) ||
      (/\b(hospital|clinic|doctor)\b/i.test(lower) && !/hospital|clinic/i.test(prevCategory)) ||
      (/\b(restaurant|cafe|food)\b/i.test(lower) && !/restaurant|cafe/i.test(prevCategory)) ||
      (/\b(mobile|phone)\s*(?:repair|service|centre|center|shop)?/i.test(lower) && !/mobile|phone/i.test(prevCategory));

    // Check if user explicitly requests more or another search
    const isExplicitNewSearch =
      /^(?:find|search|look for|locate)\s+(?:\d+|more|other|another|new)\s+/i.test(lower) ||
      /\b(?:find|search\s+for|show\s+me)\s+(?:5|five|10|ten|\d+)\s+more\b/i.test(lower) ||
      /\b(?:in|at)\s+(?:chennai|bangalore|bengaluru|mumbai|delhi|hyderabad|kolkata|pune|ooty|tirupur|salem|madurai|calicut|kochi)\b/i.test(lower);

    // Check for explicit follow-up indicators
    const isLocalFollowUpPattern =
      /(?:among\s+(?:all\s+)?(?:these|the|those)|which\s+(?:one|centre|center|theatre|theater|cinema|hospital|restaurant|shop|place)\s+is|which\s+(?:is|one\s+is)\s+(?:closely\s*near|closest|closer|nearest|second\s*closest|third\s*closest|cheapest|best|highest|top)|which\s+of\s+these\s+is|which\s+(?:ones?\s+)?are\s+within|closest\s+(?:one|to\s+me)|nearest\s+(?:one|to\s+me)|second\s+closest|third\s+closest)/i.test(lower) ||
      /(?:(?:address|phone|contact|directions?|details)\s+of\s+(?:the\s+)?(?:first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|that|closest)|show\s+me\s+its\s+address|give\s+me\s+its\s+address|give\s+me\s+directions\s+to\s+that)/i.test(lower) ||
      /(?:highest\s*rating|best\s*rating|which\s+has\s+the\s+highest\s*rating|cheapest|lowest\s*cost|within\s+\d+\s*(?:km|kilometers?)|less\s+than\s+\d+\s*(?:km|kilometers?)|centres?\s+within\s+\d+)/i.test(lower) ||
      /(?:compare\s+(?:the\s+)?(?:first|second|third|1st|2nd|3rd|these|all|both)|compare\s+.*and\s+.*)/i.test(lower) ||
      /(?:give\s+me\s+directions\s+to\s+(?:that|the\s+closest|the\s+first|the\s+second|the\s+third)|show\s+me\s+directions\s+to\s+the\s+closest|directions\s+to\s+that\s+centre)/i.test(lower) ||
      /(?:can\s+you\s+show\s+those\s+locations\s+on\s+the\s+map|show\s+(?:those\s+|these\s+)?locations\s+on\s+map)/i.test(lower) ||
      /(?:which\s+(?:one\s+)?is\s+best\s+based\s+on\s+(?:the\s+)?available\s+information|which\s+is\s+the\s+best\s+option)/i.test(lower) ||
      Boolean(
        lastResearchResults?.providers &&
        Array.isArray(lastResearchResults.providers) &&
        lastResearchResults.providers.some((p) => p.businessName && lower.includes(p.businessName.toLowerCase()))
      );

    if (
      !isNewCategorySearch &&
      !isExplicitNewSearch &&
      (isLocalFollowUpPattern ||
        (hasPreviousLocalResults &&
          /(which|show|give|compare|tell me|details|directions|address|phone|contact|map)/i.test(lower)))
    ) {
      let instructionType = 'CLOSEST';
      if (/(second|2nd)\s+closest/i.test(lower)) instructionType = 'SECOND_CLOSEST';
      else if (/(third|3rd)\s+closest/i.test(lower)) instructionType = 'THIRD_CLOSEST';
      else if (/(closely\s*near|closest|nearest|closer\b|which.*near)/i.test(lower)) instructionType = 'CLOSEST';
      else if (/(highest\s*rating|best\s*rating|rating|reviews?)/i.test(lower)) instructionType = 'RATING';
      else if (/(cheapest|lowest\s*cost|pricing|fees?|affordable|cost)/i.test(lower)) instructionType = 'PRICE';
      else if (/(within\s+\d+|less\s+than\s+\d+|centres?\s+within)/i.test(lower)) instructionType = 'FILTER_DISTANCE';
      else if (/(compare|versus|vs\b|difference)/i.test(lower)) instructionType = 'COMPARE';
      else if (/(directions?|how\s+to\s+get|navigation|route)/i.test(lower)) instructionType = 'DIRECTIONS';
      else if (/(map|locations?)/i.test(lower)) instructionType = 'MAP_VIEW';
      else if (/(address)/i.test(lower)) instructionType = 'ORDINAL_ADDRESS';
      else if (/(phone|contact|number|call)/i.test(lower)) instructionType = 'ORDINAL_CONTACT';
      else if (/(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)/i.test(lower)) instructionType = 'ORDINAL_DETAILS';
      else if (/(best\s*based\s*on|best\s*option|which\s*is\s*best)/i.test(lower)) instructionType = 'BEST_AVAILABLE';

      return {
        isFollowUp: true,
        followUpType: 'LOCAL_RESEARCH_FOLLOW_UP',
        resolvedCategory: 'LOCATION_DISCOVERY',
        referencedArtifact: { places: lastResearchResults, researchResults: lastResearchResults },
        instructionType,
      };
    }

    // 6. Email Assistant Follow-ups (More professional, add date/venue, show final version)
    const isEmailFollowUp =
      activeCategory === 'COMMUNICATION' ||
      /(make it more professional|more professional|add the (date|venue|timing|agenda)|revise the email|show me the final version|final draft|change tone to)/i.test(lower);

    if (isEmailFollowUp) {
      return {
        isFollowUp: true,
        followUpType: 'EMAIL_REVISION',
        resolvedCategory: 'COMMUNICATION',
        referencedArtifact: { draft: lastDraft },
        instructionType: /(professional|tone)/i.test(lower) ? 'TONE_REVISION' : 'ADD_DETAILS',
      };
    }

    // 7. General Anaphoric Reference ("Explain this", "Make it shorter", "What about option B", "Continue")
    const isGeneralReference = /(explain (this|that)|make it (shorter|longer|clearer)|elaborate|continue|tell me more|details on (it|that)|why is that)/i.test(lower);
    if (isGeneralReference) {
      return {
        isFollowUp: true,
        followUpType: 'GENERAL_ELABORATION',
        resolvedCategory: activeCategory || 'GENERAL_QUESTION',
        referencedArtifact: null,
        instructionType: 'ELABORATION',
      };
    }

    return {
      isFollowUp: false,
      followUpType: 'NEW_INDEPENDENT_TASK',
      resolvedCategory: null,
      referencedArtifact: null,
      instructionType: 'NEW_TASK',
    };
  }

  /**
   * Helper: Extracts most recent value for a field from MongoDB messages
   */
  extractLatestFromMessages(messages, fieldName) {
    if (!Array.isArray(messages) || messages.length === 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg && msg[fieldName]) {
        return msg[fieldName];
      }
    }
    return null;
  }

  /**
   * Persists updated conversation state, rolling summary, and artifacts after turn completion
   */
  async updateConversationContext({
    conversationId,
    userId = null,
    userRequest = '',
    userMessage = '',
    category = null,
    chartConfig = null,
    calculation = null,
    documentAnalysis = null,
    documents = null,
    crossDocAnalysis = null,
    planningData = null,
    plan = null,
    draftData = null,
    draft = null,
    locationData = null,
    researchResults = null,
    missionId = null,
    taskDoc = null,
  }) {
    if (!conversationId) return;

    try {
      const query = { _id: conversationId };
      if (userId) query.userId = userId;
      const conversation = await Conversation.findOne(query);
      if (!conversation) return;

      const effectiveCategory = category || taskDoc?.category || null;
      const effectiveMissionId = missionId || taskDoc?.missionId || null;
      const effectivePlan = plan || planningData;
      const effectiveDraft = draft || draftData;
      const effectiveResearch = researchResults || locationData || taskDoc?.locationData || null;
      const effectiveRequest = userRequest || userMessage || '';

      if (effectiveCategory) conversation.activeCategory = effectiveCategory;
      if (effectiveMissionId) conversation.activeMissionId = effectiveMissionId;
      if (chartConfig) conversation.lastChartConfig = chartConfig;
      if (calculation) conversation.lastCalculation = calculation;
      if (documentAnalysis) {
        conversation.lastDocumentAnalysis = documentAnalysis;
      } else if (documents || taskDoc?.discoveredData?.documents) {
        conversation.lastDocumentAnalysis = {
          documents: documents || taskDoc.discoveredData.documents,
          crossDocAnalysis: crossDocAnalysis || taskDoc.discoveredData?.crossDocAnalysis || null,
        };
      }
      if (effectivePlan) conversation.lastPlan = effectivePlan;
      if (effectiveDraft) conversation.lastDraft = effectiveDraft;
      // Rich Local Service Research Persistence
      const lsData = taskDoc?.discoveredData?.localService || (researchResults?.providers ? researchResults : null);
      if (lsData && Array.isArray(lsData.providers) && lsData.providers.length > 0) {
        conversation.lastResearchResults = {
          conversationId: conversation._id.toString(),
          missionId: effectiveMissionId || taskDoc?.missionId || null,
          originalQuery: lsData.params?.userRequest || taskDoc?.userRequest || effectiveRequest,
          serviceCategory: lsData.params?.serviceCategory || 'Local Services',
          categoryTitle: lsData.params?.categoryTitle || 'Local Services',
          searchLocation: lsData.params?.targetLocation || 'Your Location',
          locationSource: lsData.params?.locationSource || 'device',
          searchRadius: lsData.params?.radiusKm || 15,
          center: lsData.params?.center || null,
          providers: lsData.providers,
          recommendation: lsData.recommendation || null,
          locationData: taskDoc?.locationData || locationData || lsData.locationData || null,
          searchCompletionStatus: lsData.searchState || 'RESULTS_FOUND',
          lastFocusedBusiness: lsData.lastFocusedBusiness || conversation.lastResearchResults?.lastFocusedBusiness || null,
          updatedAt: new Date(),
        };
      } else if (Array.isArray(researchResults) && researchResults.length > 0) {
        conversation.lastResearchResults = {
          conversationId: conversation._id.toString(),
          missionId: effectiveMissionId || null,
          originalQuery: effectiveRequest,
          serviceCategory: effectiveCategory || 'Local Services',
          categoryTitle: 'Local Services',
          searchLocation: 'Your Location',
          locationSource: 'device',
          searchRadius: 15,
          center: null,
          providers: researchResults,
          recommendation: null,
          locationData: locationData || taskDoc?.locationData || null,
          searchCompletionStatus: 'RESULTS_FOUND',
          lastFocusedBusiness: conversation.lastResearchResults?.lastFocusedBusiness || null,
          updatedAt: new Date(),
        };
      } else if (effectiveResearch && !conversation.lastResearchResults) {
        conversation.lastResearchResults = effectiveResearch;
      }

      // Update active artifacts list
      const artifacts = Array.isArray(conversation.activeArtifacts) ? [...conversation.activeArtifacts] : [];
      if (chartConfig) {
        artifacts.push({
          id: `chart-${Date.now()}`,
          type: 'CHART',
          title: chartConfig.title || 'Interactive Chart',
          data: chartConfig,
          createdAt: new Date(),
        });
      }
      if (effectivePlan) {
        artifacts.push({
          id: `plan-${Date.now()}`,
          type: 'EVENT_PLAN',
          title: 'Event & Hackathon Plan',
          data: effectivePlan,
          createdAt: new Date(),
        });
      }
      if (effectiveDraft) {
        artifacts.push({
          id: `draft-${Date.now()}`,
          type: 'EMAIL_DRAFT',
          title: 'Email Draft',
          data: effectiveDraft,
          createdAt: new Date(),
        });
      }
      conversation.activeArtifacts = artifacts.slice(-15); // Preserve last 15 artifacts
      conversation.lastMessageAt = new Date();

      // Maintain rolling summary for long conversations
      if (effectiveRequest) {
        const prevSummary = conversation.contextSummary || '';
        const summaryAddition = `User asked to: "${effectiveRequest.slice(0, 100)}". Completed category: ${effectiveCategory || 'general'}.`;
        conversation.contextSummary = prevSummary
          ? `${prevSummary}\n- ${summaryAddition}`.slice(-2000)
          : `- ${summaryAddition}`;
      }

      await conversation.save();
    } catch (err) {
      logger.warn(`[ContextEngine] Failed updating conversation context: ${err.message}`);
    }
  }
}

const conversationContextEngine = new ConversationContextEngine();
export { conversationContextEngine };
export default conversationContextEngine;
