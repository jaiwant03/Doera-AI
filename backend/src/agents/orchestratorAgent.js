import universalIntentService, { CATEGORIES } from '../services/universalIntentService.js';
import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

class OrchestratorAgent {
  constructor() {
    this.name = 'Orchestrator';
  }

  /**
   * Supervisor & Planner: Analyze request, classify category dynamically,
   * decide which specialized agents are required, establish subtasks and dependency graph.
   */
  async plan(taskContext) {
    const userRequest = taskContext.userRequest || '';
    const attachments = taskContext.attachments || [];
    logger.info(`[Supervisor/Planner Agent] Formulating dynamic orchestration plan for: "${userRequest}"`);

    // 1. Analyze request through Universal Intent Understanding
    const intent = await universalIntentService.understandRequest(userRequest, attachments);
    const requiredAgents = intent.requiredAgents || ['Planner', 'Research', 'Verification'];

    // 2. Formulate subtasks dynamically
    let subtasks = [];
    try {
      const systemPrompt = `You are DOERA AI's Supervisor & Planner Agent.
Formulate a minimal, efficient list of subtasks for: "${userRequest}".
Activated Agents: ${requiredAgents.join(', ')}.
Available Agents: Planner, Research, Location, Comparison, Communication, Execution, Verification, Document, DataAnalysis, FollowUp.

Output pure JSON:
{
  "summary": "Clear 1-sentence execution directive",
  "subtasks": [
    { "id": "sub_1", "title": "Analyze and plan request", "agent": "Planner", "status": "completed", "dependencies": [] },
    { "id": "sub_2", "title": "Task title", "agent": "AgentName", "status": "pending", "dependencies": ["sub_1"] }
  ]
}`;

      const planResult = await llmService.generate({
        systemPrompt,
        userPrompt: `Category: ${intent.primaryCategory}\nRequest: "${userRequest}"`,
        jsonMode: true,
        temperature: 0.1,
      });

      if (planResult && Array.isArray(planResult.subtasks) && planResult.subtasks.length > 0) {
        subtasks = planResult.subtasks;
      }
    } catch (err) {
      logger.warn('[Supervisor/Planner Agent] Subtask LLM formulation notice, using structured defaults:', err.message);
    }

    if (subtasks.length === 0) {
      subtasks = this.buildDefaultSubtasks(userRequest, requiredAgents);
    }

    // Ensure discovery agent step exists for search / discovery tasks
    if (
      (requiredAgents.includes('Location') || requiredAgents.includes('Research') || /discover|find|search|repair|electrician|plumber|clinic|doctor|venue/i.test(userRequest)) &&
      !subtasks.some((st) => st.agent === 'Discovery')
    ) {
      const idx = subtasks.findIndex((st) => st.agent === 'Research' || /find|search|discover/i.test(st.title));
      if (idx !== -1) {
        subtasks[idx].agent = 'Discovery';
      } else {
        subtasks.splice(1, 0, {
          id: 'discover',
          title: 'Discovering verified service providers',
          agent: 'Discovery',
          status: 'pending',
          dependencies: ['sub_1'],
        });
      }
    }

    const steps = subtasks.map((st) => ({
      id: st.id,
      name: st.title,
      agent: st.agent,
      status: st.status || 'pending',
      timestamp: new Date(),
    }));

    return {
      category: intent.primaryCategory,
      categories: intent.categories,
      summary: intent.primaryObjective || 'Executing dynamic multi-agent collaboration.',
      toolsRequired: ['DISCOVERY', 'COMMUNICATION', 'SCHEDULING', 'VERIFICATION', 'COMPARISON'],
      requiredAgents,
      subtasks,
      steps,
      intent,
    };
  }

  buildDefaultSubtasks(request, requiredAgents) {
    const list = [
      { id: 'understand', title: 'Request understood and plan created', agent: 'Planner', status: 'completed', dependencies: [] },
    ];

    if (requiredAgents.includes('Document')) {
      list.push({ id: 'doc', title: 'Analyzing uploaded files and documents', agent: 'Document', status: 'pending', dependencies: ['understand'] });
    }
    if (requiredAgents.includes('DataAnalysis')) {
      list.push({ id: 'data', title: 'Evaluating dataset patterns and statistical insights', agent: 'DataAnalysis', status: 'pending', dependencies: ['understand'] });
    }
    if (requiredAgents.includes('Research') || requiredAgents.includes('Location')) {
      list.push({ id: 'discover', title: 'Discovering verified providers', agent: 'Discovery', status: 'pending', dependencies: ['understand'] });
    }
    if (requiredAgents.includes('Research')) {
      list.push({ id: 'research', title: 'Gathering verified facts & directory data', agent: 'Research', status: 'pending', dependencies: ['understand'] });
    }
    if (requiredAgents.includes('Location')) {
      list.push({ id: 'location', title: 'Retrieving geographic coordinates & map layer', agent: 'Location', status: 'pending', dependencies: ['research'] });
    }
    if (requiredAgents.includes('Comparison')) {
      list.push({ id: 'compare', title: 'Comparing options against key criteria', agent: 'Comparison', status: 'pending', dependencies: ['research'] });
    }
    if (requiredAgents.includes('Communication')) {
      list.push({ id: 'communicate', title: 'Drafting message & awaiting human approval', agent: 'Communication', status: 'pending', dependencies: ['compare'] });
    }
    if (requiredAgents.includes('Execution')) {
      list.push({ id: 'execute', title: 'Dispatching authorized external operations', agent: 'Execution', status: 'pending', dependencies: ['communicate'] });
    }
    if (requiredAgents.includes('Scheduling') || requiredAgents.includes('Communication') || /appointment|book|schedule/i.test(request)) {
      list.push({ id: 'schedule', title: 'Coordinating appointment slot', agent: 'Scheduling', status: 'pending', dependencies: ['execute'] });
    }
    if (requiredAgents.includes('Verification')) {
      list.push({ id: 'verify', title: 'Auditing execution proof & verification dimensions', agent: 'Verification', status: 'pending', dependencies: [] });
    }
    if (requiredAgents.includes('FollowUp')) {
      list.push({ id: 'followup', title: 'Registering background response tracker', agent: 'FollowUp', status: 'pending', dependencies: ['verify'] });
    }

    return list;
  }
}

export const orchestratorAgent = new OrchestratorAgent();
export default orchestratorAgent;
