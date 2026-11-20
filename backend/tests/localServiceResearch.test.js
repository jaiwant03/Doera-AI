import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import localServiceResearcher, { VERIFICATION_STATUSES } from '../src/services/localServiceResearcher.js';
import localServiceAgent from '../src/agents/localServiceAgent.js';
import verificationAgent from '../src/agents/verificationAgent.js';
import universalIntentService from '../src/services/universalIntentService.js';
import { buildUniversalResponse } from '../src/services/universalResponseBuilder.js';

describe('DOERA AI — Live Location Intelligence & Local Service Research Suite', () => {
  // Test 1: Laptop repair in Coimbatore with Dell display replacement requirement
  it('1. should research laptop repair centres in Coimbatore and evaluate Dell display replacement without false claims', async () => {
    const prompt = 'Find five laptop repair centres in Coimbatore that provide Dell display replacement';
    const params = await localServiceResearcher.extractResearchParameters(prompt);

    expect(params.targetLocation.toLowerCase()).toContain('coimbatore');
    expect(params.targetCount).toBe(5);
    expect(params.specificRequirements.some((r) => r.toLowerCase().includes('dell'))).toBe(true);

    const result = await localServiceResearcher.researchLocalServices({ userRequest: prompt });

    expect(result.status).toBe('completed');
    expect(result.providers.length).toBeGreaterThanOrEqual(1);
    expect(result.providers.length).toBeLessThanOrEqual(5);

    // Verify service suitability analysis exists for every provider
    result.providers.forEach((provider) => {
      expect(provider.businessName).toBeDefined();
      expect(provider.address).toBeDefined();
      expect(provider.location?.lat).toBeDefined();
      expect(provider.location?.lng).toBeDefined();
      expect(typeof provider.location.lat).toBe('number');
      expect(typeof provider.location.lng).toBe('number');
      expect(provider.suitability).toBeDefined();
      expect(provider.suitabilityAnalysis).toBeDefined();
      expect(Object.values(VERIFICATION_STATUSES)).toContain(provider.verificationStatus);
    });

    // Verify that NO false claim of booking or contact is made
    expect(result.noContactGuarantee).toBe(
      'Research completed. No business was contacted and no booking or transaction was made.'
    );
  }, 25000);

  // Test 2: Different category & location — Printing shops in Gandhipuram
  it('2. should dynamically adapt to printing shops in Gandhipuram and not return laptop repair or cardiology', async () => {
    const prompt = 'Find highly rated printing shops near Gandhipuram';
    const params = await localServiceResearcher.extractResearchParameters(prompt);

    expect(params.targetLocation.toLowerCase()).toContain('gandhipuram');
    expect(params.serviceCategory.toLowerCase()).toContain('print');

    const result = await localServiceResearcher.researchLocalServices({ userRequest: prompt });

    expect(result.status).toBe('completed');
    expect(result.providers.length).toBeGreaterThan(0);

    // Verify results reflect printing and NOT cardiology
    const allNamesAndSpecs = result.providers
      .map((p) => `${p.businessName} ${p.knownSpecialties?.join(' ')} ${p.suitabilityAnalysis}`)
      .join(' ')
      .toLowerCase();

    expect(allNamesAndSpecs).not.toContain('cardiolog');
    expect(allNamesAndSpecs).not.toContain('apollo speciality hospital');
  }, 25000);

  // Test 3: Different category & location — Hospitals or educational institutions in Madurai
  it('3. should research hospitals or educational institutions in Madurai with real geographic coordinates', async () => {
    const prompt = 'Find hospitals or educational institutions in Madurai';
    const params = await localServiceResearcher.extractResearchParameters(prompt);

    expect(params.targetLocation.toLowerCase()).toContain('madurai');

    const result = await localServiceResearcher.researchLocalServices({ userRequest: prompt });

    expect(result.status).toBe('completed');
    expect(result.providers.length).toBeGreaterThan(0);

    // Verify all providers have real coordinates in or near Madurai (lat ~ 9.92, lng ~ 78.11)
    result.providers.forEach((p) => {
      expect(p.location.lat).toBeGreaterThan(9.0);
      expect(p.location.lat).toBeLessThan(11.0);
      expect(p.location.lng).toBeGreaterThan(77.0);
      expect(p.location.lng).toBeLessThan(79.0);
    });
  }, 25000);

  // Test 4: Verification status differentiation & anti-hallucination of missing details
  it('4. should clearly differentiate verification status and not fabricate missing contact numbers or ratings', async () => {
    const prompt = 'Find computer service providers in Coimbatore';
    const result = await localServiceResearcher.researchLocalServices({ userRequest: prompt });

    result.providers.forEach((p) => {
      // Status must be one of the 4 defined enum states
      expect(Object.values(VERIFICATION_STATUSES)).toContain(p.verificationStatus);

      // If phone is absent, it must be null (not a fake +91 94440 12345 placeholder)
      if (p.phone !== null) {
        expect(p.phone).not.toBe('+91 94440 12345');
        expect(p.phone).not.toBe('1234567890');
      }

      // If rating is absent, it must be null (never a math-invented rating like 4.721)
      if (p.rating !== null) {
        expect(typeof p.rating).toBe('number');
        expect(p.rating).toBeGreaterThanOrEqual(1.0);
        expect(p.rating).toBeLessThanOrEqual(5.0);
      }
    });
  }, 25000);

  // Test 5: Strict Anti-Transaction & Zero-Contact Guarantee
  it('5. should strictly enforce zero bookings, zero transactions, and zero automated contact', async () => {
    const mockTask = {
      taskId: 'task-local-research-test',
      userRequest: 'Find five laptop repair centres in Coimbatore that provide Dell display replacement',
      category: 'LOCATION_DISCOVERY',
    };

    const agentResult = await localServiceAgent.execute(mockTask);

    expect(agentResult.noContactGuarantee).toBe(
      'Research completed. No business was contacted and no booking or transaction was made.'
    );
    expect(agentResult.output.noContactGuarantee).toBe(
      'Research completed. No business was contacted and no booking or transaction was made.'
    );

    // Verification Agent audit
    const verified = await verificationAgent.verifyTask({
      taskId: mockTask.taskId,
      userRequest: mockTask.userRequest,
      category: 'LOCATION_DISCOVERY',
      externalContacts: agentResult.providers,
      discoveredData: { localService: agentResult.output },
      steps: [
        { id: 'local_service', name: 'Local service research', status: 'completed' },
        { id: 'verify', name: 'Verification', status: 'completed' },
      ],
    });

    expect(verified.outcome.booking).toBeNull();
    const zeroTxDim = verified.outcome.verificationDimensions.find((d) => d.dimension === 'Zero-Transaction Guarantee');
    expect(zeroTxDim).toBeDefined();
    expect(zeroTxDim.status).toBe('VERIFIED');
    expect(zeroTxDim.note).toContain('No business was contacted and no booking or transaction was made');
  }, 25000);

  // Test 6: Geographic Map Data Payload
  it('6. should assemble valid interactive map data payload with verified coordinates and center', async () => {
    const prompt = 'Find laptop repair centres in Coimbatore';
    const result = await localServiceResearcher.researchLocalServices({ userRequest: prompt });

    expect(result.locationData).toBeDefined();
    expect(result.locationData.type).toBe('places');
    expect(Array.isArray(result.locationData.places)).toBe(true);
    expect(result.locationData.places.length).toBeGreaterThan(0);
    expect(result.locationData.center).toBeDefined();
    expect(typeof result.locationData.center.lat).toBe('number');
    expect(typeof result.locationData.center.lng).toBe('number');

    // Each place marker must have an id, index, lat, lng, name, and address
    result.locationData.places.forEach((place, i) => {
      expect(place.index).toBe(i + 1);
      expect(place.name).toBeDefined();
      expect(place.address).toBeDefined();
      expect(typeof place.lat).toBe('number');
      expect(typeof place.lng).toBe('number');
    });
  }, 25000);

  // Test 7: Universal Response Builder renders complete comparison report with zero contact notice
  it('7. should render structured comparison report with provider comparison table, suitability, and zero-contact guarantee', async () => {
    const prompt = 'Find five laptop repair centres in Coimbatore that provide Dell display replacement';
    const result = await localServiceResearcher.researchLocalServices({ userRequest: prompt });

    const mockCompletedTask = {
      userRequest: prompt,
      category: 'LOCATION_DISCOVERY',
      status: 'COMPLETED',
      externalContacts: result.providers,
      locationData: result.locationData,
      discoveredData: { localService: result },
      comparisonMatrix: result.comparisonMatrix,
    };

    const renderedMarkdown = buildUniversalResponse(mockCompletedTask);

    // Verify all required report sections
    expect(renderedMarkdown).toContain('Local Service Research & Verified Providers');
    expect(renderedMarkdown).toContain('Provider Comparison Table');
    expect(renderedMarkdown).toContain('Verification Status');
    expect(renderedMarkdown).toContain('Service Suitability');
    expect(renderedMarkdown).toContain('Recommended Shortlist');
    expect(renderedMarkdown).toContain('Research Limitations & Scope');
    expect(renderedMarkdown).toContain('Research completed. No business was contacted and no booking or transaction was made.');

    // Verify strict prohibition: NO appointment confirmation or booking status
    expect(renderedMarkdown).not.toContain('Confirmed by Provider');
    expect(renderedMarkdown).not.toContain('Official Confirmation Reference');
    expect(renderedMarkdown).not.toContain('SIMULATED EXECUTION — NO REAL EXTERNAL ACTION PERFORMED');
  }, 25000);
});
