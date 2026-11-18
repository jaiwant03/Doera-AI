export const PLAN_LIMITS = {
  free: 20,
  pro: 300,
  max: 500,
};

export const PLAN_ENTITLEMENTS = {
  free: {
    planKey: 'free',
    name: 'DOERA Free',
    monthlyPriceUsd: 0,
    annualPriceUsd: 0,
    requestLimit: 20, // 20 requests per day (automatically resets daily)
    dailyLimit: 20,
    interval: 'day',
    modelsAllowed: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    maxAttachments: 2,
    maxFileSizeMb: 5,
    webResearch: false,
    deepResearch: false,
    voiceSynthesis: false,
    agentSwarm: false,
    scheduledAutomations: false,
    priorityQueue: false,
  },
  pro: {
    planKey: 'pro',
    name: 'DOERA Pro',
    monthlyPriceUsd: 12,
    annualPriceUsd: 120, // $10/mo billed annually
    requestLimit: 300, // 300 requests per day (automatically resets daily)
    dailyLimit: 300,
    interval: 'day',
    modelsAllowed: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gpt-4o-mini'],
    maxAttachments: 5,
    maxFileSizeMb: 25,
    webResearch: true,
    deepResearch: false,
    voiceSynthesis: true,
    agentSwarm: true,
    scheduledAutomations: false,
    priorityQueue: false,
  },
  max: {
    planKey: 'max',
    name: 'DOERA Max',
    monthlyPriceUsd: 25,
    annualPriceUsd: 240, // $20/mo billed annually
    requestLimit: 500, // 500 requests per day (automatically resets daily)
    dailyLimit: 500,
    interval: 'day',
    modelsAllowed: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gpt-4o-mini', 'gpt-4o'],
    maxAttachments: 10,
    maxFileSizeMb: 100,
    webResearch: true,
    deepResearch: true,
    voiceSynthesis: true,
    agentSwarm: true,
    scheduledAutomations: true,
    priorityQueue: true,
  },
};

export const getPlanEntitlements = (planName = 'free') => {
  return PLAN_ENTITLEMENTS[planName.toLowerCase()] || PLAN_ENTITLEMENTS.free;
};

export default PLAN_ENTITLEMENTS;
