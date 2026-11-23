import citationService from '../services/citationService.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Citation and Reference Agent
 * Generates formatted bibliographies and citations in IEEE, APA, MLA, and Chicago styles.
 */
class CitationAgent {
  constructor() {
    this.name = 'CitationAgent';
  }

  /**
   * Format references for a collection of papers
   */
  generateCitations(papers = [], style = 'IEEE') {
    logger.info(`[CitationAgent] Generating ${style} citations for ${papers.length} publications`);
    const result = citationService.formatBibliography(papers, style);

    return {
      agent: this.name,
      status: 'completed',
      style: result.style,
      count: result.count,
      citations: result.citations,
      bibliographyText: result.bibliographyText,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const citationAgent = new CitationAgent();
export default citationAgent;
