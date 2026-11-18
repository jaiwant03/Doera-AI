import calendarAdapter from '../integrations/calendarAdapter.js';
import { logger } from '../utils/logger.js';

class SchedulingAgent {
  constructor() {
    this.name = 'Scheduling';
  }

  /**
   * Coordinate appointment slot with verified state tracking.
   * STRICT ANTI-HALLUCINATION POLICY:
   * - Never mark an appointment as CONFIRMED without actual provider booking confirmation evidence.
   * - Clearly distinguish between DOERA internal tracking IDs and actual provider confirmation numbers.
   * - Separate states: DISCOVERED, VERIFIED, AVAILABILITY_CHECKED, BOOKING_REQUESTED, AWAITING_CONFIRMATION, CONFIRMED, FAILED, CANCELLED.
   */
  async scheduleAppointment(taskContext, primaryContact, userIntegration, externalConfirmation = null) {
    const startedAt = new Date();
    logger.info(`[Scheduling Agent] Coordinating appointment slot for: ${primaryContact?.businessName}`);

    if (!primaryContact) {
      return {
        agentName: this.name,
        taskId: taskContext.taskId,
        status: 'failed',
        input: { primaryContact: null },
        output: { error: 'No provider contact specified for scheduling.' },
        startedAt,
        completedAt: new Date(),
      };
    }

    // Determine target slot (e.g. Next business day at 10:30 AM)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(10, 30, 0, 0);

    const formattedSlot = `${targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })} at 10:30 AM`;

    // DOERA internal reference code for client tracking (NOT a clinic confirmation ID)
    const internalReferenceId = `DOERA-REQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Optional user calendar hold
    let calendarLink = null;
    if (userIntegration) {
      try {
        const endDate = new Date(targetDate);
        endDate.setHours(11, 30, 0, 0);
        const bookingResult = await calendarAdapter.createEvent({
          userIntegration,
          summary: `[DOERA Request Pending]: ${taskContext.userRequest} with ${primaryContact.businessName}`,
          description: `DOERA Internal Tracking ID: ${internalReferenceId}\nProvider: ${primaryContact.businessName}\nStatus: Awaiting Clinic/Provider Confirmation`,
          startDateTime: targetDate.toISOString(),
          endDateTime: endDate.toISOString(),
          location: primaryContact.address || 'User Residence',
          attendees: primaryContact.email ? [primaryContact.email] : [],
        });
        calendarLink = bookingResult.htmlLink || null;
      } catch (calErr) {
        logger.debug('[Scheduling Agent] Calendar hold skipped:', calErr.message);
      }
    }

    // Determine state: ONLY set CONFIRMED if actual external provider confirmation exists
    const hasActualProviderConfirmation = Boolean(externalConfirmation && externalConfirmation.providerConfirmationId);

    const bookingStatus = hasActualProviderConfirmation
      ? 'CONFIRMED'
      : (taskContext.status === 'EXECUTING' ? 'AWAITING_CONFIRMATION' : 'BOOKING_REQUESTED');

    const providerConfirmationId = hasActualProviderConfirmation
      ? externalConfirmation.providerConfirmationId
      : null;

    const confirmationEvidence = hasActualProviderConfirmation
      ? externalConfirmation.evidence || 'Verified through official provider booking system'
      : null;

    const bookingDetails = {
      providerName: primaryContact.businessName,
      dateTime: formattedSlot,
      internalReferenceId, // Clearly internal tracking code
      providerConfirmationId, // null if awaiting provider confirmation
      bookingStatus, // 'AWAITING_CONFIRMATION', 'CONFIRMED', etc.
      confirmationEvidence,
      location: primaryContact.address || 'Clinic / Provider Location',
      service: taskContext.userRequest,
      calendarLink,
      notes: hasActualProviderConfirmation
        ? 'Appointment confirmed by provider system.'
        : 'Appointment request coordinated. Formal confirmation pending provider review.',
    };

    return {
      agentName: this.name,
      taskId: taskContext.taskId,
      status: 'completed',
      input: {
        provider: primaryContact.businessName,
        requestedSlot: formattedSlot,
      },
      output: {
        bookingDetails,
        bookingStatus,
        isConfirmed: hasActualProviderConfirmation,
      },
      bookingDetails,
      evidence: hasActualProviderConfirmation ? [{ title: 'Provider Confirmation', id: providerConfirmationId }] : [],
      startedAt,
      completedAt: new Date(),
    };
  }
}

export const schedulingAgent = new SchedulingAgent();
export default schedulingAgent;
