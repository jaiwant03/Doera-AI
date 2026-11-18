/**
 * DOERA AI — Demo Booking Service
 * Permanent Safe Simulator for Appointment Scheduling & Calendar Bookings in Hackathon Demo Mode
 * STRICT POLICY: Never makes real calendar API bookings or creates real-world reservations.
 */

let bookingCounter = 1;

export class DemoBookingService {
  /**
   * Generate sequential demo booking identifier: DEMO-BOOKING-0001
   */
  static generateDemoId() {
    const formatted = String(bookingCounter++).padStart(4, '0');
    return `DEMO-BOOKING-${formatted}`;
  }

  /**
   * Simulate appointment scheduling
   */
  async dispatch(params) {
    const {
      providerName = 'Consultation Specialist',
      serviceType = 'General Appointment',
      startDateTime,
      endDateTime,
      target = {},
      actionPayload = {},
    } = params;

    const demoExecutionId = DemoBookingService.generateDemoId();
    const simulatedLatencyMs = Math.floor(250 + Math.random() * 150);
    const bookedAt = new Date();

    const startTime = startDateTime || actionPayload.startDateTime || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const endTime = endDateTime || actionPayload.endDateTime || new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    const effectiveProvider = target.name || providerName || 'Verified Specialist';

    const providerResponse = {
      simulated: true,
      simulationBanner: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
      executionId: demoExecutionId,
      transport: 'SIMULATED_BOOKING_GATEWAY',
      bookingStatus: 'CONFIRMED',
      reservationCode: `SLOT-${demoExecutionId.replace('DEMO-BOOKING-', '')}`,
      provider: effectiveProvider,
      service: serviceType,
      scheduledWindow: {
        start: startTime,
        end: endTime,
      },
      location: target.address || actionPayload.address || 'Clinic / Center Facility',
      calendarEventUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Appointment with ${effectiveProvider}`)}&dates=${new Date(startTime).toISOString().replace(/-|:|\.\d\d\d/g, "")}/${new Date(endTime).toISOString().replace(/-|:|\.\d\d\d/g, "")}&details=${encodeURIComponent(`Simulated DOERA AI Booking Reference: ${demoExecutionId}`)}`,
      bookedAt: bookedAt.toISOString(),
      simulatedLatencyMs,
      notes: 'Appointment slot reserved in DOERA demo sandbox. No real calendar modified.',
    };

    return {
      success: true,
      isSimulated: true,
      demoExecutionId,
      delivered: true,
      channel: 'Calendar & Scheduling Gateway (Simulated)',
      provider: 'SIMULATED_BOOKING_GATEWAY',
      providerName: effectiveProvider,
      status: 'CONFIRMED',
      externalReference: demoExecutionId,
      calendarLink: providerResponse.calendarEventUrl,
      providerResponse,
      dispatchedAt: bookedAt.toISOString(),
      completedAt: new Date(bookedAt.getTime() + simulatedLatencyMs).toISOString(),
    };
  }
}

export const demoBookingService = new DemoBookingService();
export default demoBookingService;
