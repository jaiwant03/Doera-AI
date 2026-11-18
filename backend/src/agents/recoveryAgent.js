import { logger } from '../utils/logger.js';

class RecoveryAgent {
  constructor() {
    this.name = 'Recovery';
    this.maxRetries = 3;
  }

  /**
   * Handle failure in task execution and formulate recovery path
   */
  async handleFailure(task, failedError) {
    logger.warn(`[Recovery Agent] Diagnosing failure for task ${task.taskId}: ${failedError.message}`);

    const retryCount = (task.retryCount || 0) + 1;

    // Check if retry limit reached
    if (retryCount >= this.maxRetries) {
      logger.error(`[Recovery Agent] Task ${task.taskId} exceeded max retries (${this.maxRetries}).`);
      return {
        recovered: false,
        status: 'FAILED',
        error: {
          message: `Task failed after ${this.maxRetries} automated recovery attempts. Reason: ${failedError.message}`,
          recoverable: false,
        },
      };
    }

    // Check if failure is due to missing secondary provider contact
    if (task.externalContacts && task.externalContacts.length > 1) {
      logger.info(`[Recovery Agent] Attempting failover to secondary provider: ${task.externalContacts[1].businessName}`);
      return {
        recovered: true,
        action: 'FAILOVER_SECONDARY_PROVIDER',
        newPrimaryContact: task.externalContacts[1],
        retryCount,
        instructions: 'Rerouting communication to secondary verified provider.',
      };
    }

    // Transient failure: retry current step with backoff
    return {
      recovered: true,
      action: 'RETRY_TRANSIENT_STEP',
      retryCount,
      backoffMs: 2000 * retryCount,
      instructions: 'Retrying transient network operation with exponential backoff.',
    };
  }
}

export const recoveryAgent = new RecoveryAgent();
export default recoveryAgent;
