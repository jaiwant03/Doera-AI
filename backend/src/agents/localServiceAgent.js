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

    const isShowMap = result.presentationMode?.showMap ?? (Boolean(result.locationData));
    const isShowList = result.presentationMode?.showBusinessList ?? true;

    return {
      agentName: this.name,
      taskId: taskContext.taskId,
      status: agentStatus,
      category: 'LOCATION_DISCOVERY',
      input: { userRequest, params: result.params },
      responseType: result.responseType || (result.isFollowUp ? 'LOCAL_SEARCH_FOLLOW_UP' : 'NEW_LOCAL_SEARCH'),
      presentationMode: result.presentationMode || { showBusinessList: isShowList, showMap: isShowMap },
      showMap: isShowMap,
      showBusinessList: isShowList,
      output: {
        ...result,
        queryUsed: result.params?.searchTerms?.join(', ') || result.params?.brandQuery || 'local service',
        locationUsed: result.params?.targetLocation || 'Unknown',
        providersFound: result.providersFound || result.providers?.length || 0,
        requestedCount: result.requestedCount || result.params?.targetCount || 5,
        providers: result.providers || [],
        comparisonMatrix: result.comparisonMatrix,
        recommendation: result.recommendation,
        locationData: isShowMap ? result.locationData : null,
        showMap: isShowMap,
        showBusinessList: isShowList,
        responseType: result.responseType || (result.isFollowUp ? 'LOCAL_SEARCH_FOLLOW_UP' : 'NEW_LOCAL_SEARCH'),
        presentationMode: result.presentationMode || { showBusinessList: isShowList, showMap: isShowMap },
        limitations: result.limitations,
        noContactGuarantee: result.noContactGuarantee,
        params: result.params,
        searchState: result.searchState || (isLocationRequired ? 'LOCATION_REQUIRED' : (isSearchFailed ? 'SEARCH_FAILED' : 'RESULTS_FOUND')),
        locationRequired: isLocationRequired,
        status: result.status,
      },
      providers: isShowList ? (result.providers || []) : [],
      contacts: isShowList ? (result.providers || []) : [],
      externalContacts: isShowList ? (result.providers || []) : [],
      comparisonMatrix: result.comparisonMatrix,
      locationData: isShowMap ? result.locationData : null,
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
