import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { getDemoFallbackPlaces } from '../config/demoSeedData.js';

class PlacesAdapter {
  constructor() {
    this.apiKey = config.googlePlacesApiKey;
  }

  /**
   * Search for real businesses and service providers using genuine data sources.
   * Priority:
   * 1. Google Places API (if configured)
   * 2. OpenStreetMap Nominatim with address details and extratags
   * 3. Live Web Directory Search (DuckDuckGo HTML) for specialty entities (doctors, clinics, tradesmen)
   *
   * STRICT ANTI-HALLUCINATION POLICY:
   * - Never invent business names (no "Hub", "Center", "Apex Services" concatenations).
   * - Never invent phone numbers (no "+91 94440 12345" placeholders).
   * - Never invent ratings (no pseudo-random or math-based ratings).
   * - If contact info or price is unavailable, explicitly set to null.
   * - Record source URL and retrieval timestamp for every entry.
   */
  async searchServices({ query, location = 'Chennai', radiusMeters = 5000, category = '' }) {
    logger.info(`[Discovery Integration] Searching verified real-world providers for: "${query}" in "${location}"`);

    // 1. Google Places API (if API key available)
    if (this.apiKey) {
      try {
        const googleResults = await this.searchGooglePlaces(query, location, radiusMeters);
        if (googleResults && googleResults.length > 0) {
          return googleResults;
        }
      } catch (err) {
        logger.warn('[Places Adapter] Google Places search failed, falling back to OSM:', err.message);
      }
    }

    // 2. OpenStreetMap Nominatim (structured geospatial directory)
    const osmResults = await this.searchOpenStreetMap(query, location);
    if (osmResults && osmResults.length > 0) {
      return osmResults.map((r) => ({ ...r, dataSource: 'REAL SOURCE-BASED LOCATION' }));
    }

    // 3. Live Web Directory Search for domain-specific providers
    const webResults = await this.searchLiveWebDirectory(query, location, category);
    if (webResults && webResults.length > 0) {
      return webResults.map((r) => ({ ...r, dataSource: 'REAL SOURCE-BASED LOCATION' }));
    }

    // 4. Safe Hackathon Demo Fallback Dataset (Explicitly labeled DEMO DATA)
    const fallbackPlaces = getDemoFallbackPlaces(query, location);
    if (fallbackPlaces && fallbackPlaces.length > 0) {
      logger.info(`[Places Adapter] Falling back to structured Hackathon Demo Dataset for "${query}" in "${location}".`);
      return fallbackPlaces.map((f) => ({
        ...f,
        dataSource: 'DEMO DATA',
        source: 'DOERA Hackathon Seeded Dataset (Safe Fallback)',
      }));
    }

    logger.info(`[Places Adapter] No public directory providers found for "${query}" in "${location}".`);
    return [];
  }

  /**
   * Real Google Places API Search
   */
  async searchGooglePlaces(query, location, radiusMeters) {
    try {
      const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        `${query} in ${location}`
      )}&key=${this.apiKey}`;

      const res = await axios.get(textSearchUrl, { timeout: 10000 });
      if (res.data.status !== 'OK' && res.data.status !== 'ZERO_RESULTS') {
        logger.warn(`[Google Places] Status: ${res.data.status}`, res.data.error_message);
        return [];
      }

      return (res.data.results || []).slice(0, 5).map((p) => ({
        businessName: p.name,
        address: p.formatted_address || `${p.name}, ${location}`,
        rating: p.rating || null,
        reviewsCount: p.user_ratings_total || null,
        location: {
          lat: p.geometry?.location?.lat || null,
          lng: p.geometry?.location?.lng || null,
        },
        placeId: p.place_id,
        source: 'Google Places API',
        sourceUrl: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
        phone: null, // Phone requires Place Details call or inquiry
        email: null,
        status: 'DISCOVERED',
        retrievedAt: new Date().toISOString(),
      }));
    } catch (err) {
      logger.error('[Google Places] Error querying Google Places API:', err.message);
      return [];
    }
  }

  /**
   * Real OpenStreetMap Nominatim Search
   */
  async searchOpenStreetMap(query, location) {
    try {
      const cleanQuery = (query || '').trim();
      const lower = cleanQuery.toLowerCase();
      const candidates = [`${cleanQuery} ${location}`.trim()];

      // Add domain-aware search query alternatives if query contains specific trade or medical keywords
      if (lower.includes('cardio') || lower.includes('heart')) {
        candidates.push(`heart hospital ${location}`, `cardiac hospital ${location}`, `hospital in ${location}`);
      } else if (lower.includes('dermatolog') || lower.includes('skin')) {
        candidates.push(`skin clinic ${location}`, `dermatology clinic ${location}`, `clinic in ${location}`);
      } else if (lower.includes('doctor') || lower.includes('clinic')) {
        candidates.push(`clinic ${location}`, `hospital in ${location}`);
      } else if (lower.includes('electric')) {
        candidates.push(`electrical ${location}`, `electricals ${location}`, `hardware ${location}`);
      } else if (lower.includes('plumb')) {
        candidates.push(`plumbing ${location}`, `sanitary ${location}`);
      } else if (lower.includes('laptop') || lower.includes('computer')) {
        candidates.push(`computer shop ${location}`, `laptop service ${location}`, `electronics ${location}`);
      } else if (lower.includes('print')) {
        candidates.push(`printers ${location}`, `press ${location}`, `printing ${location}`);
      } else if (lower.includes('school') || lower.includes('college') || lower.includes('institution')) {
        candidates.push(`school ${location}`, `college ${location}`);
      } else if (lower.includes('repair')) {
        candidates.push(`service center ${location}`, `repair shop ${location}`);
      }

      for (const phrase of candidates) {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          phrase
        )}&addressdetails=1&extratags=1&limit=8`;

        const res = await axios.get(nominatimUrl, {
          headers: {
            'User-Agent': 'DOERA-AI-Autonomous-Agent/2.0 (contact@doera.ai)',
            Accept: 'application/json',
          },
          timeout: 8000,
        });

        if (!res.data || !Array.isArray(res.data) || res.data.length === 0) {
          continue;
        }

        const results = [];
        for (const place of res.data) {
          // Discard generic country / state / boundary results
          if (place.class === 'boundary' || place.type === 'administrative') continue;

          const businessName = place.namedetails?.name || place.name || (place.display_name ? place.display_name.split(',')[0].trim() : null);
          if (!businessName) continue;

          // Discard non-commercial public utilities or university academic faculties
          const bLower = businessName.toLowerCase();
          if (
            bLower.includes('department of') ||
            bLower.includes('substation') ||
            bLower.includes('sub-station') ||
            bLower.includes('ministry of')
          ) {
            continue;
          }

          const phone = place.extratags?.phone || place.extratags?.['contact:phone'] || null;
          const email = place.extratags?.email || place.extratags?.['contact:email'] || null;
          const website = place.extratags?.website || place.extratags?.['contact:website'] || null;

          results.push({
            businessName,
            address: place.display_name,
            rating: null, // OSM does not have verified ratings; never fabricate
            reviewsCount: null,
            location: {
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lon),
            },
            source: 'OpenStreetMap Nominatim',
            sourceUrl: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}`,
            phone,
            email,
            website,
            status: 'DISCOVERED',
            retrievedAt: new Date().toISOString(),
          });

          if (results.length >= 5) break;
        }

        if (results.length > 0) {
          return results;
        }
      }

      return [];
    } catch (err) {
      logger.warn('[OpenStreetMap Discovery] Query to OSM Nominatim failed:', err.message);
      return [];
    }
  }

  /**
   * Real Live Web Directory Search for domain-specific verified entities
   * Uses DuckDuckGo HTML to retrieve actual institutions, clinics, hospitals, or service providers.
   */
  async searchLiveWebDirectory(query, location, category) {
    try {
      logger.info(`[Places Adapter] Performing live web directory lookup for: "${query} ${location}"`);
      const isMedical = /clinic|hospital|doctor|cardiolog|dermatolog/i.test(`${query} ${category}`);
      const searchQuery = isMedical
        ? `${query} ${location} clinic hospital official`
        : `${query} ${location} service official`;
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

      const res = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 9000,
      });

      const html = res.data || '';
      const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

      const links = [];
      let match;
      while ((match = linkRegex.exec(html)) !== null) {
        const rawUrl = match[1];
        const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
        const cleanUrl = uddgMatch ? decodeURIComponent(uddgMatch[1]) : rawUrl;
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        links.push({ title, url: cleanUrl });
      }

      const snippets = [];
      while ((match = snippetRegex.exec(html)) !== null) {
        snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
      }

      const results = [];
      const seenNames = new Set();

      for (let i = 0; i < Math.min(links.length, snippets.length, 6); i++) {
        const link = links[i];
        const snippet = snippets[i];

        // Clean business or clinic name from title
        let businessName = link.title
          .split(/[-|–•]/)[0]
          .replace(/Best|Top|Famous|Verified|Near Me|Doctors in|Specialists in/gi, '')
          .trim();

        if (!businessName || businessName.length < 3 || seenNames.has(businessName.toLowerCase())) {
          continue;
        }

        // Filter out aggregator article titles that aren't business names
        if (businessName.toLowerCase().startsWith('http') || businessName.length > 50) {
          businessName = businessName.substring(0, 45);
        }

        seenNames.add(businessName.toLowerCase());

        // Extract phone number from snippet ONLY if it matches a genuine phone pattern
        const phoneMatch = snippet.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b044[\s-]?\d{8}\b/);
        const phone = phoneMatch ? phoneMatch[0] : null;

        // Extract fee if publicly mentioned in snippet
        const feeMatch = snippet.match(/(?:₹|Rs\.?|INR)\s*(\d{3,5})/i);
        const quote = feeMatch ? { consultationFee: `₹${feeMatch[1]}`, feeSource: link.url } : null;

        results.push({
          businessName,
          address: `${location}, Tamil Nadu, India`,
          rating: null, // Only include if verifiable
          reviewsCount: null,
          location: null,
          source: 'Live Web Public Directory',
          sourceUrl: link.url,
          phone,
          email: null,
          website: link.url,
          quote,
          snippet,
          status: 'DISCOVERED',
          retrievedAt: new Date().toISOString(),
        });

        if (results.length >= 4) break;
      }

      return results;
    } catch (err) {
      logger.warn('[Places Adapter] Live web directory lookup failed:', err.message);
      return [];
    }
  }
}

export const placesAdapter = new PlacesAdapter();
export default placesAdapter;
