import orchestratorAgent from '../src/agents/orchestratorAgent.js';
import discoveryAgent from '../src/agents/discoveryAgent.js';
import quotationAgent from '../src/agents/quotationAgent.js';
import schedulingAgent from '../src/agents/schedulingAgent.js';
import verificationAgent from '../src/agents/verificationAgent.js';
import recoveryAgent from '../src/agents/recoveryAgent.js';

describe('DOERA AI — Specialized Agents Unit Tests', () => {
  it('Orchestrator Agent should classify task and create a multi-step plan', async () => {
    const plan = await orchestratorAgent.plan({
      userRequest: 'Find an electrician near me, compare quotations and arrange an appointment.',
    });

    expect(['LOCAL_SERVICE', 'LOCATION_DISCOVERY', 'SERVICE_COMPARISON']).toContain(plan.category);
    expect(plan.toolsRequired).toContain('DISCOVERY');
    expect(plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(plan.steps.some((s) => s.agent === 'Discovery')).toBe(true);
    expect(plan.steps.some((s) => s.agent === 'Scheduling')).toBe(true);
  });

  it('Discovery Agent should search and return verified real provider contacts', async () => {
    const discovery = await discoveryAgent.execute({
      userRequest: 'Find repair services in Chennai',
      category: 'REPAIR',
    });

    expect(discovery.status).toBe('completed');
    expect(discovery.providersFound).toBeGreaterThan(0);
    expect(discovery.contacts[0].businessName).toBeDefined();
    expect(discovery.contacts[0].sourceUrl).toBeDefined();
  });

  it('Quotation Agent should normalize pricing estimates without fabricated values', async () => {
    const mockContacts = [
      { businessName: 'Speedy Electricals', rating: 4.8, address: 'Anna Nagar' },
      { businessName: 'Apex Repair Hub', rating: 4.5, address: 'T Nagar' },
    ];

    const quoteResult = await quotationAgent.compareQuotes({ category: 'LOCAL_SERVICE' }, mockContacts);

    expect(quoteResult.status).toBe('completed');
    expect(quoteResult.quotations.length).toBe(2);
    expect(quoteResult.quotations[0].inspectionFee).toBeDefined();
    expect(quoteResult.quotations[0].estimatedHourly).toBeDefined();
    expect(quoteResult.recommendedProvider).toBe('Speedy Electricals');
  });

  it('Scheduling Agent should coordinate slots and return confirmed reference', async () => {
    const mockContact = {
      businessName: 'Apex Services',
      address: '10 High St, Chennai',
    };

    const sched = await schedulingAgent.scheduleAppointment(
      { userRequest: 'Fix electrical wiring', category: 'LOCAL_SERVICE' },
      mockContact,
      null
    );

    expect(sched.status).toBe('completed');
    expect(sched.bookingDetails.referenceId).toMatch(/^DOERA-/);
    expect(sched.bookingDetails.dateTime).toBeDefined();
  });

  it('Verification Agent should generate evidence-backed completion report', async () => {
    const mockTask = {
      taskId: 'test-task-123',
      userRequest: 'Find electrician and book visit',
      steps: [
        { agent: 'Discovery', status: 'completed' },
        { agent: 'Communication', status: 'completed' },
        { agent: 'Quotation', status: 'completed' },
        { agent: 'Scheduling', status: 'completed' },
        { agent: 'Verification', status: 'completed' },
      ],
      externalContacts: [
        { businessName: 'Verified Electro', sourceUrl: 'https://example.com' },
      ],
      bookingDetails: {
        dateTime: 'Tomorrow at 10:30 AM',
        referenceId: 'DOERA-BK-XYZ123',
      },
    };

    const verified = await verificationAgent.verifyTask(mockTask);

    expect(verified.verified).toBe(true);
    expect(verified.status).toBe('COMPLETED');
    expect(verified.outcome.actionsPerformed.length).toBeGreaterThan(0);
    expect(verified.outcome.booking.referenceId).toBe('DOERA-BK-XYZ123');
  });

  it('Recovery Agent should handle transient failure and enforce maximum retry limits', async () => {
    const mockTask = {
      taskId: 'retry-task-1',
      retryCount: 0,
      externalContacts: [
        { businessName: 'Provider A' },
        { businessName: 'Provider B' },
      ],
    };

    const recovery1 = await recoveryAgent.handleFailure(mockTask, new Error('Network timeout'));
    expect(recovery1.recovered).toBe(true);
    expect(recovery1.action).toBe('FAILOVER_SECONDARY_PROVIDER');

    // Simulate task with max retries exceeded
    const maxedTask = { taskId: 'maxed', retryCount: 3 };
    const recoveryFinal = await recoveryAgent.handleFailure(maxedTask, new Error('Fatal socket fault'));
    expect(recoveryFinal.recovered).toBe(false);
    expect(recoveryFinal.status).toBe('FAILED');
  });
});
