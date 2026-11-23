import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Wikipedia Knowledge Service
 * Connects to public Wikipedia REST API and MediaWiki API.
 * Provides summaries, definitions, section structures, and verified article references.
 */
class WikipediaService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins
    this.TIMEOUT_MS = 7000;
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
   * Search Wikipedia for articles matching a query
   */
  async searchArticles(query, limit = 5) {
    const cacheKey = `wiki_search:${query}:${limit}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=${limit}`;
      const res = await axios.get(url, {
        timeout: this.TIMEOUT_MS,
        headers: { 'User-Agent': 'DOERA-AI-WikipediaService/3.0 (contact@doera.ai)' },
      });

      const searchList = res.data?.query?.search || [];
      const results = searchList.map((item) => ({
        pageId: item.pageid,
        title: item.title,
        snippet: (item.snippet || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        wordCount: item.wordcount,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
      }));

      this._setCache(cacheKey, results);
      return results;
    } catch (err) {
      logger.warn(`[WikipediaService] Search error for "${query}": ${err.message}`);
      return [];
    }
  }

  /**
   * Get direct encyclopedic summary via Wikipedia REST API
   */
  async getPageSummary(title) {
    const cleanTitle = title.trim().replace(/\s+/g, '_');
    const cacheKey = `wiki_summary:${cleanTitle}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
      const res = await axios.get(url, {
        timeout: this.TIMEOUT_MS,
        headers: { 'User-Agent': 'DOERA-AI-WikipediaService/3.0 (contact@doera.ai)' },
      });

      const data = res.data;
      const result = {
        title: data.title || title,
        description: data.description || 'Encyclopedic overview',
        extract: data.extract || '',
        thumbnail: data.thumbnail?.source || null,
        url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTitle)}`,
        timestamp: data.timestamp || null,
        source: 'Wikipedia (The Free Encyclopedia)',
      };

      this._setCache(cacheKey, result);
      return result;
    } catch (err) {
      logger.warn(`[WikipediaService] Summary error for "${title}": ${err.message}`);
      return null;
    }
  }

  /**
   * Get article section titles
   */
  async getArticleSections(title) {
    const cleanTitle = title.trim();
    const cacheKey = `wiki_sections:${cleanTitle}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(cleanTitle)}&prop=sections&format=json`;
      const res = await axios.get(url, {
        timeout: this.TIMEOUT_MS,
        headers: { 'User-Agent': 'DOERA-AI-WikipediaService/3.0' },
      });

      const rawSections = res.data?.parse?.sections || [];
      const sections = rawSections
        .filter((s) => s.toclevel <= 2)
        .map((s) => ({
          title: s.line,
          level: s.toclevel,
          anchor: s.anchor,
        }));

      this._setCache(cacheKey, sections);
      return sections;
    } catch (err) {
      logger.warn(`[WikipediaService] Sections error for "${title}": ${err.message}`);
      return [];
    }
  }

  /**
   * Comprehensive knowledge lookup for a concept or entity
   */
  async lookupConcept(query) {
    logger.info(`[WikipediaService] Looking up concept: "${query}"`);

    // 1. First try direct summary
    let summary = await this.getPageSummary(query);

    // 2. If direct fails or disambiguation, search top article
    let searchResults = [];
    if (!summary || !summary.extract || summary.description?.toLowerCase().includes('disambiguation')) {
      searchResults = await this.searchArticles(query, 3);
      if (searchResults.length > 0) {
        summary = await this.getPageSummary(searchResults[0].title);
      }
    }

    if (!summary) {
      return {
        query,
        found: false,
        message: `No authoritative Wikipedia article was found matching "${query}".`,
        suggestions: searchResults,
      };
    }

    // 3. Fetch sections for deep structure
    const sections = await this.getArticleSections(summary.title);

    return {
      query,
      found: true,
      title: summary.title,
      description: summary.description,
      summary: summary.extract,
      url: summary.url,
      thumbnail: summary.thumbnail,
      sections: sections.slice(0, 8),
      relatedArticles: searchResults.slice(1, 4),
      source: 'Wikipedia (Public REST API)',
      retrievedAt: new Date().toISOString(),
    };
  }
}

export const wikipediaService = new WikipediaService();
export default wikipediaService;
