import ResearchSession from '../models/ResearchSession.js';
import researchCoordinatorAgent from '../agents/researchCoordinatorAgent.js';
import academicPaperAgent from '../agents/academicPaperAgent.js';
import wikipediaAgent from '../agents/wikipediaAgent.js';
import newsResearchAgent from '../agents/newsResearchAgent.js';
import factVerificationAgent from '../agents/factVerificationAgent.js';
import citationAgent from '../agents/citationAgent.js';
import reportGenerationAgent from '../agents/reportGenerationAgent.js';
import researchService from '../services/researchService.js';
import { logger } from '../utils/logger.js';

/**
 * 1. Multi-Agent Research Mission Orchestrator
 */
export const coordinateResearch = async (req, res) => {
  try {
    const { userPrompt, query, conversationId, overrideType } = req.body;
    const promptText = userPrompt || query;

    if (!promptText?.trim()) {
      return res.status(400).json({ error: 'Research prompt or query is required' });
    }

    const userId = req.user?._id ? String(req.user._id) : 'guest';

    const result = await researchCoordinatorAgent.coordinateMission({
      userPrompt: promptText.trim(),
      userId,
      conversationId: conversationId || null,
      overrideType,
    });

    // Optionally save to ResearchSession history
    try {
      await ResearchSession.create({
        userId: req.user._id,
        conversationId: conversationId || null,
        query: promptText.trim(),
        mode: result.missionType || 'comprehensive',
        status: 'completed',
        sources: (result.papers || []).map((p) => ({
          title: p.title,
          url: p.url,
          snippet: p.abstract?.slice(0, 200) || '',
          source: p.source,
          verified: true,
        })),
        findingsReport: typeof result.report === 'object' ? JSON.stringify(result.report) : (result.answer || ''),
      });
    } catch (saveErr) {
      logger.warn(`[ResearchController] Could not persist session history: ${saveErr.message}`);
    }

    res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error(`[ResearchController] Coordination failed: ${err.message}`);
    res.status(500).json({ error: err.message || 'Multi-agent research mission failed' });
  }
};

/**
 * 2. Academic Papers Search (arXiv, Crossref, OpenAlex)
 */
export const searchAcademicPapers = async (req, res) => {
  try {
    const { query, limit = 5, sources = ['arxiv', 'crossref', 'openalex'] } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required for paper search' });
    }

    const result = await academicPaperAgent.searchPapers(query.trim(), { limit, sources });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Paper search failed' });
  }
};

/**
 * 3. Academic Papers Comparison
 */
export const compareAcademicPapers = async (req, res) => {
  try {
    const { paperA, paperB } = req.body;
    if (!paperA || !paperB) {
      return res.status(400).json({ error: 'Both paperA and paperB are required for comparison' });
    }

    const comparison = await academicPaperAgent.comparePapers(paperA, paperB);
    res.json({ success: true, ...comparison });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Paper comparison failed' });
  }
};

/**
 * 4. Wikipedia Knowledge Lookup
 */
export const lookupWikipedia = async (req, res) => {
  try {
    const { query, simple = false } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ error: 'Topic query is required' });
    }

    const result = await wikipediaAgent.explainTopic(query.trim(), { simple });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Wikipedia lookup failed' });
  }
};

/**
 * 5. News Discovery via RSS
 */
export const discoverNews = async (req, res) => {
  try {
    const { topic = '', limit = 8 } = req.body;
    const result = await newsResearchAgent.searchNews(topic, limit);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'News discovery failed' });
  }
};

/**
 * 6. Fact Verification
 */
export const verifyFact = async (req, res) => {
  try {
    const { statement } = req.body;
    if (!statement?.trim()) {
      return res.status(400).json({ error: 'Statement is required for fact verification' });
    }

    const result = await factVerificationAgent.verifyClaim(statement.trim());
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Fact verification failed' });
  }
};

/**
 * 7. Citation Generator
 */
export const generateCitations = async (req, res) => {
  try {
    const { papers = [], style = 'IEEE' } = req.body;
    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({ error: 'At least one paper object is required to generate citations' });
    }

    const result = citationAgent.generateCitations(papers, style);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Citation generation failed' });
  }
};

/**
 * 8. Report Generation
 */
export const generateReport = async (req, res) => {
  try {
    const { topic, objective, papers = [], wikiData, newsData, verificationData, reportType = 'literature_review', citationStyle = 'IEEE' } = req.body;
    if (!topic?.trim()) {
      return res.status(400).json({ error: 'Report topic is required' });
    }

    const result = await reportGenerationAgent.generateReport({
      topic: topic.trim(),
      objective,
      papers,
      wikiData,
      newsData,
      verificationData,
      reportType,
      citationStyle,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Report generation failed' });
  }
};

/**
 * 9. Standard Web Deep Research (Backward Compatible)
 */
export const startResearch = async (req, res) => {
  try {
    const { query, mode, conversationId } = req.body;
    if (!query?.trim()) {
      return res.status(400).json({ error: 'Research query is required' });
    }

    const researchResult = await researchService.executeResearch({
      query: query.trim(),
      mode: mode || 'detailed',
    });

    const session = await ResearchSession.create({
      userId: req.user._id,
      conversationId: conversationId || null,
      query: researchResult.query,
      mode: researchResult.mode,
      status: researchResult.status,
      subtasks: researchResult.subtasks,
      sources: researchResult.sources,
      findingsReport: researchResult.findingsReport,
    });

    res.status(201).json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Research session failed' });
  }
};

export const getResearchSessions = async (req, res) => {
  try {
    const { conversationId } = req.query;
    const filter = { userId: req.user._id };
    if (conversationId) filter.conversationId = conversationId;

    const sessions = await ResearchSession.find(filter).sort({ createdAt: -1 });
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch research sessions' });
  }
};

export const getResearchSession = async (req, res) => {
  try {
    const session = await ResearchSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Research session not found' });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch research session' });
  }
};
