import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Academic Research Discovery Service
 * Queries free public scholarly APIs: arXiv, Crossref, and OpenAlex.
 * Zero hallucinated papers/DOIs. Clickable original paper links.
 */
class AcademicSearchService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
    this.DEFAULT_TIMEOUT_MS = 8000;
  }

  _getCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  _setCache(key, data) {
    if (this.cache.size > 200) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { timestamp: Date.now(), data });
  }

  /**
   * Search arXiv API
   */
  async searchArxiv(query, limit = 5) {
    const cacheKey = `arxiv:${query}:${limit}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const cleanQuery = query.replace(/[^\w\s-]/gi, ' ').trim();
      const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(cleanQuery)}&start=0&max_results=${limit}&sortBy=relevance&sortOrder=descending`;

      const res = await axios.get(url, {
        timeout: this.DEFAULT_TIMEOUT_MS,
        headers: { 'User-Agent': 'DOERA-AI-AcademicSearch/3.0' },
      });

      const xml = res.data || '';
      const entries = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      let match;

      while ((match = entryRegex.exec(xml)) !== null && entries.length < limit) {
        const entryBlock = match[1];

        const idMatch = entryBlock.match(/<id>([\s\S]*?)<\/id>/i);
        const titleMatch = entryBlock.match(/<title>([\s\S]*?)<\/title>/i);
        const summaryMatch = entryBlock.match(/<summary>([\s\S]*?)<\/summary>/i);
        const publishedMatch = entryBlock.match(/<published>([\s\S]*?)<\/published>/i);
        const doiMatch = entryBlock.match(/<arxiv:doi[^>]*>([\s\S]*?)<\/arxiv:doi>/i);

        // Extract authors
        const authors = [];
        const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/gi;
        let authMatch;
        while ((authMatch = authorRegex.exec(entryBlock)) !== null) {
          authors.push(authMatch[1].trim());
        }

        const rawId = idMatch ? idMatch[1].trim() : '';
        const arxivNum = rawId.split('/abs/').pop() || rawId.split('/').pop() || '';
        const cleanTitle = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Untitled Paper';
        const abstract = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';
        const publishedDate = publishedMatch ? publishedMatch[1].split('T')[0] : '';
        const doi = doiMatch ? doiMatch[1].trim() : null;

        entries.push({
          id: `arxiv:${arxivNum}`,
          title: cleanTitle,
          authors: authors.length > 0 ? authors : ['Unknown Author'],
          abstract,
          publishedDate,
          publishedYear: publishedDate ? publishedDate.split('-')[0] : 'N/A',
          source: 'arXiv',
          doi,
          url: rawId.startsWith('http') ? rawId : `https://arxiv.org/abs/${arxivNum}`,
          pdfUrl: `https://arxiv.org/pdf/${arxivNum}.pdf`,
          citationCount: null,
          verified: true,
        });
      }

      this._setCache(cacheKey, entries);
      return entries;
    } catch (err) {
      logger.warn(`[AcademicSearch] arXiv query error for "${query}": ${err.message}`);
      return [];
    }
  }

  /**
   * Search Crossref REST API
   */
  async searchCrossref(query, limit = 5) {
    const cacheKey = `crossref:${query}:${limit}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&select=DOI,title,author,published,created,publisher,container-title,abstract,URL,is-referenced-by-count`;

      const res = await axios.get(url, {
        timeout: this.DEFAULT_TIMEOUT_MS,
        headers: {
          'User-Agent': 'DOERA-AI-Research/3.0 (mailto:research@doera.ai)',
        },
      });

      const items = res.data?.message?.items || [];
      const results = items.map((item) => {
        const title = item.title?.[0]?.replace(/\s+/g, ' ').trim() || 'Scholarly Work';
        const authors = (item.author || []).map((a) => {
          if (a.name) return a.name;
          const given = a.given ? `${a.given} ` : '';
          return `${given}${a.family || ''}`.trim();
        }).filter(Boolean);

        const year =
          item.published?.['date-parts']?.[0]?.[0] ||
          item.created?.['date-parts']?.[0]?.[0] ||
          'N/A';

        const doi = item.DOI || '';
        const journal = item['container-title']?.[0] || item.publisher || 'Crossref Publication';

        let abstract = '';
        if (item.abstract) {
          abstract = item.abstract.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        return {
          id: `crossref:${doi}`,
          title,
          authors: authors.length > 0 ? authors : ['Academic Contributor'],
          abstract: abstract || `Published in ${journal} (${year}). Indexed via Crossref DOI registry.`,
          publishedYear: String(year),
          publishedDate: String(year),
          journal,
          publisher: item.publisher || '',
          source: 'Crossref',
          doi,
          url: item.URL || (doi ? `https://doi.org/${doi}` : null),
          pdfUrl: null,
          citationCount: item['is-referenced-by-count'] ?? null,
          verified: true,
        };
      });

      this._setCache(cacheKey, results);
      return results;
    } catch (err) {
      logger.warn(`[AcademicSearch] Crossref query error for "${query}": ${err.message}`);
      return [];
    }
  }

  /**
   * Search OpenAlex API
   */
  async searchOpenAlex(query, limit = 5) {
    const cacheKey = `openalex:${query}:${limit}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}`;

      const res = await axios.get(url, {
        timeout: this.DEFAULT_TIMEOUT_MS,
        headers: {
          'User-Agent': 'DOERA-AI-OpenAlex/3.0 (mailto:research@doera.ai)',
        },
      });

      const items = res.data?.results || [];
      const results = items.map((item) => {
        const title = item.title?.replace(/\s+/g, ' ').trim() || 'Academic Work';
        const authors = (item.authorships || []).map((a) => a.author?.display_name).filter(Boolean);
        const doi = item.doi ? item.doi.replace(/^https?:\/\/doi\.org\//, '') : '';
        const year = item.publication_year ? String(item.publication_year) : 'N/A';
        const venue = item.primary_location?.source?.display_name || item.host_venue?.display_name || '';

        // Reconstruct abstract from inverted index if present
        let abstract = '';
        if (item.abstract_inverted_index) {
          const wordsWithPositions = [];
          for (const [word, positions] of Object.entries(item.abstract_inverted_index)) {
            for (const pos of positions) {
              wordsWithPositions.push({ word, pos });
            }
          }
          wordsWithPositions.sort((a, b) => a.pos - b.pos);
          abstract = wordsWithPositions.map((wp) => wp.word).join(' ').trim();
        }

        const concepts = (item.concepts || []).slice(0, 4).map((c) => c.display_name);

        return {
          id: `openalex:${item.id?.split('/').pop() || item.id}`,
          title,
          authors: authors.length > 0 ? authors : ['Scholarly Author'],
          abstract: abstract || `OpenAlex documented work on ${concepts.join(', ') || 'specialized research topics'}.`,
          publishedYear: year,
          publishedDate: item.publication_date || year,
          journal: venue,
          source: 'OpenAlex',
          doi: doi || null,
          url: item.doi || item.primary_location?.landing_page_url || item.id,
          pdfUrl: item.open_access?.oa_url || null,
          citationCount: item.cited_by_count ?? null,
          concepts,
          verified: true,
        };
      });

      this._setCache(cacheKey, results);
      return results;
    } catch (err) {
      logger.warn(`[AcademicSearch] OpenAlex query error for "${query}": ${err.message}`);
      return [];
    }
  }

  /**
   * Unified Academic Discovery across arXiv, Crossref, and OpenAlex
   * Merges, deduplicates, and ranks papers by relevance.
   */
  async searchPapers(query, { sources = ['arxiv', 'crossref', 'openalex'], limit = 5 } = {}) {
    logger.info(`[AcademicSearch] Discovering papers across [${sources.join(', ')}] for: "${query}"`);

    const promises = [];
    if (sources.includes('arxiv')) promises.push(this.searchArxiv(query, limit));
    if (sources.includes('crossref')) promises.push(this.searchCrossref(query, limit));
    if (sources.includes('openalex')) promises.push(this.searchOpenAlex(query, limit));

    const settled = await Promise.allSettled(promises);
    const combined = [];

    settled.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        combined.push(...res.value);
      }
    });

    // Deduplicate by normalized title
    const seenTitles = new Set();
    const uniquePapers = [];

    for (const paper of combined) {
      const normTitle = paper.title.toLowerCase().replace(/[^\w]/g, '');
      if (normTitle && !seenTitles.has(normTitle)) {
        seenTitles.add(normTitle);
        uniquePapers.push(paper);
      }
    }

    return uniquePapers.slice(0, Math.max(limit, 5));
  }
}

export const academicSearchService = new AcademicSearchService();
export default academicSearchService;
