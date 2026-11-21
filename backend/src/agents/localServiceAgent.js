import localServiceResearcher from '../services/localServiceResearcher.js';
import { logger } from '../utils/logger.js';

class LocalServiceAgent {
  constructor() {
    this.name = 'LocalService';
  }

  /**
   * Execute real-world local service research with strictly zero bookings or transactions
   */
  async execute(taskContext) {
    const startedAt = new Date();
    const userRequest = taskContext.userRequest || '';
    logger.info(`[LocalService Agent] Executing research-only service discovery for: "${userRequest}"`);

    const result = await localServiceResearcher.researchLocalServices(taskContext);
    const completedAt = new Date();

    const isLocationRequired = result.status === 'LOCATION_REQUIRED' || Boolean(result.locationRequired);
    const isSearchFailed = result.status === 'SEARCH_FAILED' || result.searchState === 'SEARCH_FAILED';

    let agentStatus = 'completed';
    if (isLocationRequired) {
      agentStatus = 'LOCATION_REQUIRED';
    } else if (isSearchFailed) {
      agentStatus = 'SEARCH_FAILED';
    }

    return {
      agentName: this.name,
      taskId: taskContext.taskId,
      status: agentStatus,
      category: 'LOCATION_DISCOVERY',
      input: { userRequest, params: result.params },
      output: {
        ...result,
        queryUsed: result.params?.searchTerms?.join(', ') || result.params?.brandQuery || 'local service',
        locationUsed: result.params?.targetLocation || 'Unknown',
        providersFound: result.providersFound || result.providers?.length || 0,
        requestedCount: result.requestedCount || result.params?.targetCount || 5,
        providers: result.providers || [],
        comparisonMatrix: result.comparisonMatrix,
        recommendation: result.recommendation,
        locationData: result.locationData,
        limitations: result.limitations,
        noContactGuarantee: result.noContactGuarantee,
        params: result.params,
        searchState: result.searchState || (isLocationRequired ? 'LOCATION_REQUIRED' : (isSearchFailed ? 'SEARCH_FAILED' : 'RESULTS_FOUND')),
        locationRequired: isLocationRequired,
        status: result.status,
      },
      providers: result.providers || [],
      contacts: result.providers || [],
      externalContacts: result.providers || [],
      comparisonMatrix: result.comparisonMatrix,
      locationData: result.locationData,
      evidence: result.evidence || [],
      noContactGuarantee: result.noContactGuarantee,
      searchState: result.searchState,
      locationRequired: isLocationRequired,
      startedAt,
      completedAt,
    };
  }
}

export const localServiceAgent = new LocalServiceAgent();
export default localServiceAgent;
