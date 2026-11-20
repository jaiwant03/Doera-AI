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

    return {
      agentName: this.name,
      taskId: taskContext.taskId,
      status: 'completed',
      category: 'LOCATION_DISCOVERY',
      input: { userRequest, params: result.params },
      output: {
        queryUsed: result.params.searchKeywords,
        locationUsed: result.params.targetLocation,
        providersFound: result.providersFound,
        requestedCount: result.requestedCount,
        providers: result.providers,
        comparisonMatrix: result.comparisonMatrix,
        recommendation: result.recommendation,
        locationData: result.locationData,
        limitations: result.limitations,
        noContactGuarantee: result.noContactGuarantee,
      },
      providers: result.providers,
      contacts: result.providers,
      externalContacts: result.providers,
      comparisonMatrix: result.comparisonMatrix,
      locationData: result.locationData,
      evidence: result.evidence,
      noContactGuarantee: result.noContactGuarantee,
      startedAt,
      completedAt,
    };
  }
}

export const localServiceAgent = new LocalServiceAgent();
export default localServiceAgent;
