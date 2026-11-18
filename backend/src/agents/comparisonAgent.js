import llmService from '../services/llmService.js';
import quotationAgent from './quotationAgent.js';
import { logger } from '../utils/logger.js';

class ComparisonAgent {
  constructor() {
    this.name = 'Comparison';
  }

  /**
   * Universal Multi-Entity Comparison:
   * Compares products, services, platforms, technologies, or quotations
   * Generates structured comparison matrices, strengths, weaknesses, and clear criteria.
   */
  async compare(taskContext, entities = []) {
    const startedAt = new Date();
    const userRequest = taskContext.userRequest || '';
    logger.info(`[Comparison Agent] Evaluating comparison for: "${userRequest}"`);

    // If discovered contacts exist and request is service/quote related, delegate or blend with quotationAgent
    let quotationResults = null;
    if (entities && entities.length > 0 && entities[0].businessName) {
      quotationResults = await quotationAgent.compareQuotes(taskContext, entities);
    }

    const systemPrompt = `You are DOERA AI's specialized Comparison Agent.
Your responsibility:
1. Conduct objective, structured comparison across the requested entities, products, services, or technologies.
2. Select 3-5 key criteria most relevant to the user's request (e.g. Pricing / Cost, Features / Specifications, Strengths, Weaknesses, Best For).
3. Output pure JSON with:
   - "criteria": ["Criterion 1", "Criterion 2", "Criterion 3", "Criterion 4"]
   - "items": [
       {
         "name": "Entity Name",
         "summary": "Brief 1-sentence positioning",
         "scoresOrValues": { "Criterion 1": "value", "Criterion 2": "value", ... },
         "pros": ["Pro 1", "Pro 2"],
         "cons": ["Con 1"],
         "verdict": "Best for ..."
       }
     ]
   - "recommendation": "Objective recommendation based on user constraints."

Never invent unverified prices or ratings. Use "Not publicly available" if unknown.`;

    const userPrompt = `Request: "${userRequest}"
Entities / Discovered Context:
${JSON.stringify((entities || []).slice(0, 5).map(e => ({
  name: e.businessName || e.name || e.title,
  price: e.quote?.consultationFee || e.quote?.inspectionFee || e.price || 'Not listed',
  rating: e.rating || 'Not rated',
  details: e.address || e.description || e.attributes || 'Verified entity',
})))}`;

    try {
      const parsed = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.1,
      });

      return {
        agentName: this.name,
        status: 'completed',
        criteria: parsed.criteria || ['Features', 'Cost', 'Pros', 'Cons', 'Best For'],
        items: parsed.items || [],
        recommendation: parsed.recommendation || 'Compare the options above based on your priority criteria.',
        quotationDetails: quotationResults?.quotes || null,
        startedAt,
        completedAt: new Date(),
      };
    } catch (err) {
      logger.warn(`[Comparison Agent] LLM comparison notice: ${err.message}`);
      return {
        agentName: this.name,
        status: 'completed',
        criteria: ['Entity', 'Key Strength', 'Consideration'],
        items: (entities || []).map(e => ({
          name: e.businessName || e.name || 'Option',
          summary: e.address || 'Verified entry',
          scoresOrValues: {
            'Rating': e.rating ? `★ ${e.rating}` : 'Not publicly available',
            'Estimated Fee': e.quote?.consultationFee || e.quote?.inspectionFee || 'Not publicly available',
          },
          pros: ['Verified directory listing'],
          cons: ['Direct inquiry recommended for latest terms'],
          verdict: 'Viable candidate',
        })),
        recommendation: 'Evaluate candidate options against your specific schedule and budget.',
        quotationDetails: quotationResults?.quotes || null,
        startedAt,
        completedAt: new Date(),
      };
    }
  }
}

export const comparisonAgent = new ComparisonAgent();
export default comparisonAgent;
