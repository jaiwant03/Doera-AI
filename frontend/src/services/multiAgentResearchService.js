import api from './api';

/**
 * DOERA AI — Multi-Agent Research Client Service
 */
export const multiAgentResearchService = {
  /**
   * Run full multi-agent mission coordination
   */
  async coordinateMission({ userPrompt, conversationId, overrideType }) {
    const res = await api.post('/research/coordinate', {
      userPrompt,
      conversationId,
      overrideType,
    });
    return res.data;
  },

  /**
   * Search academic papers across arXiv, Crossref, and OpenAlex
   */
  async searchAcademicPapers({ query, limit = 5, sources }) {
    const res = await api.post('/research/academic', { query, limit, sources });
    return res.data;
  },

  /**
   * Compare two specific academic papers
   */
  async compareAcademicPapers(paperA, paperB) {
    const res = await api.post('/research/academic/compare', { paperA, paperB });
    return res.data;
  },

  /**
   * Lookup encyclopedic knowledge from Wikipedia
   */
  async lookupWikipedia({ query, simple = false }) {
    const res = await api.post('/research/wikipedia', { query, simple });
    return res.data;
  },

  /**
   * Discover latest tech and science news via RSS
   */
  async discoverNews({ topic = '', limit = 8 }) {
    const res = await api.post('/research/news', { topic, limit });
    return res.data;
  },

  /**
   * Verify an empirical claim against multi-source evidence
   */
  async verifyClaim(statement) {
    const res = await api.post('/research/verify', { statement });
    return res.data;
  },

  /**
   * Generate bibliography citations (IEEE, APA, MLA, Chicago)
   */
  async generateCitations({ papers, style = 'IEEE' }) {
    const res = await api.post('/research/citations', { papers, style });
    return res.data;
  },

  /**
   * Generate publication-grade structured research report
   */
  async generateReport(reportPayload) {
    const res = await api.post('/research/report', reportPayload);
    return res.data;
  },

  /**
   * Get mission history sessions
   */
  async getSessions(conversationId) {
    const res = await api.get('/research/sessions', {
      params: conversationId ? { conversationId } : {},
    });
    return res.data;
  },
};

export default multiAgentResearchService;
