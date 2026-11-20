import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

class PlanningAgent {
  constructor() {
    this.name = 'Planning';
  }

  /**
   * Generates structured operational plans, chronological schedules,
   * resource requirements, volunteer responsibilities, and risk management matrices.
   */
  async planMission(taskContext, upstreamData = {}) {
    const startedAt = new Date();
    const userRequest = taskContext.userRequest || '';
    logger.info(`[Planning Agent] Formulating structured execution plan for: "${userRequest}"`);

    const researchContext = upstreamData.research || taskContext.discoveredData?.research || null;

    const systemPrompt = `You are DOERA AI's Specialized Planning Agent.
Formulate a structured execution plan for: "${userRequest}".
Generate valid JSON matching this schema:
{
  "missionTitle": "Concise descriptive title of the mission",
  "objective": "Clear summary of the goal",
  "scale": {
    "participants": 100,
    "duration": "2 Days",
    "targetAudience": "College students & developers"
  },
  "phases": [
    {
      "phase": "Phase 1: Pre-Event Preparation",
      "milestones": ["Venue confirmation", "Registration portal setup", "Sponsor outreach"]
    },
    {
      "phase": "Phase 2: Live Event Execution",
      "milestones": ["Check-in", "Hacking sprints", "Mentorship reviews", "Final pitching"]
    },
    {
      "phase": "Phase 3: Post-Event Wind-down",
      "milestones": ["Prize distribution", "Feedback collection", "Financial reconciliation"]
    }
  ],
  "schedule": [
    {
      "day": "Day 1",
      "items": [
        { "time": "08:30 AM - 09:30 AM", "activity": "Participant Registration, Kit Distribution & Breakfast", "owner": "Logistics & Registration Team" },
        { "time": "09:30 AM - 10:15 AM", "activity": "Opening Ceremony & Rules Briefing", "owner": "Core Organizing Committee" },
        { "time": "10:15 AM", "activity": "Hacking Begins — Ideation & Architecture Setup", "owner": "Participants & Tech Mentors" },
        { "time": "01:00 PM - 02:00 PM", "activity": "Networking Lunch & Refreshments", "owner": "Catering & Hospitality Team" },
        { "time": "02:00 PM - 05:00 PM", "activity": "Core Prototype Development", "owner": "Participants" },
        { "time": "05:00 PM - 06:30 PM", "activity": "Mentorship Checkpoint 1 (Feasibility Review)", "owner": "Industry Mentors & Judges" },
        { "time": "08:30 PM - 09:30 PM", "activity": "Dinner & Energy Refreshments", "owner": "Catering Team" }
      ]
    },
    {
      "day": "Day 2",
      "items": [
        { "time": "08:00 AM - 09:00 AM", "activity": "Breakfast & Morning Coffee", "owner": "Hospitality Team" },
        { "time": "09:00 AM - 11:30 AM", "activity": "Final Polish & Deployment", "owner": "Participants" },
        { "time": "11:30 AM", "activity": "Code Freeze & Project Submission Deadline", "owner": "Tech Committee" },
        { "time": "12:00 PM - 02:00 PM", "activity": "Preliminary Project Demonstrations", "owner": "Judging Panel" },
        { "time": "03:00 PM - 04:30 PM", "activity": "Top 10 Finalist Presentations", "owner": "Finalist Teams & Grand Jury" },
        { "time": "04:30 PM - 05:30 PM", "activity": "Valedictory Ceremony & Prize Distribution", "owner": "Dignitaries & Core Team" }
      ]
    }
  ],
  "resources": [
    { "category": "Venue & Infrastructure", "details": "Auditorium / Hall with 100+ seating and AC" },
    { "category": "Network & Power", "details": "High-bandwidth dedicated Wi-Fi (200 Mbps) and power strips" },
    { "category": "Collateral & Kits", "details": "Participant ID badges, lanyards, stickers, certificates" }
  ],
  "volunteers": [
    { "team": "Registration & Helpdesk", "headcount": 4, "responsibilities": "Participant verification, kit distribution, check-in tracking" },
    { "team": "Technical & Network Support", "headcount": 4, "responsibilities": "Wi-Fi stability, power strip routing, portal submissions" },
    { "team": "Food & Hospitality", "headcount": 4, "responsibilities": "Meal management, drinking water supply, snacks and coffee" },
    { "team": "Judge & Mentor Coordination", "headcount": 2, "responsibilities": "Guiding industry mentors, maintaining scoring rubrics" },
    { "team": "Media & Stage", "headcount": 2, "responsibilities": "Photography, social media coverage, stage hosting" }
  ],
  "risks": [
    { "risk": "Campus Wi-Fi Dropout", "probability": "Medium", "impact": "High", "mitigation": "Arrange secondary 5G mobile hotspots and offline repository mirrors." },
    { "risk": "Power Overload", "probability": "Medium", "impact": "Critical", "mitigation": "Distribute power loads across multiple circuit breakers with generator backup." },
    { "risk": "Food / Refreshment Delay", "probability": "Low", "impact": "Medium", "mitigation": "Pre-order 10% buffer count with campus catering; schedule fixed delivery slots." }
  ]
}`;

    const userPrompt = `User Request: "${userRequest}"
Upstream Research Findings: ${researchContext ? JSON.stringify(researchContext) : 'None provided'}`;

    try {
      const plan = await llmService.generate({
        systemPrompt,
        userPrompt,
        jsonMode: true,
        temperature: 0.1,
      });

      const completedAt = new Date();

      if (plan && plan.schedule && plan.schedule.length > 0) {
        if (!plan.scale) plan.scale = {};
        plan.scale.participants = this.extractParticipantCount(userRequest);
        return {
          agentName: this.name,
          status: 'completed',
          output: plan,
          plan,
          startedAt,
          completedAt,
        };
      }
    } catch (err) {
      logger.warn('[Planning Agent] LLM generation notice, using robust structured fallback:', err.message);
    }

    // Deterministic fallback plan
    const fallbackPlan = this.buildDeterministicPlan(userRequest);
    const completedAt = new Date();

    return {
      agentName: this.name,
      status: 'completed',
      output: fallbackPlan,
      plan: fallbackPlan,
      startedAt,
      completedAt,
    };
  }

  extractParticipantCount(text) {
    const match = text.match(/(\d+)\s*(?:participants?|students?|hackers?|attendees?|delegates?|people|members?)/i);
    return match ? parseInt(match[1], 10) : 100;
  }

  buildDeterministicPlan(text) {
    const isHackathon = /hackathon|coding|competition/i.test(text);
    const participants = this.extractParticipantCount(text);
    return {
      missionTitle: isHackathon ? 'College Hackathon Operational Roadmap' : 'Project Execution Plan',
      objective: text,
      scale: {
        participants,
        duration: '2 Days',
        targetAudience: 'College students & technical innovators',
      },
      phases: [
        {
          phase: 'Phase 1: Pre-Event Preparation',
          milestones: ['Venue confirmation', 'Registration portal setup', 'Mentor recruitment', 'Catering booking'],
        },
        {
          phase: 'Phase 2: Live Execution',
          milestones: ['Check-in & Kit distribution', 'Hacking sprint kickoff', 'Mid-way mentorship', 'Final project demos'],
        },
        {
          phase: 'Phase 3: Post-Event',
          milestones: ['Award announcements', 'Participation certificates', 'Feedback audit & sponsor report'],
        },
      ],
      schedule: [
        {
          day: 'Day 1',
          items: [
            { time: '08:30 AM - 09:30 AM', activity: 'Registration & Kit Distribution', owner: 'Registration Team' },
            { time: '09:30 AM - 10:15 AM', activity: 'Inaugural Keynote & Problem Statement Release', owner: 'Organizing Leads' },
            { time: '10:15 AM', activity: 'Sprint Begins — Ideation & Architecture', owner: 'Participants' },
            { time: '01:00 PM - 02:00 PM', activity: 'Lunch & Networking', owner: 'Hospitality Team' },
            { time: '05:00 PM - 06:30 PM', activity: 'Mentorship Checkpoint 1', owner: 'Mentors & Judges' },
            { time: '08:30 PM - 09:30 PM', activity: 'Dinner & Energy Refreshments', owner: 'Hospitality Team' },
          ],
        },
        {
          day: 'Day 2',
          items: [
            { time: '08:00 AM - 09:00 AM', activity: 'Breakfast & Morning Coffee', owner: 'Hospitality Team' },
            { time: '11:30 AM', activity: 'Code Freeze & GitHub Submissions', owner: 'Technical Committee' },
            { time: '12:00 PM - 02:00 PM', activity: 'Round 1 Project Demonstrations', owner: 'Judging Panel' },
            { time: '03:00 PM - 04:30 PM', activity: 'Finalist Pitching (Auditorium)', owner: 'Top 10 Teams' },
            { time: '04:30 PM - 05:30 PM', activity: 'Award Ceremony & Valedictory', owner: 'College Leadership & Guests' },
          ],
        },
      ],
      resources: [
        { category: 'Venue', details: 'Auditorium with seating for 100 participants and judging panel.' },
        { category: 'Network', details: 'Dedicated high-speed Wi-Fi and power strips for all teams.' },
        { category: 'Hardware', details: 'Projector, audio system, wireless mics, and backup power.' },
        { category: 'Collateral', details: 'ID cards, lanyards, certificates, and event banners.' },
      ],
      volunteers: [
        { team: 'Registration & Logistics', headcount: 4, responsibilities: 'Badge distribution, check-in desk, hall logistics' },
        { team: 'Technical & Wi-Fi Support', headcount: 4, responsibilities: 'Internet bandwidth, power strips, code freeze enforcement' },
        { team: 'Food & Refreshments', headcount: 4, responsibilities: 'Meal distribution, tea/coffee counters, drinking water supply' },
        { team: 'Mentor & Judge Liaison', headcount: 2, responsibilities: 'Judge greeting, rubric score compilation, timekeeping' },
        { team: 'Media & Photography', headcount: 2, responsibilities: 'Social media updates, photography, stage coordination' },
      ],
      risks: [
        { risk: 'Internet Connectivity Loss', probability: 'Medium', impact: 'High', mitigation: 'Keep backup 5G routers ready.' },
        { risk: 'Power Load Overload', probability: 'Medium', impact: 'Critical', mitigation: 'Campus generator and multi-phase circuit routing.' },
        { risk: 'Meal Shortages', probability: 'Low', impact: 'Medium', mitigation: 'Order 10% buffer count with catering service.' },
      ],
    };
  }
}

export const planningAgent = new PlanningAgent();
export default planningAgent;
