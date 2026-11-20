import placesAdapter from '../integrations/placesAdapter.js';
import browserAdapter from '../integrations/browserAdapter.js';
import localServiceResearcher from '../services/localServiceResearcher.js';
import { logger } from '../utils/logger.js';

class DiscoveryAgent {
  constructor() {
    this.name = 'Discovery';
  }

  /**
   * Execute business and service discovery using actual external sources
   */
  async execute(taskContext) {
    const startedAt = new Date();
    logger.info(`[Discovery Agent] Initiating discovery for: "${taskContext.userRequest}"`);

    const query = this.extractSearchQuery(taskContext.userRequest);
    const location = this.extractLocation(taskContext.userRequest);

    // Call real Places / OpenStreetMap / Web Directory adapter
    const discovered = await placesAdapter.searchServices({
      query,
      location,
      category: taskContext.category,
    });

    const completedAt = new Date();

    if (!discovered || discovered.length === 0) {
      logger.warn(`[Discovery Agent] No verified service providers found for "${query}" in ${location}.`);
      return {
        agentName: this.name,
        taskId: taskContext.taskId,
        status: 'completed',
        input: { userRequest: taskContext.userRequest, query, location },
        output: {
          providersFound: 0,
          contacts: [],
          message: `No public service providers could be verified for "${query}" in ${location}.`,
        },
        evidence: [],
        sourceReferences: [],
        startedAt,
        completedAt,
      };
    }

    // Verify top provider web presence if public URL available
    if (discovered[0]?.website) {
      try {
        const publicInfo = await browserAdapter.extractPublicInfo(discovered[0].website);
        if (publicInfo?.phone && !discovered[0].phone) {
          discovered[0].phone = publicInfo.phone;
        }
      } catch (err) {
        logger.debug('[Discovery Agent] Optional browser verification notice:', err.message);
      }
    }

    const evidence = discovered
      .filter((d) => d.sourceUrl)
      .map((d) => ({
        title: d.businessName,
        url: d.sourceUrl,
        label: d.rating ? `${d.businessName} (★ ${d.rating})` : `${d.businessName} (Source: ${d.source || 'Directory'})`,
        retrievedAt: d.retrievedAt,
      }));

    return {
      agentName: this.name,
      taskId: taskContext.taskId,
      status: 'completed',
      providersFound: discovered.length,
      contacts: discovered,
      input: { userRequest: taskContext.userRequest, query, location },
      output: {
        queryUsed: query,
        locationUsed: location,
        providersFound: discovered.length,
        contacts: discovered,
      },
      evidence,
      sourceReferences: discovered.map((d) => d.sourceUrl).filter(Boolean),
      startedAt,
      completedAt,
    };
  }

  extractSearchQuery(text) {
    const lower = text.toLowerCase();
    // Medical Specialties
    if (lower.includes('cardiolog') || lower.includes('heart doctor')) return 'cardiologist hospital clinic';
    if (lower.includes('dermatolog') || lower.includes('skin doctor')) return 'dermatologist clinic';
    if (lower.includes('pediatric') || lower.includes('child doctor')) return 'pediatrician clinic hospital';
    if (lower.includes('orthopedic') || lower.includes('bone doctor')) return 'orthopedic hospital clinic';
    if (lower.includes('dentist') || lower.includes('dental')) return 'dental clinic dentist';
    if (lower.includes('hospital')) return 'multispeciality hospital';
    if (lower.includes('doctor') || lower.includes('clinic')) return 'doctor clinic';

    // Home Services & Trades
    if (lower.includes('electrician')) return 'electrician services';
    if (lower.includes('plumber')) return 'plumbing services';
    if (lower.includes('carpenter')) return 'carpentry services';
    if (lower.includes('painter')) return 'house painting services';
    if (lower.includes('cleaner') || lower.includes('cleaning')) return 'home deep cleaning services';
    if (lower.includes('pest control')) return 'pest control service';

    // Education & Tutoring
    if (lower.includes('tutor') || lower.includes('tuition')) return 'private academic tutor coaching';
    if (lower.includes('school') || lower.includes('college')) return 'educational institution';

    // Repair
    if (lower.includes('laptop repair') || lower.includes('computer repair')) return 'laptop computer repair service';
    if (lower.includes('phone repair') || lower.includes('mobile repair')) return 'mobile phone repair service';
    if (lower.includes('appliance repair') || lower.includes('fridge repair') || lower.includes('ac repair')) return 'home appliance ac repair service';

    // Donation & Charity
    if (lower.includes('donation') || lower.includes('donate')) return 'charitable organization ngo donation center';

    // Customer Complaint
    if (lower.includes('complaint') || lower.includes('grievance')) return 'customer support grievance office';

    // Generic fallback
    return text.replace(/find|search for|look for|near me|arrange an appointment|book an appointment|contact/gi, '').trim() || 'local services';
  }

  extractLocation(text) {
    const match = text.match(/(?:in|at|near|around)\s+([a-zA-Z\s]+?)(?:,|$|\.|\sand\s|\sfor\s)/i);
    if (match && match[1]) {
      const loc = match[1].trim();
      if (loc.length > 2 && !['the', 'my', 'area', 'today', 'urgent'].includes(loc.toLowerCase())) {
        return loc;
      }
    }
    return 'Chennai'; // Default locale
  }
}

export const discoveryAgent = new DiscoveryAgent();
export default discoveryAgent;
