import wikipediaService from '../services/wikipediaService.js';
import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Wikipedia Knowledge Agent
 * Searches, explains, and structures encyclopedic knowledge from Wikipedia.
 * Always identifies Wikipedia as the source and provides direct article links.
 */
class WikipediaAgent {
  constructor() {
    this.name = 'WikipediaAgent';
  }

  /**
   * Explain a concept or topic using Wikipedia as the authoritative source
   */
  async explainTopic(topic, { simple = false } = {}) {
    logger.info(`[WikipediaAgent] Retrieving encyclopedic knowledge for: "${topic}" (simpleMode: ${simple})`);
    const wikiData = await wikipediaService.lookupConcept(topic);

    if (!wikiData.found) {
      return {
        agent: this.name,
        status: 'not_found',
        topic,
        message: wikiData.message,
        source: 'Wikipedia (Public REST API)',
      };
    }

    const systemPrompt = `You are DOERA's Wikipedia Knowledge Agent.
Explain the topic using the retrieved Wikipedia summary and sections.
CRITICAL RULES:
1. Always attribute Wikipedia as the informational knowledge base.
2. ${simple ? 'Explain in simple, intuitive terms suitable for a beginner, avoiding overly dense jargon.' : 'Provide a clear, professional, structured conceptual overview.'}
3. Break your explanation into clear, intuitive paragraphs with bullet points for key components.
4. Include the direct Wikipedia URL for further reading.

Output clean JSON:
{
  "title": "${wikiData.title}",
  "overview": "Clear 2-3 sentence introductory explanation",
  "keyConcepts": [
    { "term": "Core concept or component name", "explanation": "What it is and how it works" }
  ],
  "realWorldApplications": [
    "Practical use case or application 1",
    "Practical use case or application 2"
  ],
  "sourceUrl": "${wikiData.url}",
  "attribution": "Information sourced from Wikipedia (The Free Encyclopedia)"
}`;

    const userPrompt = `Topic: "${topic}"
Wikipedia Title: ${wikiData.title}
Wikipedia Description: ${wikiData.description}
Wikipedia Extract: ${wikiData.summary}
Sections: ${wikiData.sections?.map((s) => s.title).join(', ')}`;

    try {
      const parsed = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.2,
      });

      return {
        agent: this.name,
        status: 'completed',
        topic,
        title: wikiData.title,
        explanation: parsed,
        rawSummary: wikiData.summary,
        url: wikiData.url,
        thumbnail: wikiData.thumbnail,
        sections: wikiData.sections,
        relatedArticles: wikiData.relatedArticles,
        source: 'Wikipedia (Public REST API)',
        retrievedAt: wikiData.retrievedAt,
      };
    } catch (err) {
      logger.warn(`[WikipediaAgent] LLM structuring notice: ${err.message}`);
      return {
        agent: this.name,
        status: 'completed',
        topic,
        title: wikiData.title,
        rawSummary: wikiData.summary,
        url: wikiData.url,
        thumbnail: wikiData.thumbnail,
        sections: wikiData.sections,
        source: 'Wikipedia (Public REST API)',
        retrievedAt: wikiData.retrievedAt,
      };
    }
  }
}

export const wikipediaAgent = new WikipediaAgent();
export default wikipediaAgent;
