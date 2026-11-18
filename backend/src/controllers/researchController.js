import ResearchSession from '../models/ResearchSession.js';
import researchService from '../services/researchService.js';

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
