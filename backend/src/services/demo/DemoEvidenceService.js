/**
 * DOERA AI — Demo Evidence Service
 * Stores auditable, verifiable simulation proof in MongoDB
 * STRICT POLICY: All execution evidence is permanently labeled as simulated.
 */

import ExecutionEvidence from '../../models/ExecutionEvidence.js';
import { logger } from '../../utils/logger.js';

export class DemoEvidenceService {
  /**
   * Record simulated execution proof in MongoDB
   */
  async recordEvidence(params) {
    const {
      taskId,
      userId,
      agentName = 'Execution',
      actionType = 'SEND_OUTREACH',
      externalProvider = 'SIMULATED_GMAIL_DISPATCHER',
      verificationStatus = 'DELIVERED',
      requestSummary,
      providerResponse = {},
      demoExecutionId,
      sourceUrls = [],
      metadata = {},
    } = params;

    let cleanAgent = agentName || 'Execution';
    if (cleanAgent.includes('Communication')) cleanAgent = 'Communication';
    else if (cleanAgent.includes('Execution')) cleanAgent = 'Execution';
    else if (cleanAgent.includes('Verification')) cleanAgent = 'Verification';

    try {
      const evidence = await ExecutionEvidence.create({
        taskId,
        userId,
        agentName: cleanAgent,
        actionType,
        externalProvider,
        verificationStatus,
        requestSummary: requestSummary || `[SIMULATED] ${actionType} Execution`,
        actualProviderResponse: providerResponse,
        externalReference: demoExecutionId,
        sourceUrls,
        verificationDetails: {
          verifiedBy: 'Verification Agent (Demo Sandbox)',
          verifiedAt: new Date(),
          notes: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED. Sandbox verified.',
          isTruthful: true,
        },
        metadata: {
          ...metadata,
          demoMode: true,
          isSimulated: true,
          demoExecutionId,
          auditNote: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
        },
      });

      logger.info(`[DemoEvidenceService] Recorded simulated proof: ${evidence._id} (${demoExecutionId})`);
      return evidence;
    } catch (err) {
      logger.error('[DemoEvidenceService] Error recording evidence:', err.message);
      return null;
    }
  }
}

export const demoEvidenceService = new DemoEvidenceService();
export default demoEvidenceService;
