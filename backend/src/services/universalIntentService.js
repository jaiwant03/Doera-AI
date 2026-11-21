import llmService from './llmService.js';
import { logger } from '../utils/logger.js';

export const CATEGORIES = {
  RESEARCH: 'RESEARCH',
  LOCATION_DISCOVERY: 'LOCATION_DISCOVERY',
  PRODUCT_COMPARISON: 'PRODUCT_COMPARISON',
  SERVICE_COMPARISON: 'SERVICE_COMPARISON',
  TRAVEL_PLANNING: 'TRAVEL_PLANNING',
  APPOINTMENT_COORDINATION: 'APPOINTMENT_COORDINATION',
  COMMUNICATION: 'COMMUNICATION',
  DOCUMENT_ANALYSIS: 'DOCUMENT_ANALYSIS',
  IMAGE_ANALYSIS: 'IMAGE_ANALYSIS',
  TECHNICAL_ASSISTANCE: 'TECHNICAL_ASSISTANCE',
  DATA_ANALYSIS: 'DATA_ANALYSIS',
  TASK_AUTOMATION: 'TASK_AUTOMATION',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  MULTI_STEP_TASK: 'MULTI_STEP_TASK',
  MISSION_PLANNING: 'MISSION_PLANNING',
};

class UniversalIntentService {
  /**
   * Universal Request Understanding:
   * Dynamically analyzes user request, extracts entities, detects categories,
   * identifies required agents, constraints, comparisons, and missing information.
   */
  async understandRequest(userRequest, attachments = [], memoryContext = '', historyContext = '') {
    const text = (userRequest || '').trim();
    const lower = text.toLowerCase();

    // 1. Rule-based heuristic signal detection
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    const hasSpreadsheetAttachment = hasAttachments && attachments.some(a => 
      a.type === 'text/csv' || 
      a.type === 'text/tab-separated-values' ||
      a.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      a.type === 'application/vnd.ms-excel' ||
      /\.(csv|tsv|xlsx|xls)$/i.test(a.name || '')
    );
    const hasImageAttachment = hasAttachments && attachments.some(a => 
      a.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name || '')
    );

    const isStatisticalCalculation = /\b(range|interquartile|interquartile\s*range|iqr|covariance|mean|median|mode|variance|variation|standard\s*deviation|std\s*dev|stdev|coefficient\s*of\s*variation|\bcv\b|skewness|kurtosis|quartiles?|percentiles?|z-score|sum|total|correlation)\b/i.test(lower);

    const isDocAnalysis = (hasAttachments && !hasSpreadsheetAttachment) ||
      /(summarize|analyze|review|extract|read|explain|examine)\s+(this|the|my)?\s*(pdf|document|file|doc|docx|ppt|pptx|presentation|slides?|deck|report|invoice|paper|proposal|architecture)/i.test(lower) ||
      /(examine\s+system\s+architecture|system\s+architecture|identify\s+weaknesses|recommend\s+improvements|technical\s+requirements\s+mentioned|extract\s+all\s+important\s+dates|explain\s+slide\s*\d+|project\s+proposal\s+ppt)/i.test(lower);

    const isDataAnalysis = hasSpreadsheetAttachment || (!isDocAnalysis && isStatisticalCalculation) || (
      !isDocAnalysis &&
      /(analyze|analysis|trend|distribution|correlation|dataset|csv|excel|spreadsheet|sheet|metrics|statistics|table|data|chart|expenses?|spending|sales|revenue|profit|cost|price|transactions?|columns?|rows?|top\s*\d+|lowest|highest|average|mean|median|mode|variance|variation|standard\s*deviation|std\s*dev|stdev|coefficient\s*of\s*variation|\bcv\b|skewness|kurtosis|quartiles?|iqr|interquartile|covariance|range|sum|total|rank|growth|outliers?|anomalies|spread|middle\s*value|most\s*frequent|how\s*much\s*variation)/i.test(lower) &&
      (hasSpreadsheetAttachment || /(dataset|dataframe|spreadsheet|numbers|rows|columns|expenses?|sales|table|chart|amount|day|year|month|values|records)/i.test(lower) || Boolean(historyContext))
    );
    const isMissionPlanning = /(organize|plan|host|conduct|manage|execution\s*plan|complete\s*plan)\s+(?:a|an)?\s*(?:two-day|2-day|\d+-day)?\s*(?:[a-z0-9_-]+\s+){0,3}(?:hackathon|event|symposium|conference|workshop|fest|competition|championship)/i.test(lower) ||
      ((/hackathon|symposium|conference|fest/i.test(lower) || /organize/i.test(lower)) && /budget|participants|schedule|plan/i.test(lower));
    const isTravel = /(plan a trip|travel to|itinerary|route from|trip to|driving to|visit.*for \d+ days|flight|road trip)/i.test(lower) && !isMissionPlanning;
    const isOutreach = /(contact|inquir|send email|email them|whatsapp|reach out|get quote|quotation|call them|message them)/i.test(lower) && !isMissionPlanning && !isStatisticalCalculation;
    const isBooking = /(book|appointment|slot|reserve|schedule)/i.test(lower) && !isMissionPlanning && !isStatisticalCalculation;
    const isComparison = /(compare|difference between|vs\b|versus|pros and cons|best (among|of|option)|which is better)/i.test(lower);
    const isLocation = /(?:(?:near|around)\s+(?:me|here|[a-z]+)|(?:in|at|near)\s+(?:coimbatore|chennai|bangalore|bengaluru|mumbai|delhi|hyderabad|kolkata|pune|ooty|tirupur|salem|madurai|calicut|kochi)|local\s+(?:businesses?|services?|shops?|stores?)|hospital|clinic|electrician|plumber|mechanic|restaurant|repair|printing\s+shop)/i.test(lower) &&
      !/at\s+(?:sea\s+level|home|work|all|first|last|least|once|random|present|night|noon)/i.test(lower);
    const isGeneralKnowledge = /^(what is|who is|explain|how (does|do|can)|why is|tell me about|history of|define|give me an overview)/i.test(lower) && !isOutreach && !isBooking;
    const isTechnical = /(code|script|function|debug|algorithm|architecture|transformer|api|database|sql|python|javascript|react|node|docker|kubernetes)/i.test(lower) && !isOutreach && !isBooking;
    const isFollowUp = /(second|first|third|previous|that|those|the other|again|same|furthermore|elaborate|details on|tell me more about (it|them))/i.test(lower);

    // 2. Structured LLM prompt for rich semantic understanding
    const systemPrompt = `You are DOERA AI's Universal Intent Understanding Engine.
Analyze the user request and classify it precisely into one or more categories:
- RESEARCH: Factual topic research, background investigation, market or academic topics.
- LOCATION_DISCOVERY: Finding local businesses, places, clinics, service providers.
- PRODUCT_COMPARISON: Comparing physical/digital products, software, hardware, pricing, specs.
- SERVICE_COMPARISON: Comparing professional services, contractors, agencies, or rates.
- TRAVEL_PLANNING: Multi-day itineraries, routes, travel destinations, transit.
- APPOINTMENT_COORDINATION: Coordinating dates, time slots, scheduling with providers.
- COMMUNICATION: Drafting, authorizing, or dispatching external emails or messages.
- DOCUMENT_ANALYSIS: Analyzing uploaded documents, extracting text, summarizing files.
- IMAGE_ANALYSIS: Visual understanding of uploaded images, screenshots, website UIs, diagrams, flowcharts, charts, photographs, and image OCR text.
- TECHNICAL_ASSISTANCE: Technical explanations, code solutions, debugging, architectural advice.
- DATA_ANALYSIS: Analyzing datasets, statistics, distributions, trends, CSV data.
- TASK_AUTOMATION: Creating multi-step automated workflows or project development plans.
- GENERAL_QUESTION: Pure informational/conceptual questions without external operations.
- MULTI_STEP_TASK: Combining multiple domains (e.g. discover + compare + outreach + schedule).

Determine:
1. primaryObjective: Concise summary of what the user wants.
2. categories: Array of matched categories.
3. primaryCategory: Dominant category.
4. isActionTask: True if it requires multi-agent coordination, external tools, discovery or tasks. False if it is a general knowledge question or purely conversational technical explanation.
5. location: Mentioned city/neighborhood or null.
6. constraints: Extracted user constraints (budget, timing, rating, criteria).
7. requestedComparisons: Array of entities to compare if any.
8. requestedExternalActions: Array of external operations (e.g. ['SEND_EMAIL', 'BOOK_APPOINTMENT']) if requested.
9. missingInformation: Array of missing essential details if any.
10. clarificationNeeded: Set this ONLY if the user request is fundamentally ambiguous or incomplete such that NO initial research, discovery, or explanation can even begin (e.g. user says only "book it" or "find options" with zero context, subject, or location). If the user provided a topic, service, location, or question (e.g. "Find electricians in Coimbatore" or "Compare three cloud platforms" or "Explain how transformers work"), DO NOT ask clarification upfront—proceed with execution and set clarificationNeeded to null.
11. requiredAgents: Array of agents to activate from: ['Planner', 'Research', 'Location', 'Comparison', 'Communication', 'Execution', 'Verification', 'Document', 'DataAnalysis', 'Vision', 'FollowUp'].

JSON format ONLY.`;

    const userPrompt = `User Request: "${text}"
Has Attachments: ${hasAttachments}
Attachments: ${JSON.stringify(attachments.map(a => ({ name: a.name, type: a.type, size: a.size })))}
Recent History: ${historyContext ? historyContext.slice(-600) : 'None'}
User Personalized Context: ${memoryContext || 'None'}`;

    try {
      const parsed = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.1,
      });

      if (parsed && parsed.primaryCategory) {
        return this.normalizeIntent(parsed, text, hasAttachments, hasSpreadsheetAttachment, hasImageAttachment);
      }
    } catch (err) {
      logger.warn(`[UniversalIntent] LLM classification notice, using deterministic classifier: ${err.message}`);
    }

    // 3. Robust Deterministic Fallback Classifier
    return this.deterministicClassify(text, {
      hasAttachments,
      hasSpreadsheetAttachment,
      hasImageAttachment,
      isDocAnalysis,
      isDataAnalysis,
      isMissionPlanning,
      isTravel,
      isOutreach,
      isBooking,
      isComparison,
      isLocation,
      isGeneralKnowledge,
      isTechnical,
      isFollowUp,
    });
  }

  /**
   * Normalizes LLM intent output with safety bounds and deterministic verification
   */
  normalizeIntent(parsed, text, hasAttachments, hasSpreadsheetAttachment = false, hasImageAttachment = false) {
    const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0
      ? parsed.categories
      : [parsed.primaryCategory || CATEGORIES.GENERAL_QUESTION];

    if (hasImageAttachment && !categories.includes(CATEGORIES.IMAGE_ANALYSIS)) {
      categories.unshift(CATEGORIES.IMAGE_ANALYSIS);
    }
    if (hasSpreadsheetAttachment && !categories.includes(CATEGORIES.DATA_ANALYSIS)) {
      categories.unshift(CATEGORIES.DATA_ANALYSIS);
    }

    const primaryCategory = hasImageAttachment
      ? CATEGORIES.IMAGE_ANALYSIS
      : (hasSpreadsheetAttachment 
          ? CATEGORIES.DATA_ANALYSIS 
          : (parsed.primaryCategory || categories[0] || CATEGORIES.GENERAL_QUESTION));

    // Determine required agents dynamically
    const requiredAgents = new Set(parsed.requiredAgents || ['Planner']);
    requiredAgents.add('Planner');

    const isActionTask = (categories.includes(CATEGORIES.PRODUCT_COMPARISON) || categories.includes(CATEGORIES.SERVICE_COMPARISON) || categories.includes(CATEGORIES.IMAGE_ANALYSIS) || categories.includes(CATEGORIES.DATA_ANALYSIS))
      ? true
      : (parsed.isActionTask !== undefined
          ? Boolean(parsed.isActionTask)
          : primaryCategory !== CATEGORIES.GENERAL_QUESTION);

    if (isActionTask) {
      requiredAgents.add('Verification');
    }

    if (categories.includes(CATEGORIES.IMAGE_ANALYSIS) || hasImageAttachment) {
      requiredAgents.add('Vision');
    }
    if (categories.includes(CATEGORIES.LOCATION_DISCOVERY) || categories.includes(CATEGORIES.TRAVEL_PLANNING)) {
      requiredAgents.add('Location');
      requiredAgents.add('Research');
      if (categories.includes(CATEGORIES.LOCATION_DISCOVERY)) {
        requiredAgents.add('LocalService');
        requiredAgents.add('Comparison');
        // Strictly enforce research-only policy for local discovery & service research
        const lowerText = text.toLowerCase();
        const hasExplicitOutreach = /send\s+email|contact\s+them\s+directly|reach\s+out\s+via/i.test(lowerText);
        const hasExplicitBooking = /book\s+an?\s+appointment|reserve\s+slot/i.test(lowerText);
        if (!hasExplicitOutreach && !hasExplicitBooking) {
          requiredAgents.delete('Communication');
          requiredAgents.delete('Execution');
          requiredAgents.delete('Scheduling');
          requiredAgents.delete('FollowUp');
          parsed.requestedExternalActions = [];
        }
      }
    }
    if (categories.includes(CATEGORIES.PRODUCT_COMPARISON) || categories.includes(CATEGORIES.SERVICE_COMPARISON)) {
      requiredAgents.add('Comparison');
      requiredAgents.add('Research');
    }
    if (categories.includes(CATEGORIES.COMMUNICATION) || categories.includes(CATEGORIES.APPOINTMENT_COORDINATION)) {
      requiredAgents.add('Communication');
      requiredAgents.add('Execution');
      requiredAgents.add('FollowUp');
    }
    if ((categories.includes(CATEGORIES.DOCUMENT_ANALYSIS) || hasAttachments) && !hasImageAttachment && !hasSpreadsheetAttachment) {
      requiredAgents.add('Document');
    }
    if (categories.includes(CATEGORIES.DATA_ANALYSIS) || hasSpreadsheetAttachment) {
      requiredAgents.add('DataAnalysis');
      requiredAgents.delete('Document');
      // Strictly enforce pure data analytics workflow unless user explicitly asks for external outreach or booking
      const lowerText = text.toLowerCase();
      const hasExplicitOutreach = /send\s+email|email\s+this|dispatch\s+to|reach\s+out/i.test(lowerText);
      const hasExplicitBooking = /book\s+an?\s+appointment|reserve\s+slot/i.test(lowerText);
      if (!hasExplicitOutreach && !hasExplicitBooking) {
        requiredAgents.delete('Planner');
        requiredAgents.delete('Planning');
        requiredAgents.delete('Communication');
        requiredAgents.delete('Execution');
        requiredAgents.delete('Scheduling');
        requiredAgents.delete('FollowUp');
        requiredAgents.delete('LocalService');
        requiredAgents.delete('Location');
        requiredAgents.delete('Discovery');
        requiredAgents.delete('Quotation');
        parsed.requestedExternalActions = [];
      }
    }
    if (categories.includes(CATEGORIES.MISSION_PLANNING) || /(organize|plan|host|conduct|execution\s*plan|complete\s*plan).*(hackathon|event|symposium|conference)/i.test(text)) {
      requiredAgents.add('Research');
      requiredAgents.add('Planning');
      requiredAgents.add('Budget');
      requiredAgents.add('Communication');
      requiredAgents.add('Verification');
    }

    return {
      primaryObjective: parsed.primaryObjective || text,
      categories,
      primaryCategory,
      isActionTask,
      location: parsed.location || this.extractLocation(text),
      constraints: parsed.constraints || [],
      requestedComparisons: parsed.requestedComparisons || [],
      requestedExternalActions: parsed.requestedExternalActions || [],
      requiresHumanApproval: (parsed.requestedExternalActions || []).length > 0 || categories.includes(CATEGORIES.COMMUNICATION) || categories.includes(CATEGORIES.APPOINTMENT_COORDINATION),
      expectedOutput: parsed.expectedOutput || 'STRUCTURED_RESPONSE',
      missingInformation: parsed.missingInformation || [],
      clarificationNeeded: parsed.clarificationNeeded || null,
      requiredAgents: Array.from(requiredAgents),
    };
  }

  /**
   * Deterministic category and intent extraction
   */
  deterministicClassify(text, flags) {
    const categories = [];
    const requiredAgents = new Set(['Planner']);

    if (flags.isGeneralKnowledge && !flags.isMissionPlanning && !flags.hasAttachments && !flags.hasImageAttachment && !flags.hasSpreadsheetAttachment && !flags.isDataAnalysis && !flags.isDocAnalysis && !flags.isOutreach && !flags.isBooking) {
      categories.push(CATEGORIES.GENERAL_QUESTION);
      // General question does not need specialized external action agents
      return {
        primaryObjective: text,
        categories,
        primaryCategory: CATEGORIES.GENERAL_QUESTION,
        isActionTask: false,
        location: null,
        constraints: [],
        requestedComparisons: [],
        requestedExternalActions: [],
        requiresHumanApproval: false,
        expectedOutput: 'STRUCTURED_RESPONSE',
        missingInformation: [],
        clarificationNeeded: null,
        requiredAgents: [],
      };
    }

    if (flags.isMissionPlanning) {
      categories.push(CATEGORIES.MISSION_PLANNING);
      requiredAgents.add('Research');
      requiredAgents.add('Planning');
      requiredAgents.add('Budget');
      requiredAgents.add('Communication');
      requiredAgents.add('Verification');
    } else if (flags.hasImageAttachment) {
      categories.push(CATEGORIES.IMAGE_ANALYSIS);
      requiredAgents.add('Vision');
      requiredAgents.add('Verification');
    } else if (flags.hasSpreadsheetAttachment || flags.isDataAnalysis) {
      categories.push(CATEGORIES.DATA_ANALYSIS);
      requiredAgents.delete('Planner');
      requiredAgents.add('DataAnalysis');
      requiredAgents.add('Verification');
    } else if (flags.hasAttachments || flags.isDocAnalysis) {
      categories.push(CATEGORIES.DOCUMENT_ANALYSIS);
      requiredAgents.add('Document');
      requiredAgents.add('Verification');
    }

    if (flags.isTravel) {
      categories.push(CATEGORIES.TRAVEL_PLANNING);
      requiredAgents.add('Location');
      requiredAgents.add('Research');
      requiredAgents.add('Verification');
    } else if (flags.isLocation) {
      categories.push(CATEGORIES.LOCATION_DISCOVERY);
      requiredAgents.add('LocalService');
      requiredAgents.add('Location');
      requiredAgents.add('Comparison');
      requiredAgents.add('Research');
      requiredAgents.add('Verification');
    }

    if (flags.isComparison) {
      if (flags.isLocation) {
        categories.push(CATEGORIES.SERVICE_COMPARISON);
        requiredAgents.add('LocalService');
      } else {
        categories.push(CATEGORIES.PRODUCT_COMPARISON);
      }
      requiredAgents.add('Comparison');
      requiredAgents.add('Research');
      requiredAgents.add('Verification');
    }

    if (flags.isBooking) {
      categories.push(CATEGORIES.APPOINTMENT_COORDINATION);
      requiredAgents.add('Communication');
      requiredAgents.add('Execution');
      requiredAgents.add('FollowUp');
      requiredAgents.add('Verification');
    }

    if (flags.isOutreach) {
      categories.push(CATEGORIES.COMMUNICATION);
      requiredAgents.add('Communication');
      requiredAgents.add('Execution');
      requiredAgents.add('FollowUp');
      requiredAgents.add('Verification');
    }

    if (categories.length > 1) {
      categories.unshift(CATEGORIES.MULTI_STEP_TASK);
    }

    if (categories.length === 0) {
      if (flags.isTechnical) {
        categories.push(CATEGORIES.TECHNICAL_ASSISTANCE);
      } else {
        categories.push(CATEGORIES.GENERAL_QUESTION);
      }
    }

    const primaryCategory = categories[0];
    const isActionTask = primaryCategory !== CATEGORIES.GENERAL_QUESTION &&
      !(primaryCategory === CATEGORIES.TECHNICAL_ASSISTANCE && !flags.isOutreach && !flags.isBooking && !flags.isLocation);

    return {
      primaryObjective: text,
      categories,
      primaryCategory,
      isActionTask,
      location: this.extractLocation(text),
      constraints: [],
      requestedComparisons: flags.isComparison ? ['Discovered Options'] : [],
      requestedExternalActions: flags.isOutreach ? ['SEND_OUTREACH'] : (flags.isBooking ? ['BOOK_APPOINTMENT'] : []),
      requiresHumanApproval: flags.isOutreach || flags.isBooking,
      expectedOutput: flags.isComparison ? 'COMPARISON_TABLE' : (flags.isTravel ? 'TRAVEL_ITINERARY' : 'STRUCTURED_RESPONSE'),
      missingInformation: [],
      clarificationNeeded: null,
      requiredAgents: Array.from(requiredAgents),
    };
  }

  extractLocation(text) {
    const match = text.match(/\b(in|near|at|around|from|to)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
    if (match) return match[2].trim();

    const commonCities = ['chennai', 'coimbatore', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'ooty', 'madurai', 'kochi'];
    const lower = text.toLowerCase();
    for (const city of commonCities) {
      if (lower.includes(city)) {
        return city.charAt(0).toUpperCase() + city.slice(1);
      }
    }
    return null;
  }
}

export const universalIntentService = new UniversalIntentService();
export default universalIntentService;
