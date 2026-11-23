import factVerificationService from '../services/factVerificationService.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Fact Verification Agent
 * Verifies statements, checks cross-source consistency, and provides transparent evidence rationales.
 */
class FactVerificationAgent {
  constructor() {
    this.name = 'FactVerificationAgent';
  }

  /**
   * Verify an empirical claim or statement
   */
  async verifyClaim(statement) {
    logger.info(`[FactVerificationAgent] Verifying claim: "${statement}"`);
    const verificationResult = await factVerificationService.verifyClaim(statement);

    return {
      agent: this.name,
      status: 'completed',
      ...verificationResult,
    };
  }
}

export const factVerificationAgent = new FactVerificationAgent();
export default factVerificationAgent;
