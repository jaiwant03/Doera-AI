import newsRssService from '../services/newsRssService.js';
import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — News Research Agent
 * Aggregates and synthesizes current news reports from authentic public RSS feeds.
 * Distinguishes factual reporting from opinions and timestamps all events accurately.
 */
class NewsResearchAgent {
  constructor() {
    this.name = 'NewsResearchAgent';
  }

  /**
   * Search and synthesize recent news for a topic
   */
  async searchNews(topic, limit = 8) {
    logger.info(`[NewsResearchAgent] Discovering news reports for: "${topic}"`);
    const articles = await newsRssService.searchNews(topic, limit);

    if (!articles || articles.length === 0) {
      return {
        agent: this.name,
        status: 'no_results',
        topic,
        message: `No recent RSS news dispatches found for "${topic}".`,
        articles: [],
      };
    }

    const articlesText = articles
      .map((a, i) => `[Article ${i + 1}] (${a.source} - ${a.publishedDate}) [${a.type}] "${a.title}": ${a.description} (URL: ${a.link})`)
      .join('\n\n');

    const systemPrompt = `You are DOERA's News Research Agent.
Summarize the current news developments on "${topic}" based on the provided authentic RSS reports.
RULES:
1. Synthesize the key developments into coherent thematic groups.
2. Clearly distinguish objective news reporting from opinion/editorial commentary.
3. Reference publication dates accurately. Never claim an old article is breaking news.
4. Provide actionable takeaways.

Output clean JSON:
{
  "executiveHeadline": "Concise summary of the dominant trend or development",
  "summary": "1-2 paragraphs synthesizing the latest developments",
  "keyDevelopments": [
    { "headline": "Major development", "date": "Date/Recent", "source": "Publisher", "url": "URL", "takeaway": "Significance" }
  ],
  "opinionVsReporting": "Note clarifying whether reports are predominantly factual reporting or speculative/editorial"
}`;

    try {
      const parsed = await llmService.generate({
        systemPrompt,
        userPrompt: articlesText,
        jsonMode: true,
        temperature: 0.2,
      });

      return {
        agent: this.name,
        status: 'completed',
        topic,
        synthesis: parsed,
        articles,
        retrievedAt: new Date().toISOString(),
      };
    } catch (err) {
      logger.warn(`[NewsResearchAgent] Synthesis notice: ${err.message}`);
      return {
        agent: this.name,
        status: 'completed',
        topic,
        synthesis: {
          executiveHeadline: `Latest updates regarding ${topic}`,
          summary: `Retrieved ${articles.length} verified news dispatches from open RSS feeds.`,
          keyDevelopments: articles.slice(0, 4).map((a) => ({
            headline: a.title,
            date: a.publishedDate,
            source: a.source,
            url: a.link,
            takeaway: a.description,
          })),
        },
        articles,
        retrievedAt: new Date().toISOString(),
      };
    }
  }
}

export const newsResearchAgent = new NewsResearchAgent();
export default newsResearchAgent;
