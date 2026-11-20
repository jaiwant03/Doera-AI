import llmService from '../services/llmService.js';
import { logger } from '../utils/logger.js';

class BudgetAgent {
  constructor() {
    this.name = 'Budget';
  }

  /**
   * Calculates itemized budgets, verifies mathematical totals against constraints,
   * checks per-participant unit economics, and provides financial risk audits.
   */
  async calculateBudget(taskContext, upstreamData = {}) {
    const startedAt = new Date();
    const userRequest = taskContext.userRequest || '';
    logger.info(`[Budget Agent] Formulating financial model and budget breakdown for: "${userRequest}"`);

    const planningContext = upstreamData.planning || taskContext.discoveredData?.planning || null;

    // 1. Extract financial constraints from user prompt or defaults
    const budgetConstraint = this.extractBudgetConstraint(userRequest);
    const participantCount = this.extractParticipantCount(userRequest, planningContext);
    const totalBudget = budgetConstraint || 50000; // Default ₹50,000 as per user example

    // 2. Structured deterministic line item budgeting
    const systemPrompt = `You are DOERA AI's Specialized Budget & Financial Agent.
Your responsibility:
1. Formulate a realistic, mathematically balanced itemized budget allocation within the strict limit of ₹${totalBudget.toLocaleString()} for ${participantCount} participants.
2. Break expenses into realistic categories:
   - Food & Refreshments (Meals, snacks, tea/coffee)
   - Prizes & Awards (Winner, Runner-up, Trophies)
   - Logistics, Kits & Printing (Badges, lanyards, certificates, banners)
   - Audio/Visual & Tech Infrastructure (Cables, power strips, cloud credits)
   - Emergency Contingency Buffer (at least 5% of total budget)
3. Ensure the mathematical sum of all categories EXACTLY equals or is within ₹${totalBudget}.
4. Provide unit cost economics (cost per participant).
5. Identify financial constraints and cost-saving recommendations.

Output JSON ONLY:
{
  "totalBudget": ${totalBudget},
  "currency": "INR",
  "participantCount": ${participantCount},
  "costPerParticipant": ${Math.round(totalBudget / Math.max(participantCount, 1))},
  "lineItems": [
    {
      "category": "Food & Catering",
      "item": "2 Lunches, 1 Dinner, 2 Breakfasts & Refreshments (Institutional Rate)",
      "unitCost": 220,
      "quantity": 100,
      "amount": 22000,
      "sharePercentage": 44
    },
    {
      "category": "Prizes & Recognition",
      "item": "Winner (₹10,000) + Runner-Up (₹5,000) + Trophies (₹2,000)",
      "unitCost": 17000,
      "quantity": 1,
      "amount": 17000,
      "sharePercentage": 34
    },
    {
      "category": "Collateral & Kits",
      "item": "Lanyards, Printed ID Badges, Stickers & Certificates",
      "unitCost": 45,
      "quantity": 100,
      "amount": 4500,
      "sharePercentage": 9
    },
    {
      "category": "Operations & Tech",
      "item": "Heavy-duty power strips, HDMI cables & presentation supplies",
      "unitCost": 3500,
      "quantity": 1,
      "amount": 3500,
      "sharePercentage": 7
    },
    {
      "category": "Contingency Buffer",
      "item": "Emergency reserve for unforeseen expenses",
      "unitCost": 3000,
      "quantity": 1,
      "amount": 3000,
      "sharePercentage": 6
    }
  ],
  "financialObservations": [
    "Allocating ₹22,000 (44%) to food requires leveraging campus institutional dining rates rather than external commercial caterers.",
    "Prize pool of ₹15,000 cash + ₹2,000 trophies is competitive for a college-level event while fitting budget boundaries.",
    "Contingency reserve of ₹3,000 (6%) protects against minor last-minute logistics expenses."
  ],
  "costSavingSuggestions": [
    "Partner with tech sponsors for free cloud credits / API access to zero-out software costs.",
    "Seek college student council endorsement for free auditorium and campus audio system usage."
  ]
}`;

    let budgetData = null;
    try {
      budgetData = await llmService.generate({
        systemPrompt,
        userPrompt: `Request: "${userRequest}"\nTotal Budget: ₹${totalBudget}\nParticipants: ${participantCount}\nPlanning Details: ${planningContext ? JSON.stringify(planningContext.scale || {}) : 'None'}`,
        jsonMode: true,
        temperature: 0.1,
      });
    } catch (err) {
      logger.warn('[Budget Agent] LLM generation notice, using deterministic mathematical budget:', err.message);
    }

    if (!budgetData || !Array.isArray(budgetData.lineItems) || budgetData.lineItems.length === 0) {
      budgetData = this.buildDeterministicBudget(totalBudget, participantCount);
    }

    // Mathematical verification: Audit sum of line items deterministically
    const calculatedTotal = budgetData.lineItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const mathValid = calculatedTotal <= totalBudget;

    const completedAt = new Date();

    return {
      agentName: this.name,
      status: 'completed',
      output: {
        ...budgetData,
        calculatedTotal,
        budgetConstraint: totalBudget,
        mathVerified: mathValid,
        variance: totalBudget - calculatedTotal,
      },
      budget: {
        ...budgetData,
        calculatedTotal,
        budgetConstraint: totalBudget,
        mathVerified: mathValid,
        variance: totalBudget - calculatedTotal,
      },
      startedAt,
      completedAt,
    };
  }

  extractBudgetConstraint(text) {
    const match = text.match(/(?:budget\s*(?:of|is|:)?\s*)?(?:₹|Rs\.?|INR)\s*([\d,]+)/i) ||
                  text.match(/(?:budget\s*(?:of|is|:)?\s*)([\d,]+)\s*(?:rupees|inr)?/i);
    if (match && match[1]) {
      const num = parseInt(match[1].replace(/,/g, ''), 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 50000;
  }

  extractParticipantCount(text, planningContext) {
    if (planningContext?.scale?.participants) {
      return Number(planningContext.scale.participants);
    }
    const match = text.match(/(\d+)\s*(?:participants|attendees|students|delegates|hackers|teams)/i);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
    return 100;
  }

  buildDeterministicBudget(totalBudget = 50000, participantCount = 100) {
    const foodAmount = Math.round(totalBudget * 0.44);
    const prizeAmount = Math.round(totalBudget * 0.34);
    const kitsAmount = Math.round(totalBudget * 0.09);
    const opsAmount = Math.round(totalBudget * 0.07);
    const contingencyAmount = totalBudget - (foodAmount + prizeAmount + kitsAmount + opsAmount);

    return {
      totalBudget,
      currency: 'INR',
      participantCount,
      costPerParticipant: Math.round(totalBudget / Math.max(participantCount, 1)),
      lineItems: [
        {
          category: 'Food & Refreshments',
          item: '2 Lunches, 1 Dinner, 2 Breakfasts & Refreshments (Campus Canteen)',
          unitCost: Math.round(foodAmount / participantCount),
          quantity: participantCount,
          amount: foodAmount,
          sharePercentage: 44,
        },
        {
          category: 'Prizes & Awards',
          item: 'Cash Prizes (1st & 2nd place) + Trophies',
          unitCost: prizeAmount,
          quantity: 1,
          amount: prizeAmount,
          sharePercentage: 34,
        },
        {
          category: 'Badges, Lanyards & Kits',
          item: 'Printed Badges, Lanyards, Stickers & Certificates',
          unitCost: Math.round(kitsAmount / participantCount),
          quantity: participantCount,
          amount: kitsAmount,
          sharePercentage: 9,
        },
        {
          category: 'Technical & Stage Operations',
          item: 'Power strips, network extension cables, stage banners',
          unitCost: opsAmount,
          quantity: 1,
          amount: opsAmount,
          sharePercentage: 7,
        },
        {
          category: 'Contingency Buffer',
          item: 'Emergency logistics buffer',
          unitCost: contingencyAmount,
          quantity: 1,
          amount: contingencyAmount,
          sharePercentage: 6,
        },
      ],
      financialObservations: [
        `Total allocated expenditures exactly equal ₹${totalBudget.toLocaleString()} (100% budget adherence).`,
        `Per-participant allocation of ₹${Math.round(totalBudget / participantCount)} is optimized for a 2-day on-campus technical competition.`,
        `₹${contingencyAmount.toLocaleString()} reserved for unforeseen operational expenses.`,
      ],
      costSavingSuggestions: [
        'Engage technology sponsors for in-kind prizes (e.g. software licenses or cloud credits).',
        'Use campus Wi-Fi infrastructure to eliminate commercial internet leasing expenses.',
      ],
    };
  }
}

export const budgetAgent = new BudgetAgent();
export default budgetAgent;
