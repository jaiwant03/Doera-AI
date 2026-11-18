import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

class IntentUnderstandingAgent {
  async analyze(userRequest) {
    const systemPrompt = `You are the DOERA Intent Understanding Agent. Analyze the user request and extract structured intent, domain category, required parameters, entities, and whether external real-world action or human authorization is required. Output pure JSON only.`;

    const userPrompt = `Request: "${userRequest}"

JSON format:
{
  "category": "LOCAL_SERVICE | COMMUNICATION | SCHEDULING | RESEARCH | GENERAL_EXECUTION",
  "intent": "Brief verb-noun intent phrase",
  "entities": {
    "serviceType": "e.g. Electrician / Plumber / Doctor / Cleaner",
    "location": "e.g. Chennai, Adyar",
    "recipient": "Email, phone or name if specified",
    "date": "Specified date/time or null"
  },
  "toolsRequired": ["DISCOVERY", "COMMUNICATION", "QUOTATION", "SCHEDULING", "VERIFICATION"],
  "requiresHumanApproval": true
}`;

    try {
      const parsed = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.1,
      });
      return parsed;
    } catch (err) {
      logger.warn(`[Intent Agent] LLM parsing failed, using deterministic heuristics: ${err.message}`);
      const lower = userRequest.toLowerCase();
      let category = 'GENERAL_EXECUTION';
      let serviceType = 'Service Provider';
      if (lower.includes('electrician')) {
        category = 'LOCAL_SERVICE';
        serviceType = 'Electrician';
      } else if (lower.includes('plumber')) {
        category = 'LOCAL_SERVICE';
        serviceType = 'Plumber';
      } else if (lower.includes('doctor') || lower.includes('clinic')) {
        category = 'LOCAL_SERVICE';
        serviceType = 'Doctor';
      } else if (lower.includes('email') || lower.includes('message') || lower.includes('send')) {
        category = 'COMMUNICATION';
      } else if (lower.includes('research') || lower.includes('find out') || lower.includes('analyze')) {
        category = 'RESEARCH';
      }

      return {
        category,
        intent: 'Execute autonomous task',
        entities: { serviceType, location: 'Current User City' },
        toolsRequired: ['DISCOVERY', 'COMMUNICATION', 'SCHEDULING', 'VERIFICATION'],
        requiresHumanApproval: true,
      };
    }
  }
}

export const intentUnderstandingAgent = new IntentUnderstandingAgent();
export default intentUnderstandingAgent;
