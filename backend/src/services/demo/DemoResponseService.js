/**
 * DOERA AI — Demo Response Service
 * Simulates realistic external vendor and client responses for follow-up tracking
 * STRICT POLICY: All generated responses are explicitly labeled as simulated.
 */

export class DemoResponseService {
  /**
   * Domain-aware realistic vendor response templates
   */
  static getDomainResponses() {
    return {
      cardiology: [
        {
          providerName: 'Apollo Speciality Cardiology Centre',
          responder: 'Dr. Venkatesh Clinic Coordinator',
          channel: 'Email',
          responseSnippet: 'We have received your consultation inquiry. Dr. Venkatesh is available this Thursday at 4:30 PM or Friday at 11:00 AM. Consultation fee is ₹800.',
          availability: ['Thursday 4:30 PM', 'Friday 11:00 AM'],
          feeEstimate: '₹800',
          status: 'RESPONSE_RECEIVED',
        },
        {
          providerName: 'Fortis Malar Heart Institute',
          responder: 'Outpatient Desk',
          channel: 'Email',
          responseSnippet: 'Slots available for Cardiac OPD on Wednesday 2:00 PM. Please bring past ECG / ECHO reports. Consultation charge: ₹1,000.',
          availability: ['Wednesday 2:00 PM'],
          feeEstimate: '₹1,000',
          status: 'RESPONSE_RECEIVED',
        },
      ],
      laptop_repair: [
        {
          providerName: 'Express Chipset & Laptop Solutions',
          responder: 'Technical Desk (Kavitha)',
          channel: 'WhatsApp',
          responseSnippet: 'Hello! For Dell XPS 15 display replacement: Original FHD IPS panel in stock (₹4,200 including fitting & 6-month warranty). Service turnaround: 3 hours.',
          availability: ['Same-day Turnaround'],
          feeEstimate: '₹4,200',
          status: 'RESPONSE_RECEIVED',
        },
        {
          providerName: 'TechCare Multi-brand Repair',
          responder: 'Customer Support',
          channel: 'Email',
          responseSnippet: 'Diagnostic inspection is complimentary if repair is undertaken. Screen panel replacement estimated at ₹3,800 + GST. 3-month warranty provided.',
          availability: ['Next-day Delivery'],
          feeEstimate: '₹3,800',
          status: 'RESPONSE_RECEIVED',
        },
      ],
      event_venue: [
        {
          providerName: 'Leela Palace Convention Hall',
          responder: 'Banquets & Conferences Manager',
          channel: 'Email',
          responseSnippet: 'Grand Ballroom is open for your college symposium on Nov 28. Capacity: 250 seated in theatre style. Full-day rental including high-lumen laser projector & audio: ₹65,000.',
          availability: ['November 28 (Available)'],
          feeEstimate: '₹65,000',
          status: 'RESPONSE_RECEIVED',
        },
        {
          providerName: 'Codissia Trade Fair Complex',
          responder: 'Events Bureau',
          channel: 'Email',
          responseSnippet: 'Hall D is available for student tech symposiums at institutional discount. Rental: ₹45,000/day. High-speed optical internet and stage acoustics included.',
          availability: ['Target Date Confirmed'],
          feeEstimate: '₹45,000',
          status: 'RESPONSE_RECEIVED',
        },
      ],
      general: [
        {
          providerName: 'Local Verified Provider',
          responder: 'Service Desk',
          channel: 'Email',
          responseSnippet: 'Thank you for reaching out. We have acknowledged your inquiry and confirmed our earliest service slot for tomorrow at 10:30 AM.',
          availability: ['Tomorrow 10:30 AM'],
          feeEstimate: '₹500 - ₹1,500',
          status: 'RESPONSE_RECEIVED',
        },
      ],
    };
  }

  /**
   * Determine query domain from text context
   */
  static detectDomain(text = '') {
    const lower = text.toLowerCase();
    if (lower.includes('cardio') || lower.includes('heart') || lower.includes('doctor') || lower.includes('clinic')) {
      return 'cardiology';
    }
    if (lower.includes('laptop') || lower.includes('repair') || lower.includes('computer') || lower.includes('screen')) {
      return 'laptop_repair';
    }
    if (lower.includes('venue') || lower.includes('hall') || lower.includes('event') || lower.includes('symposium') || lower.includes('college')) {
      return 'event_venue';
    }
    return 'general';
  }

  /**
   * Generate realistic simulated response for a task or follow-up
   */
  async generateSimulatedResponse(context = {}) {
    const {
      taskRequest = '',
      providerName = '',
      recipient = '',
      scenario = 'SUCCESS', // SUCCESS, NO_RESPONSE, or RETRY
    } = context;

    if (scenario === 'NO_RESPONSE') {
      return {
        simulated: true,
        simulationBanner: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
        status: 'NO_RESPONSE',
        providerName: providerName || 'Provider',
        responseSnippet: 'No external reply received within the observation window.',
        receivedAt: new Date().toISOString(),
      };
    }

    const domain = DemoResponseService.detectDomain(taskRequest || providerName);
    const domainList = DemoResponseService.getDomainResponses()[domain] || DemoResponseService.getDomainResponses().general;
    
    // Pick the most relevant or first template
    const template = domainList.find(t => 
      providerName && t.providerName.toLowerCase().includes(providerName.toLowerCase())
    ) || domainList[0];

    const receivedAt = new Date();

    return {
      isSimulated: true,
      simulated: true,
      simulationBanner: 'SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED',
      status: 'RESPONSE_RECEIVED',
      providerName: providerName || template.providerName,
      responder: template.responder,
      channel: template.channel,
      responseMessage: template.responseSnippet,
      availability: template.availability,
      feeEstimate: template.feeEstimate,
      receivedAt: receivedAt.toISOString(),
      auditNote: 'Simulated vendor response synthesized for hackathon demonstration. No real party was contacted.',
    };
  }
}

export const demoResponseService = new DemoResponseService();
export default demoResponseService;
