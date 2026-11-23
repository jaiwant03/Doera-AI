import academicPaperAgent from './academicPaperAgent.js';
import wikipediaAgent from './wikipediaAgent.js';
import newsResearchAgent from './newsResearchAgent.js';
import factVerificationAgent from './factVerificationAgent.js';
import citationAgent from './citationAgent.js';
import reportGenerationAgent from './reportGenerationAgent.js';
import researchService from '../services/researchService.js';
import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Central Multi-Agent Research Coordinator
 * Dynamically selects, orchestrates, and exchanges data across specialized intelligence agents.
 * Maintains conversation-level research memory for seamless multi-turn follow-ups.
 */
class ResearchCoordinatorAgent {
  constructor() {
    this.name = 'ResearchCoordinator';
    // User-isolated conversation memory for multi-turn research
    this.sessionContexts = new Map();
  }

  _getSessionKey(userId, conversationId) {
    return `${userId || 'anon'}_${conversationId || 'default'}`;
  }

  getContext(userId, conversationId) {
    return this.sessionContexts.get(this._getSessionKey(userId, conversationId)) || null;
  }

  setContext(userId, conversationId, data) {
    const key = this._getSessionKey(userId, conversationId);
    const existing = this.sessionContexts.get(key) || {};
    this.sessionContexts.set(key, { ...existing, ...data, updatedAt: Date.now() });
  }

  /**
   * Determine required agents based on prompt and conversation context
   */
  classifyMissionIntent(userPrompt, priorContext = null) {
    const p = userPrompt.toLowerCase();

    // 1. Check for follow-up patterns if prior context exists
    if (priorContext?.papers && priorContext.papers.length > 0) {
      if (/which one|most relevant|compare these|best suited/i.test(p)) {
        return { type: 'FOLLOW_UP_COMPARE', isFollowUp: true };
      }
      if (/summarize the (first|second|third|fourth|fifth|\d+(?:st|nd|rd|th)?|last) paper/i.test(p)) {
        const numMatch = p.match(/(first|second|third|fourth|fifth|last|\d+)/i);
        return { type: 'FOLLOW_UP_SUMMARIZE', indexKey: numMatch ? numMatch[1] : 'first', isFollowUp: true };
      }
      if (/generate (ieee|apa|mla|chicago)?\s*references|citation/i.test(p)) {
        const styleMatch = p.match(/(ieee|apa|mla|chicago)/i);
        return { type: 'FOLLOW_UP_CITATIONS', style: styleMatch ? styleMatch[1].toUpperCase() : 'IEEE', isFollowUp: true };
      }
    }

    // 2. Fact Verification
    if (/verify this|check whether|is it true that|fact[- ]check|verify claim|evidence supporting/i.test(p)) {
      return { type: 'FACT_VERIFICATION', agents: ['FactVerificationAgent'] };
    }

    // 3. News Discovery
    if (/recent news|latest news|news about|breaking news|developments in.*news/i.test(p) || /news on/i.test(p)) {
      return { type: 'NEWS_DISCOVERY', agents: ['NewsResearchAgent'] };
    }

    // 4. Pure Wikipedia / Conceptual Overview
    if (/what is|explain|who was|overview of|define /i.test(p) && !/papers|academic|research studies|doi|ieee/i.test(p)) {
      const isSimple = /simple terms|for beginners|explain like i'm/i.test(p);
      return { type: 'WIKIPEDIA_KNOWLEDGE', agents: ['WikipediaAgent'], simple: isSimple };
    }

    // 5. Academic Paper Discovery / Literature Review
    const hasPaperKeywords = /paper|papers|arxiv|crossref|openalex|literature review|research gap|academic/i.test(p);
    const hasCitationKeywords = /citation|reference|ieee|apa|mla|chicago/i.test(p);
    const hasReportKeywords = /report|literature review|gap analysis|comparison/i.test(p);

    if (hasPaperKeywords && (hasCitationKeywords || hasReportKeywords)) {
      // Comprehensive Multi-Agent Orchestration
      const styleMatch = p.match(/(ieee|apa|mla|chicago)/i);
      return {
        type: 'COMPREHENSIVE_RESEARCH',
        agents: [
          'AcademicPaperAgent',
          'CitationAgent',
          'ReportGenerationAgent',
        ],
        citationStyle: styleMatch ? styleMatch[1].toUpperCase() : 'IEEE',
      };
    }

    if (hasPaperKeywords) {
      return {
        type: 'ACADEMIC_PAPERS',
        agents: ['AcademicPaperAgent', 'CitationAgent'],
        limit: 5,
      };
    }

    // Default to Web Research with encyclopedic fallback
    return {
      type: 'GENERAL_RESEARCH',
      agents: ['WikipediaAgent', 'AcademicPaperAgent'],
    };
  }

  /**
   * Execute dynamic multi-agent coordination
   */
  async coordinateMission({ userPrompt, userId, conversationId, overrideType = null }) {
    const startedAt = new Date();
    logger.info(`[ResearchCoordinator] Coordinating mission for: "${userPrompt}"`);

    const priorContext = this.getContext(userId, conversationId);
    const intent = overrideType ? { type: overrideType } : this.classifyMissionIntent(userPrompt, priorContext);

    const agentActivity = [];

    // --- CASE A: Follow-up on previously retrieved papers ---
    if (intent.isFollowUp && priorContext?.papers) {
      if (intent.type === 'FOLLOW_UP_COMPARE') {
        agentActivity.push({ agent: 'AcademicPaperAgent', status: 'completed', message: 'Comparing previously retrieved publications against follow-up criteria' });
        
        const papersList = priorContext.papers.map((p, i) => `[${i + 1}] "${p.title}" (${p.publishedYear}): ${p.abstract}`).join('\n\n');
        const systemPrompt = `You are DOERA's Academic Research Specialist.
The user is asking: "${userPrompt}" regarding the following previously retrieved papers.
Answer clearly and identify which paper best fits, explaining why with concrete takeaways.`;

        const answer = await llmService.generate({
          systemPrompt,
          userPrompt: papersList,
          temperature: 0.2,
        });

        return {
          missionType: 'FOLLOW_UP_RESEARCH',
          topic: priorContext.topic,
          answer,
          referencedPapers: priorContext.papers,
          agentActivity,
          durationMs: Date.now() - startedAt.getTime(),
        };
      }

      if (intent.type === 'FOLLOW_UP_SUMMARIZE') {
        let targetIndex = 0;
        const key = intent.indexKey?.toLowerCase();
        if (key === 'second' || key === '2' || key === '2nd') targetIndex = 1;
        else if (key === 'third' || key === '3' || key === '3rd') targetIndex = 2;
        else if (key === 'fourth' || key === '4' || key === '4th') targetIndex = 3;
        else if (key === 'fifth' || key === '5' || key === '5th') targetIndex = 4;
        else if (key === 'last') targetIndex = priorContext.papers.length - 1;

        const targetPaper = priorContext.papers[targetIndex] || priorContext.papers[0];

        agentActivity.push({ agent: 'AcademicPaperAgent', status: 'completed', message: `Summarizing Paper #${targetIndex + 1}: "${targetPaper.title}"` });

        return {
          missionType: 'PAPER_SUMMARY',
          topic: targetPaper.title,
          paper: targetPaper,
          summary: targetPaper.abstract || 'Abstract details indexed from public repository.',
          citation: citationAgent.generateCitations([targetPaper], 'IEEE'),
          agentActivity,
          durationMs: Date.now() - startedAt.getTime(),
        };
      }

      if (intent.type === 'FOLLOW_UP_CITATIONS') {
        const citations = citationAgent.generateCitations(priorContext.papers, intent.style || 'IEEE');
        agentActivity.push({ agent: 'CitationAgent', status: 'completed', message: `Formatted ${priorContext.papers.length} publications in ${intent.style || 'IEEE'} style` });

        return {
          missionType: 'CITATION_LIST',
          topic: priorContext.topic,
          citations,
          agentActivity,
          durationMs: Date.now() - startedAt.getTime(),
        };
      }
    }

    // --- CASE B: Fact Verification ---
    if (intent.type === 'FACT_VERIFICATION') {
      agentActivity.push({ agent: 'FactVerificationAgent', status: 'running', message: 'Extracting claims and gathering cross-source corroboration' });
      const verification = await factVerificationAgent.verifyClaim(userPrompt);
      agentActivity[0].status = 'completed';

      return {
        missionType: 'FACT_VERIFICATION',
        topic: userPrompt,
        verification,
        agentActivity,
        durationMs: Date.now() - startedAt.getTime(),
      };
    }

    // --- CASE C: News Discovery ---
    if (intent.type === 'NEWS_DISCOVERY') {
      agentActivity.push({ agent: 'NewsResearchAgent', status: 'running', message: 'Querying authentic tech & science RSS feeds' });
      const cleanTopic = userPrompt.replace(/find recent|latest news|news about|breaking news/gi, '').trim() || 'Technology';
      const newsResult = await newsResearchAgent.searchNews(cleanTopic, 8);
      agentActivity[0].status = 'completed';

      return {
        missionType: 'NEWS_DISCOVERY',
        topic: cleanTopic,
        news: newsResult,
        agentActivity,
        durationMs: Date.now() - startedAt.getTime(),
      };
    }

    // --- CASE D: Wikipedia Concept / Educational Overview ---
    if (intent.type === 'WIKIPEDIA_KNOWLEDGE') {
      agentActivity.push({ agent: 'WikipediaAgent', status: 'running', message: 'Querying Wikipedia REST API and concept hierarchies' });
      const cleanTopic = userPrompt.replace(/what is|explain|who was|overview of|define|in simple terms/gi, '').trim();
      const wikiResult = await wikipediaAgent.explainTopic(cleanTopic, { simple: intent.simple });
      agentActivity[0].status = 'completed';

      return {
        missionType: 'WIKIPEDIA_KNOWLEDGE',
        topic: cleanTopic,
        wikipedia: wikiResult,
        agentActivity,
        durationMs: Date.now() - startedAt.getTime(),
      };
    }

    // --- CASE E: Academic Paper Search & Full Literature Review ---
    // Extract topic
    const cleanTopic = userPrompt
      .replace(/find\s*(five|\d+)?\s*research papers about/gi, '')
      .replace(/research agentic ai|research papers about|papers about|literature review on/gi, '')
      .replace(/compare the findings|identify research gaps|generate an ieee reference list/gi, '')
      .trim() || userPrompt;

    agentActivity.push({ agent: 'AcademicPaperAgent', status: 'running', message: `Querying arXiv, Crossref, and OpenAlex for "${cleanTopic}"` });
    const papersResult = await academicPaperAgent.searchPapers(cleanTopic, { limit: 5 });
    agentActivity[0].status = 'completed';

    const papers = papersResult.papers || [];

    // Save context for follow-ups
    this.setContext(userId, conversationId, {
      topic: cleanTopic,
      papers,
      timestamp: Date.now(),
    });

    let citations = null;
    let report = null;
    let gaps = [];

    // If citations or comprehensive report requested
    if (intent.type === 'COMPREHENSIVE_RESEARCH' || intent.agents?.includes('CitationAgent')) {
      agentActivity.push({ agent: 'CitationAgent', status: 'running', message: 'Generating standardized citations' });
      citations = citationAgent.generateCitations(papers, intent.citationStyle || 'IEEE');
      agentActivity[1].status = 'completed';
    }

    if (intent.type === 'COMPREHENSIVE_RESEARCH') {
      agentActivity.push({ agent: 'ReportGenerationAgent', status: 'running', message: 'Synthesizing literature review and research gap analysis' });
      gaps = await academicPaperAgent.identifyResearchGaps(papers, cleanTopic);
      report = await reportGenerationAgent.generateReport({
        topic: cleanTopic,
        papers,
        reportType: 'literature_review',
        citationStyle: intent.citationStyle || 'IEEE',
      });
      agentActivity[2].status = 'completed';
    }

    return {
      missionType: intent.type,
      topic: cleanTopic,
      papers,
      citations,
      report,
      researchGaps: gaps,
      agentActivity,
      durationMs: Date.now() - startedAt.getTime(),
    };
  }
}

export const researchCoordinatorAgent = new ResearchCoordinatorAgent();
export default researchCoordinatorAgent;
