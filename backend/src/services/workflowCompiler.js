import llmService from './llmService.js';
import { v4 as uuidv4 } from 'uuid';

class WorkflowCompiler {
  async compileFromPrompt(userPrompt, userId) {
    const systemPrompt = `You are the DOERA AI Workflow Automation Architect. Convert the user's natural language request into a valid JSON automation workflow containing triggers, conditions, and actions. Output pure JSON only.`;

    const instructions = `Request: "${userPrompt}"

Output JSON Format:
{
  "name": "Concise workflow title",
  "description": "What this automation does",
  "trigger": {
    "type": "schedule | event | webhook | follow_up",
    "cronExpression": "0 9 * * 1 (or null)",
    "intervalHours": 24 (or null)
  },
  "actions": [
    {
      "type": "SEND_NOTIFICATION | SEND_EMAIL | DISPATCH_AGENT",
      "params": {
        "message": "Notification or summary text",
        "subject": "Email subject if applicable"
      }
    }
  ]
}`;

    try {
      const parsed = await llmService.generate({
        systemPrompt,
        userPrompt: instructions,
        jsonMode: true,
        temperature: 0.1,
      });

      return {
        ...parsed,
        workflowId: `wf-${uuidv4().substring(0, 8)}`,
        userId,
        status: 'active',
        nextRunAt: new Date(Date.now() + 3600000), // First run in 1 hour
      };
    } catch (_) {
      return {
        workflowId: `wf-${uuidv4().substring(0, 8)}`,
        userId,
        name: userPrompt.substring(0, 40),
        description: userPrompt,
        trigger: { type: 'schedule', intervalHours: 24 },
        actions: [{ type: 'SEND_NOTIFICATION', params: { message: userPrompt } }],
        status: 'active',
        nextRunAt: new Date(Date.now() + 24 * 3600000),
      };
    }
  }
}

export const workflowCompiler = new WorkflowCompiler();
export default workflowCompiler;
