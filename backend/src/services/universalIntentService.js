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
  TECHNICAL_ASSISTANCE: 'TECHNICAL_ASSISTANCE',
  DATA_ANALYSIS: 'DATA_ANALYSIS',
  TASK_AUTOMATION: 'TASK_AUTOMATION',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  MULTI_STEP_TASK: 'MULTI_STEP_TASK',
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
    const hasCsvAttachment = hasAttachments && attachments.some(a => 
      a.type === 'text/csv' || /\.(csv|tsv|xlsx?)$/i.test(a.name || '')
    );
    const hasImageAttachment = hasAttachments && attachments.some(a => 
      a.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(a.name || '')
    );

    const isDocAnalysis = hasAttachments || /(summarize|analyze|review|extract|read)\s+(this|the|my)?\s*(pdf|document|file|doc|report|invoice|paper)/i.test(lower);
    const isDataAnalysis = hasCsvAttachment || (/(analyze|trend|distribution|correlation|dataset|csv|metrics|statistics|table|data|chart)/i.test(lower) && (hasAttachments || /(dataset|dataframe|numbers|rows|columns)/i.test(lower)));
    const isTravel = /(plan a trip|travel to|itinerary|route from|trip to|driving to|visit.*for \d+ days|flight|road trip)/i.test(lower);
    const isOutreach = /(contact|inquir|send email|email them|whatsapp|reach out|get quote|quotation|call them|message them)/i.test(lower);
    const isBooking = /(book|appointment|slot|reserve|schedule)/i.test(lower);
    const isComparison = /(compare|difference between|vs\b|versus|pros and cons|best (among|of|option)|which is better)/i.test(lower);
    const isLocation = /(near|in |at |around|coimbatore|chennai|bangalore|mumbai|delhi|ooty|city|local|hospital|clinic|electrician|plumber|mechanic|restaurant|store|shop)/i.test(lower);
    const isGeneralKnowledge = /^(what is|who is|explain|how (does|do|can)|why is|tell me about|history of|define|give me an overview)/i.test(lower) && !isOutreach && !isBooking && !isLocation;
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
11. requiredAgents: Array of agents to activate from: ['Planner', 'Research', 'Location', 'Comparison', 'Communication', 'Execution', 'Verification', 'Document', 'DataAnalysis', 'FollowUp'].

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
        return this.normalizeIntent(parsed, text, hasAttachments, hasCsvAttachment);
      }
    } catch (err) {
      logger.warn(`[UniversalIntent] LLM classification notice, using deterministic classifier: ${err.message}`);
    }

    // 3. Robust Deterministic Fallback Classifier
    return this.deterministicClassify(text, {
      hasAttachments,
      hasCsvAttachment,
      hasImageAttachment,
      isDocAnalysis,
      isDataAnalysis,
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
      isBooking,
      isComparison,
      isLocation,
      isGeneralKnowledge,
      isTechnical,
    });
  }

  /**
   * Normalizes LLM intent output with safety bounds and deterministic verification
   */
  normalizeIntent(parsed, text, hasAttachments, hasCsvAttachment = false) {
    const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0
      ? parsed.categories
      : [parsed.primaryCategory || CATEGORIES.GENERAL_QUESTION];

    if (hasCsvAttachment && !categories.includes(CATEGORIES.DATA_ANALYSIS)) {
      categories.unshift(CATEGORIES.DATA_ANALYSIS);
    }

    const primaryCategory = hasCsvAttachment 
      ? CATEGORIES.DATA_ANALYSIS 
      : (parsed.primaryCategory || categories[0] || CATEGORIES.GENERAL_QUESTION);

    // Determine required agents dynamically
    const requiredAgents = new Set(parsed.requiredAgents || ['Planner']);
    requiredAgents.add('Planner');

    const isActionTask = parsed.isActionTask !== undefined
      ? Boolean(parsed.isActionTask)
      : primaryCategory !== CATEGORIES.GENERAL_QUESTION;

    if (isActionTask) {
      requiredAgents.add('Verification');
    }

    if (categories.includes(CATEGORIES.LOCATION_DISCOVERY) || categories.includes(CATEGORIES.TRAVEL_PLANNING)) {
      requiredAgents.add('Location');
      requiredAgents.add('Research');
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
    if (categories.includes(CATEGORIES.DOCUMENT_ANALYSIS) || hasAttachments) {
      requiredAgents.add('Document');
    }
    if (categories.includes(CATEGORIES.DATA_ANALYSIS) || hasCsvAttachment) {
      requiredAgents.add('DataAnalysis');
      requiredAgents.add('Document');
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

    if (flags.hasCsvAttachment || flags.isDataAnalysis) {
      categories.push(CATEGORIES.DATA_ANALYSIS);
      requiredAgents.add('DataAnalysis');
      requiredAgents.add('Document');
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
      requiredAgents.add('Location');
      requiredAgents.add('Research');
      requiredAgents.add('Verification');
    }

    if (flags.isComparison) {
      if (flags.isLocation) {
        categories.push(CATEGORIES.SERVICE_COMPARISON);
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
