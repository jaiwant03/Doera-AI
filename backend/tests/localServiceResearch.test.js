import assert from 'assert';
import localServiceResearcher from '../src/services/localServiceResearcher.js';
import { buildLocalServiceResearchResponse, buildUniversalResponse } from '../src/services/universalResponseBuilder.js';

console.log('=================================================================');
console.log(' DOERA AI — LOCAL SERVICE RESEARCH VERIFICATION TEST SUITE');
console.log('=================================================================\n');

// Mock User Coordinates for testing near-me (e.g., Coimbatore central coordinates)
const coimbatoreUserLocation = {
  lat: 11.0168,
  lng: 76.9558,
  accuracy: 15,
  name: 'Gandhipuram, Coimbatore',
  source: 'precise',
};

async function runTestSuite() {
  // -------------------------------------------------------------
  // TEST A: Find 5 cinema theatres near me
  // -------------------------------------------------------------
  console.log('--- TEST A: Find 5 cinema theatres near me ---');
  const taskContextA = {
    taskId: 'test-cinemas-near-me',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const resultA = await localServiceResearcher.researchLocalServices(taskContextA);
  console.log(`Providers found for Test A: ${resultA.providersFound} (requested: ${resultA.requestedCount})`);

  assert.strictEqual(resultA.status, 'completed', 'Test A status must be completed');
  assert.ok(resultA.providersFound > 0, 'Test A must return real cinema providers');
  assert.strictEqual(resultA.requestedCount, 5, 'Requested count must be 5');

  const taskA = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContextA.userRequest,
    discoveredData: { localService: resultA },
    externalContacts: resultA.providers,
    locationData: resultA.locationData,
  };

  const responseA = buildUniversalResponse(taskA);
  console.log('Test A Response Preview (First 350 chars):');
  console.log(responseA.slice(0, 350) + '...\n');

  assert.ok(responseA.includes('# 5 Cinema Theatres Near You'), 'Header must be # 5 Cinema Theatres Near You');
  assert.ok(responseA.includes('### Search results'), 'Must have ### Search results');
  assert.ok(responseA.includes('Distance from user'), 'Must include calculated Distance from user');
  assert.ok(responseA.includes('[Get Directions]'), 'Must include Directions link');
  assert.ok(responseA.includes('### Recommendation'), 'Must include Recommendation');
  assert.ok(responseA.includes('Research completed. No business was contacted and no booking or transaction was made.'), 'Must have research-only guarantee');
  assert.ok(!responseA.includes('Evidence & Verification Dimensions'), 'Must NOT have Evidence & Verification Dimensions');
  assert.ok(!responseA.includes('SOURCE_FOUND'), 'Must NOT have SOURCE_FOUND');
  console.log('  ✓ PASS: Test A (Find 5 cinema theatres near me)\n');

  // -------------------------------------------------------------
  // TEST B: Find 3 hospitals near me
  // -------------------------------------------------------------
  console.log('--- TEST B: Find 3 hospitals near me ---');
  const taskContextB = {
    taskId: 'test-hospitals-near-me',
    userRequest: 'Find 3 hospitals near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const resultB = await localServiceResearcher.researchLocalServices(taskContextB);
  console.log(`Providers found for Test B: ${resultB.providersFound} (requested: ${resultB.requestedCount})`);

  assert.strictEqual(resultB.status, 'completed');
  assert.ok(resultB.providersFound > 0);
  assert.strictEqual(resultB.requestedCount, 3, 'Requested count must be 3');
  assert.ok(resultB.providers.length <= 3, 'Providers count must be at most 3');

  const taskB = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContextB.userRequest,
    discoveredData: { localService: resultB },
    externalContacts: resultB.providers,
    locationData: resultB.locationData,
  };

  const responseB = buildUniversalResponse(taskB);
  assert.ok(responseB.includes('# 3 Hospitals Near You'), 'Header must be # 3 Hospitals Near You');
  assert.ok(responseB.includes('### Search results'));
  assert.ok(!responseB.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test B (Find 3 hospitals near me)\n');

  // -------------------------------------------------------------
  // TEST C: Find 5 restaurants near me
  // -------------------------------------------------------------
  console.log('--- TEST C: Find 5 restaurants near me ---');
  const taskContextC = {
    taskId: 'test-restaurants-near-me',
    userRequest: 'Find 5 restaurants near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const resultC = await localServiceResearcher.researchLocalServices(taskContextC);
  console.log(`Providers found for Test C: ${resultC.providersFound} (requested: ${resultC.requestedCount})`);

  assert.strictEqual(resultC.status, 'completed');
  assert.ok(resultC.providersFound > 0);

  const taskC = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContextC.userRequest,
    discoveredData: { localService: resultC },
    externalContacts: resultC.providers,
    locationData: resultC.locationData,
  };

  const responseC = buildUniversalResponse(taskC);
  assert.ok(responseC.includes('# 5 Restaurants Near You'), 'Header must be # 5 Restaurants Near You');
  assert.ok(responseC.includes('### Search results'));
  assert.ok(!responseC.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test C (Find 5 restaurants near me)\n');

  // -------------------------------------------------------------
  // TEST D: Find KG Cinemas near me
  // -------------------------------------------------------------
  console.log('--- TEST D: Find KG Cinemas near me ---');
  const taskContextD = {
    taskId: 'test-kg-cinemas-near-me',
    userRequest: 'Find KG Cinemas near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const resultD = await localServiceResearcher.researchLocalServices(taskContextD);
  console.log(`Providers found for Test D: ${resultD.providersFound}`);
  assert.strictEqual(resultD.status, 'completed');
  assert.ok(resultD.providersFound > 0);

  const hasKGCinemas = resultD.providers.some(p => p.businessName.toLowerCase().includes('kg'));
  console.log(`Found KG Cinema: ${hasKGCinemas} (${resultD.providers[0]?.businessName})`);
  assert.ok(hasKGCinemas, 'Must find KG Cinema near Coimbatore coordinates');

  const taskD = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContextD.userRequest,
    discoveredData: { localService: resultD },
    externalContacts: resultD.providers,
    locationData: resultD.locationData,
  };

  const responseD = buildUniversalResponse(taskD);
  assert.ok(responseD.includes('# KG Cinemas Near You'), 'Header must be # KG Cinemas Near You');
  assert.ok(responseD.includes('KG Big Cinema') || responseD.includes('KG Cinema'), 'Must list KG Cinema');
  assert.ok(!responseD.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test D (Find KG Cinemas near me)\n');

  // -------------------------------------------------------------
  // TEST E: Find 5 cinema theatres in Coimbatore
  // -------------------------------------------------------------
  console.log('--- TEST E: Find 5 cinema theatres in Coimbatore ---');
  const taskContextE = {
    taskId: 'test-cinemas-in-coimbatore',
    userRequest: 'Find 5 cinema theatres in Coimbatore',
    userLocation: null, // No GPS, explicit city specified
    category: 'LOCATION_DISCOVERY',
  };

  const resultE = await localServiceResearcher.researchLocalServices(taskContextE);
  console.log(`Providers found for Test E: ${resultE.providersFound} in ${resultE.params.targetLocation}`);

  assert.strictEqual(resultE.status, 'completed');
  assert.ok(resultE.providersFound > 0);
  assert.strictEqual(resultE.params.locationSource, 'city_specified');

  const taskE = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContextE.userRequest,
    discoveredData: { localService: resultE },
    externalContacts: resultE.providers,
    locationData: resultE.locationData,
  };

  const responseE = buildUniversalResponse(taskE);
  assert.ok(responseE.includes('# 5 Cinema Theatres in Coimbatore'), 'Header must specify city');
  assert.ok(responseE.includes('### Search results'));
  assert.ok(!responseE.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test E (Find 5 cinema theatres in Coimbatore)\n');

  // -------------------------------------------------------------
  // TEST F: Find 5 cinema theatres near me when location permission is denied
  // -------------------------------------------------------------
  console.log('--- TEST F: Find 5 cinema theatres near me (Permission Denied) ---');
  const taskContextF = {
    taskId: 'test-cinemas-denied',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: { denied: true, source: 'denied' },
    category: 'LOCATION_DISCOVERY',
  };

  const resultF = await localServiceResearcher.researchLocalServices(taskContextF);
  console.log(`Status for Test F: ${resultF.status}`);

  assert.strictEqual(resultF.status, 'LOCATION_REQUIRED', 'Must return LOCATION_REQUIRED status');
  assert.strictEqual(resultF.locationRequired, true);

  const taskF = {
    category: 'LOCATION_DISCOVERY',
    status: 'LOCATION_REQUIRED',
    userRequest: taskContextF.userRequest,
    discoveredData: { localService: resultF },
  };

  const responseF = buildUniversalResponse(taskF);
  console.log(`Response F message: "${responseF}"`);
  assert.strictEqual(
    responseF,
    'DOERA needs your location to find nearby places accurately. Please enable location access or enter your area or city.',
    'Must cleanly prompt for location when denied'
  );
  assert.ok(!responseF.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test F (Location Permission Denied prompt)\n');

  console.log('========================================================');
  console.log('✓ ALL 6 LOCAL SERVICE RESEARCH ACCEPTANCE TESTS PASSED!');
  console.log('========================================================');
}

runTestSuite().catch((err) => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
