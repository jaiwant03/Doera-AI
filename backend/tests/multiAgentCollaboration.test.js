import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import missionCoordinatorService from '../src/services/missionCoordinatorService.js';
import planningAgent from '../src/agents/planningAgent.js';
import budgetAgent from '../src/agents/budgetAgent.js';
import communicationAgent from '../src/agents/communicationAgent.js';
import verificationAgent from '../src/agents/verificationAgent.js';
import universalIntentService, { CATEGORIES } from '../src/services/universalIntentService.js';
import buildUniversalResponse from '../src/services/universalResponseBuilder.js';
import agentGraph from '../src/workflows/agentGraph.js';

describe('DOERA AI — Dynamic Multi-Agent Collaboration and Intelligent Planning Engine', () => {
  beforeAll(() => {
    jest.setTimeout(120000);
  });

  // Test 1: Complex Multi-Agent Planning Demonstration (College Hackathon)
  it('1. should execute dynamic multi-agent collaboration for hackathon planning with Planning, Budget, Communication, and Verification agents', async () => {
    const userRequest = 'I want to organize a two-day college hackathon for 100 participants with a budget of ₹50,000. Prepare a complete execution plan.';

    const result = await missionCoordinatorService.coordinateMission({
      taskId: 'test-hackathon-001',
      userRequest,
      attachments: [],
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('completed');
    expect(result.selectedAgents).toContain('Planning');
    expect(result.selectedAgents).toContain('Budget');
    expect(result.selectedAgents).toContain('Communication');
    expect(result.selectedAgents).toContain('Verification');

    // 1. Planning Agent verification
    const planning = result.planning?.plan || result.planning?.output || result.planning;
    expect(planning).toBeDefined();
    expect(planning.scale?.participants).toBe(100);
    expect(planning.phases.length).toBeGreaterThanOrEqual(3);
    expect(planning.schedule.length).toBeGreaterThanOrEqual(2);
    expect(planning.schedule[0].day).toBe('Day 1');
    expect(planning.schedule[1].day).toBe('Day 2');
    expect(planning.volunteers.length).toBeGreaterThanOrEqual(4);
    expect(planning.risks.length).toBeGreaterThanOrEqual(3);

    // 2. Budget Agent verification (Deterministic math & constraints)
    const budget = result.budget?.budget || result.budget?.output || result.budget;
    expect(budget).toBeDefined();
    expect(budget.budgetConstraint).toBe(50000);
    expect(budget.calculatedTotal).toBeLessThanOrEqual(50000);
    expect(budget.mathVerified).toBe(true);
    expect(budget.lineItems.length).toBeGreaterThanOrEqual(4);

    // Contingency buffer check (>= 5%)
    const contingencyItem = budget.lineItems.find((li) => /contingency|emergency|reserve/i.test(li.category || li.item));
    expect(contingencyItem).toBeDefined();
    expect(Number(contingencyItem.amount)).toBeGreaterThanOrEqual(2500); // 5% of 50000 is 2500

    // 3. Communication Agent verification (3 complete drafts)
    const comm = result.communication;
    expect(comm).toBeDefined();
    expect(comm.drafts.length).toBe(3);
    const institutionalDraft = comm.drafts.find((d) => d.type === 'INSTITUTIONAL_APPROVAL');
    const sponsorDraft = comm.drafts.find((d) => d.type === 'SPONSOR_OUTREACH');
    const participantDraft = comm.drafts.find((d) => d.type === 'PARTICIPANT_ANNOUNCEMENT');

    expect(institutionalDraft).toBeDefined();
    expect(sponsorDraft).toBeDefined();
    expect(participantDraft).toBeDefined();
    expect(institutionalDraft.content).toContain('100');

    // 4. Verification Agent verification (Cross-agent audit dimensions)
    const verification = result.verification;
    expect(verification).toBeDefined();
    expect(verification.status).toBe('completed');
    expect(verification.allTasksSucceeded).toBe(true);

    const mathAudit = verification.verificationDimensions.find((d) => d.dimension === 'Budget Mathematical Audit');
    const scheduleAudit = verification.verificationDimensions.find((d) => d.dimension === 'Schedule & Milestone Audit');
    expect(mathAudit).toBeDefined();
    expect(mathAudit.status).toBe('VERIFIED');
    expect(scheduleAudit).toBeDefined();
    expect(scheduleAudit.status).toBe('VERIFIED');
  }, 90000);

  // Test 2: Dynamic Agent Selection (Never assign every request to all agents)
  it('2. should dynamically select strictly relevant agents and avoid launching unnecessary agents', async () => {
    // 2A. Image Request -> Vision + Verification ONLY
    const imageAgents = missionCoordinatorService.selectRelevantAgents(
      'Analyze this UI mockup and suggest accessibility improvements.',
      { primaryCategory: CATEGORIES.IMAGE_ANALYSIS },
      [{ name: 'mockup.png', type: 'image/png' }]
    );
    expect(imageAgents).toEqual(['Vision', 'Verification']);
    expect(imageAgents).not.toContain('Planning');
    expect(imageAgents).not.toContain('Budget');
    expect(imageAgents).not.toContain('Communication');

    // 2B. Spreadsheet Request -> DataAnalysis + Verification ONLY
    const spreadsheetAgents = missionCoordinatorService.selectRelevantAgents(
      'Calculate quarterly profit margins and generate chart.',
      { primaryCategory: CATEGORIES.DATA_ANALYSIS },
      [{ name: 'sales.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }]
    );
    expect(spreadsheetAgents).toEqual(['DataAnalysis', 'Verification']);
    expect(spreadsheetAgents).not.toContain('Planning');
    expect(spreadsheetAgents).not.toContain('Communication');

    // 2C. Local Service Research -> LocalService + Location + Comparison + Verification
    const localAgents = missionCoordinatorService.selectRelevantAgents(
      'Find five laptop repair centres in Coimbatore that provide Dell display replacement.',
      { primaryCategory: CATEGORIES.LOCATION_DISCOVERY },
      []
    );
    expect(localAgents).toContain('LocalService');
    expect(localAgents).toContain('Location');
    expect(localAgents).toContain('Comparison');
    expect(localAgents).toContain('Verification');
    expect(localAgents).not.toContain('Planning');
    expect(localAgents).not.toContain('Budget');

    // 2D. Simple General Question -> 0 specialized agents (direct answer)
    const generalAgents = missionCoordinatorService.selectRelevantAgents(
      'What is the speed of light in a vacuum?',
      { primaryCategory: CATEGORIES.GENERAL_QUESTION },
      []
    );
    expect(generalAgents).toEqual([]);
  });

  // Test 3: Inter-Agent Task-to-Task Data Passing
  it('3. should pass upstream Planning data into Budget and Communication agents seamlessly', async () => {
    // Step 1: Planning Agent establishes scale & duration
    const planningOut = await planningAgent.planMission({
      userRequest: 'Organize a two-day robotics workshop for 80 students with a budget of ₹40,000.',
    });

    expect(planningOut.plan.scale.participants).toBe(80);

    // Step 2: Budget Agent receives upstream planning scale
    const budgetOut = await budgetAgent.calculateBudget(
      { userRequest: 'Organize a two-day robotics workshop for 80 students with a budget of ₹40,000.' },
      { planning: planningOut.plan }
    );

    expect(budgetOut.budget.budgetConstraint).toBe(40000);
    expect(budgetOut.budget.participantCount).toBe(80);
    expect(budgetOut.budget.calculatedTotal).toBeLessThanOrEqual(40000);
    expect(budgetOut.budget.mathVerified).toBe(true);

    // Step 3: Communication Agent receives planning & budget
    const commOut = await communicationAgent.prepareMissionCommunications(
      { userRequest: 'Organize a two-day robotics workshop for 80 students with a budget of ₹40,000.' },
      { planning: planningOut.plan, budget: budgetOut.budget }
    );

    expect(commOut.drafts.length).toBe(3);
    const approvalLetter = commOut.drafts.find((d) => d.type === 'INSTITUTIONAL_APPROVAL');
    expect(approvalLetter.content).toMatch(/80|40,000/);
  }, 90000);

  // Test 4: General Knowledge Direct Resolution without Agent Overhead
  it('4. should resolve general knowledge questions directly with zero unnecessary background agents', async () => {
    const generalQuery = 'What is the boiling point of water at sea level?';

    const result = await missionCoordinatorService.coordinateMission({
      taskId: 'test-general-001',
      userRequest: generalQuery,
      attachments: [],
    });

    expect(result.status).toBe('completed');
    expect(result.selectedAgents.length).toBe(0);
    expect(result.directAnswer).toBeDefined();
    expect(typeof result.directAnswer).toBe('string');
  }, 60000);

  // Test 5: Universal Response Generation for Mission Planning
  it('5. should generate a structured, professional markdown response with schedule tables, itemized budget, volunteer matrix, and communication suite', async () => {
    const mockTask = {
      taskId: 'test-response-001',
      userRequest: 'I want to organize a two-day college hackathon for 100 participants with a budget of ₹50,000. Prepare a complete execution plan.',
      category: 'MISSION_PLANNING',
      status: 'COMPLETED',
      discoveredData: {
        planning: {
          missionTitle: 'Two-Day National College Hackathon 2026',
          scale: { participants: 100, duration: '2 Days (36 Hours)', targetAudience: 'Engineering & CS Students' },
          phases: [
            { phase: 'Phase 1: Pre-Event Preparation', milestones: ['Venue Sanction', 'Portal Launch'] },
            { phase: 'Phase 2: Live Hackathon Execution', milestones: ['Opening Ceremony', 'Hacking Sprint', 'Pitching'] },
            { phase: 'Phase 3: Post-Event Wrap-up', milestones: ['Prize Distribution', 'Financial Audit'] },
          ],
          schedule: [
            {
              day: 'Day 1: Ideation & Architecture',
              items: [
                { time: '08:30 AM - 09:30 AM', activity: 'Registration & Breakfast', owner: 'Registration Team' },
                { time: '10:00 AM', activity: 'Hacking Begins', owner: 'Mentors' },
              ],
            },
            {
              day: 'Day 2: Final Sprint & Valedictory',
              items: [
                { time: '11:30 AM', activity: 'Code Freeze', owner: 'Tech Leads' },
                { time: '04:00 PM', activity: 'Award Ceremony', owner: 'Grand Jury' },
              ],
            },
          ],
          volunteers: [
            { team: 'Registration & Check-In', headcount: 4, responsibilities: 'Participant check-in & badges' },
            { team: 'Technical & Wi-Fi Support', headcount: 4, responsibilities: 'Network routing & lab support' },
            { team: 'Hospitality & Catering', headcount: 4, responsibilities: 'Meals & refreshments' },
            { team: 'Judge Liaison', headcount: 2, responsibilities: 'Scoring sheets & mentor schedules' },
            { team: 'Media & Stage', headcount: 2, responsibilities: 'Photography & announcements' },
          ],
          risks: [
            { risk: 'Wi-Fi Outage', probability: 'Medium', impact: 'High', mitigation: 'Backup 5G hotspots' },
            { risk: 'Power Surge', probability: 'Low', impact: 'Critical', mitigation: 'Campus generator & isolated circuits' },
          ],
        },
        budget: {
          totalBudget: 50000,
          calculatedTotal: 50000,
          budgetConstraint: 50000,
          costPerParticipant: 500,
          mathVerified: true,
          lineItems: [
            { category: 'Food & Catering', item: 'Meals & Snacks', unitCost: 220, quantity: 100, amount: 22000, sharePercentage: 44 },
            { category: 'Prizes & Recognition', item: 'Cash Prizes & Trophies', unitCost: 17000, quantity: 1, amount: 17000, sharePercentage: 34 },
            { category: 'Collateral & Kits', item: 'Badges & Stickers', unitCost: 45, quantity: 100, amount: 4500, sharePercentage: 9 },
            { category: 'Operations & Tech', item: 'Power strips & cables', unitCost: 3500, quantity: 1, amount: 3500, sharePercentage: 7 },
            { category: 'Contingency Reserve', item: 'Emergency Buffer', unitCost: 3000, quantity: 1, amount: 3000, sharePercentage: 6 },
          ],
          financialObservations: ['Allocating 44% to food requires campus dining rates.'],
          costSavingSuggestions: ['Partner with tech sponsors for free cloud credits.'],
        },
        communication: {
          drafts: [
            {
              type: 'INSTITUTIONAL_APPROVAL',
              recipient: 'The Principal',
              subject: 'Permission Request: Two-Day College Hackathon',
              content: 'Respected Principal, We request permission to organize a 2-day hackathon for 100 participants with ₹50,000 budget.',
            },
            {
              type: 'SPONSOR_OUTREACH',
              recipient: 'Corporate Sponsors',
              subject: 'Partnership Proposal: Campus Innovation Challenge',
              content: 'Dear Partner, We invite you to sponsor mentorship and prizes for 100 student innovators.',
            },
            {
              type: 'PARTICIPANT_ANNOUNCEMENT',
              recipient: 'Registered Participants',
              subject: 'Welcome to the 2-Day College Hackathon!',
              content: 'Welcome Hackers! Check-in begins at 08:30 AM on Day 1. Bring your laptops.',
            },
          ],
        },
      },
      outcome: {
        actionsPerformed: [
          'Formulated chronological 2-day hackathon execution schedule and volunteer management matrix.',
          'Constructed mathematically balanced itemized budget allocation within constraint.',
          'Drafted institutional permission letter, sponsor proposal, and onboarding communication.',
        ],
        verificationDimensions: [
          { dimension: 'Budget Mathematical Audit', status: 'VERIFIED', note: 'Allocated ₹50,000 within ₹50,000 limit.' },
          { dimension: 'Schedule & Milestone Audit', status: 'VERIFIED', note: 'Sequence verified across 2 days with zero time overlaps.' },
          { dimension: 'Deliverable Completeness', status: 'VERIFIED', note: 'Synthesized findings from all contributing specialized agents.' },
        ],
      },
    };

    const response = buildUniversalResponse(mockTask);

    expect(response).toContain('Multi-Agent Mission Execution Plan');
    expect(response).toContain('100 Participants');
    expect(response).toContain('2 Days (36 Hours)');
    expect(response).toContain('Chronological Execution Schedule');
    expect(response).toContain('Day 1: Ideation & Architecture');
    expect(response).toContain('Day 2: Final Sprint & Valedictory');
    expect(response).toContain('Itemized Financial Model & Budget Allocation');
    expect(response).toContain('₹50,000');
    expect(response).toContain('✓ VERIFIED (100% Balanced)');
    expect(response).toContain('Food & Catering');
    expect(response).toContain('Volunteer Team Organization Matrix');
    expect(response).toContain('Registration & Check-In');
    expect(response).toContain('Operational Risk Assessment & Mitigation Matrix');
    expect(response).toContain('Wi-Fi Outage');
    expect(response).toContain('Ready-to-Use Mission Communications Suite');
    expect(response).toContain('Document A: Institutional Approval Request Letter');
    expect(response).toContain('Document B: Corporate Sponsorship & Mentor Invitation Pitch');
    expect(response).toContain('Document C: Participant Announcement & Onboarding Guide');
    expect(response).toContain('Next Steps');
  });

  // Test 6: LangGraph State Machine Execution with Planning and Budget Nodes
  it('6. should successfully execute LangGraph StateGraph through planning, budget, communication, and verification nodes', async () => {
    const initialState = {
      taskId: 'test-langgraph-planning-001',
      userRequest: 'I want to organize a two-day college hackathon for 100 participants with a budget of ₹50,000. Prepare a complete execution plan.',
      category: 'MISSION_PLANNING',
      requiredAgents: ['Planner', 'Planning', 'Budget', 'Communication', 'Verification'],
      status: 'EXECUTING',
      currentAgent: 'Orchestrator',
      currentAction: 'Initiating multi-agent collaboration...',
      steps: [],
      attachments: [],
    };

    const finalState = await agentGraph.invoke(initialState);

    expect(finalState).toBeDefined();
    expect(['COMPLETED', 'PARTIALLY_COMPLETED']).toContain(finalState.status);
    expect(finalState.planningData).toBeDefined();
    expect(finalState.budgetData).toBeDefined();
    expect(finalState.communicationDrafts.length).toBeGreaterThanOrEqual(3);
    expect(finalState.outcome).toBeDefined();
    expect(finalState.outcome.verificationDimensions.length).toBeGreaterThan(0);
  }, 120000);
});
