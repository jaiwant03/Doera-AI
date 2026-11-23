import axios from 'axios';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — News Discovery RSS Service
 * Ingests free public RSS/Atom feeds from authentic tech and science publications.
 * Zero paid API keys required. Resilient parsing with per-source isolation.
 */
class NewsRssService {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL_MS = 5 * 60 * 1000; // 5 mins
    this.TIMEOUT_MS = 6000;

    this.DEFAULT_FEEDS = [
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'technology' },
      { name: 'Hacker News', url: 'https://news.ycombinator.com/rss', category: 'technology' },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'technology' },
      { name: 'BBC Tech', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'general' },
      { name: 'ScienceDaily', url: 'https://rss.sciencedaily.com/top/technology.xml', category: 'science' },
    ];
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
    this.cache.set(key, { timestamp: Date.now(), data });
  }

  /**
   * Parse XML RSS or Atom text into normalized article objects
   */
  _parseXmlFeed(xml, feedName) {
    const articles = [];
    const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && articles.length < 15) {
      const block = match[0];

      // Extract title
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/title>/i);
      const title = (titleMatch ? (titleMatch[1] || titleMatch[2]) : '').replace(/<[^>]+>/g, '').trim();

      // Extract link
      let link = '';
      const linkMatch = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i) || block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      if (linkMatch) {
        link = (linkMatch[1] || '').trim();
      }

      // Extract pubDate / published / updated
      const dateMatch =
        block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) ||
        block.match(/<published>([\s\S]*?)<\/published>/i) ||
        block.match(/<updated>([\s\S]*?)<\/updated>/i) ||
        block.match(/<dc:date>([\s\S]*?)<\/dc:date>/i);
      const rawDate = dateMatch ? dateMatch[1].trim() : '';

      let isoDate = '';
      try {
        if (rawDate) {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            isoDate = parsed.toISOString().split('T')[0];
          }
        }
      } catch {
        isoDate = '';
      }

      // Extract description / summary
      const descMatch =
        block.match(/<description[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/description>/i) ||
        block.match(/<summary[^>]*>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/summary>/i);
      let description = (descMatch ? (descMatch[1] || descMatch[2]) : '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (description.length > 280) {
        description = `${description.substring(0, 277)}...`;
      }

      // Detect if opinion / analysis or news report
      const isOpinion = /opinion|editorial|perspective|review|column|commentary/i.test(title);

      if (title && link) {
        articles.push({
          title,
          link,
          source: feedName,
          publishedDate: isoDate || 'Recent',
          rawDate,
          description: description || 'No summary available for this feed entry.',
          type: isOpinion ? 'Opinion / Editorial' : 'News Report',
          verified: true,
        });
      }
    }

    return articles;
  }

  /**
   * Fetch a single RSS feed safely
   */
  async fetchFeed(feed) {
    try {
      const res = await axios.get(feed.url, {
        timeout: this.TIMEOUT_MS,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DOERA-NewsRSS/3.0',
          Accept: 'application/rss+xml, application/atom+xml, text/xml, application/xml;q=0.9,*/*;q=0.8',
        },
      });

      return this._parseXmlFeed(res.data, feed.name);
    } catch (err) {
      logger.warn(`[NewsRssService] Failed to fetch feed "${feed.name}": ${err.message}`);
      return [];
    }
  }

  /**
   * Search news across all configured feeds for a topic or keyword
   */
  async searchNews(topic = '', limit = 10) {
    const cacheKey = `news:${topic}:${limit}`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    logger.info(`[NewsRssService] Searching feeds for topic: "${topic}"`);

    const feedPromises = this.DEFAULT_FEEDS.map((feed) => this.fetchFeed(feed));
    const feedResults = await Promise.allSettled(feedPromises);

    const allArticles = [];
    feedResults.forEach((res) => {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        allArticles.push(...res.value);
      }
    });

    // Filter by topic if specified
    let filtered = allArticles;
    if (topic && topic.trim()) {
      const keywords = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      if (keywords.length > 0) {
        filtered = allArticles.filter((article) => {
          const text = `${article.title} ${article.description}`.toLowerCase();
          return keywords.some((kw) => text.includes(kw));
        });
      }
    }

    // Fall back to all recent articles if keyword filter yielded zero matches
    if (filtered.length === 0 && allArticles.length > 0) {
      filtered = allArticles;
    }

    // Deduplicate by title
    const seen = new Set();
    const unique = [];
    for (const art of filtered) {
      const slug = art.title.toLowerCase().replace(/[^\w]/g, '');
      if (!seen.has(slug)) {
        seen.add(slug);
        unique.push(art);
      }
    }

    const finalArticles = unique.slice(0, limit);
    this._setCache(cacheKey, finalArticles);
    return finalArticles;
  }
}

export const newsRssService = new NewsRssService();
export default newsRssService;
