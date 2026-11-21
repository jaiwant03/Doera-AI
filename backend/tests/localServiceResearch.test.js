import assert from 'assert';
import localServiceResearcher from '../src/services/localServiceResearcher.js';
import { buildLocalServiceResearchResponse, buildUniversalResponse } from '../src/services/universalResponseBuilder.js';

console.log('=================================================================');
console.log(' DOERA AI — LOCAL SERVICE RESEARCH 12-POINT VERIFICATION TEST SUITE');
console.log('=================================================================\n');

// Mock User Coordinates for testing near-me (e.g., Coimbatore central coordinates)
const coimbatoreUserLocation = {
  lat: 11.0168,
  lng: 76.9558,
  accuracy: 15,
  name: 'Ward 51, Central Zone, Coimbatore',
  source: 'precise',
};

async function runTestSuite() {
  // -------------------------------------------------------------
  // TEST 1: Find 5 cinema theatres near me
  // -------------------------------------------------------------
  console.log('--- TEST 1: Find 5 cinema theatres near me ---');
  const taskContext1 = {
    taskId: 'test-1-cinemas-near-me',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const result1 = await localServiceResearcher.researchLocalServices(taskContext1);
  console.log(`Providers found for Test 1: ${result1.providersFound} (requested: ${result1.requestedCount})`);

  assert.strictEqual(result1.status, 'completed', 'Test 1 status must be completed');
  assert.ok(result1.providersFound > 0, 'Test 1 must return real cinema providers');
  assert.strictEqual(result1.requestedCount, 5, 'Requested count must be 5');

  const task1 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext1.userRequest,
    discoveredData: { localService: result1 },
    externalContacts: result1.providers,
    locationData: result1.locationData,
  };

  const response1 = buildUniversalResponse(task1);
  console.log('Test 1 Response Preview (First 350 chars):');
  console.log(response1.slice(0, 350) + '...\n');

  assert.ok(response1.includes('# Cinema Theatres Near You'), 'Header must be # Cinema Theatres Near You');
  assert.ok(response1.includes('**Search location:**'), 'Must contain **Search location:**');
  assert.ok(response1.includes('(Device Location)'), 'Location must be explicitly labelled as (Device Location)');
  assert.ok(response1.includes('**Search radius:** 15 km'), 'Search radius must be 15 km');
  assert.ok(response1.includes('### Search results'), 'Must have ### Search results');
  assert.ok(response1.includes('**Distance**:'), 'Must include calculated Distance');
  assert.ok(response1.includes('[Get Directions]'), 'Must include Directions link');
  assert.ok(response1.includes('### Recommendation'), 'Must include Recommendation');
  assert.ok(response1.includes('Research completed. No business was contacted and no booking or transaction was made.'), 'Must have research-only guarantee');
  assert.ok(!response1.includes('Evidence & Verification Dimensions'), 'Must NOT have Evidence & Verification Dimensions');
  assert.ok(!response1.includes('SOURCE_FOUND'), 'Must NOT have SOURCE_FOUND');
  assert.ok(!response1.includes('your location'), 'Must NEVER display placeholder "your location"');
  console.log('  ✓ PASS: Test 1 (Find 5 cinema theatres near me)\n');

  // -------------------------------------------------------------
  // TEST 2: Find 3 hospitals near me
  // -------------------------------------------------------------
  console.log('--- TEST 2: Find 3 hospitals near me ---');
  const taskContext2 = {
    taskId: 'test-2-hospitals-near-me',
    userRequest: 'Find 3 hospitals near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const result2 = await localServiceResearcher.researchLocalServices(taskContext2);
  console.log(`Providers found for Test 2: ${result2.providersFound} (requested: ${result2.requestedCount})`);

  assert.strictEqual(result2.status, 'completed');
  assert.ok(result2.providersFound > 0);
  assert.strictEqual(result2.requestedCount, 3, 'Requested count must be 3');
  assert.ok(result2.providers.length <= 3, 'Providers count must be at most 3');

  const task2 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext2.userRequest,
    discoveredData: { localService: result2 },
    externalContacts: result2.providers,
    locationData: result2.locationData,
  };

  const response2 = buildUniversalResponse(task2);
  assert.ok(response2.includes('# Hospitals Near You'), 'Header must be # Hospitals Near You');
  assert.ok(response2.includes('**Search location:**'));
  assert.ok(response2.includes('(Device Location)'));
  assert.ok(response2.includes('### Search results'));
  assert.ok(!response2.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test 2 (Find 3 hospitals near me)\n');

  // -------------------------------------------------------------
  // TEST 3: Find 5 restaurants near me
  // -------------------------------------------------------------
  console.log('--- TEST 3: Find 5 restaurants near me ---');
  const taskContext3 = {
    taskId: 'test-3-restaurants-near-me',
    userRequest: 'Find 5 restaurants near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const result3 = await localServiceResearcher.researchLocalServices(taskContext3);
  console.log(`Providers found for Test 3: ${result3.providersFound} (requested: ${result3.requestedCount})`);

  assert.strictEqual(result3.status, 'completed');
  assert.ok(result3.providersFound > 0);

  const task3 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext3.userRequest,
    discoveredData: { localService: result3 },
    externalContacts: result3.providers,
    locationData: result3.locationData,
  };

  const response3 = buildUniversalResponse(task3);
  assert.ok(response3.includes('# Restaurants Near You'), 'Header must be # Restaurants Near You');
  assert.ok(response3.includes('**Search location:**'));
  assert.ok(response3.includes('### Search results'));
  assert.ok(!response3.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test 3 (Find 5 restaurants near me)\n');

  // -------------------------------------------------------------
  // TEST 4: Find KG Cinemas near me
  // -------------------------------------------------------------
  console.log('--- TEST 4: Find KG Cinemas near me ---');
  const taskContext4 = {
    taskId: 'test-4-kg-cinemas-near-me',
    userRequest: 'Find KG Cinemas near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const result4 = await localServiceResearcher.researchLocalServices(taskContext4);
  console.log(`Providers found for Test 4: ${result4.providersFound}`);
  assert.strictEqual(result4.status, 'completed');
  assert.ok(result4.providersFound > 0);

  const hasKGCinemas = result4.providers.some(p => p.businessName.toLowerCase().includes('kg'));
  console.log(`Found KG Cinema: ${hasKGCinemas} (${result4.providers[0]?.businessName})`);
  assert.ok(hasKGCinemas, 'Must find KG Cinema near Coimbatore coordinates');

  const task4 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext4.userRequest,
    discoveredData: { localService: result4 },
    externalContacts: result4.providers,
    locationData: result4.locationData,
  };

  const response4 = buildUniversalResponse(task4);
  assert.ok(response4.includes('# KG Cinemas Near You'), 'Header must be # KG Cinemas Near You');
  assert.ok(response4.includes('KG Big Cinema') || response4.includes('KG Cinema'), 'Must list KG Cinema');
  assert.ok(!response4.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test 4 (Find KG Cinemas near me)\n');

  // -------------------------------------------------------------
  // TEST 5: Find 5 cinema theatres in Coimbatore
  // -------------------------------------------------------------
  console.log('--- TEST 5: Find 5 cinema theatres in Coimbatore ---');
  const taskContext5 = {
    taskId: 'test-5-cinemas-in-coimbatore',
    userRequest: 'Find 5 cinema theatres in Coimbatore',
    userLocation: null, // No GPS, explicit city specified
    category: 'LOCATION_DISCOVERY',
  };

  const result5 = await localServiceResearcher.researchLocalServices(taskContext5);
  console.log(`Providers found for Test 5: ${result5.providersFound} in ${result5.params.targetLocation}`);

  assert.strictEqual(result5.status, 'completed');
  assert.ok(result5.providersFound > 0);
  assert.strictEqual(result5.params.locationSource, 'user_specified');

  const task5 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext5.userRequest,
    discoveredData: { localService: result5 },
    externalContacts: result5.providers,
    locationData: result5.locationData,
  };

  const response5 = buildUniversalResponse(task5);
  assert.ok(response5.includes('# Cinema Theatres in Coimbatore'), 'Header must specify city');
  assert.ok(response5.includes('(User Specified)'), 'Must indicate user-specified location');
  assert.ok(response5.includes('### Search results'));
  assert.ok(!response5.includes('Evidence & Verification Dimensions'));
  console.log('  ✓ PASS: Test 5 (Find 5 cinema theatres in Coimbatore)\n');

  // -------------------------------------------------------------
  // TEST 6: Find cinemas near Gandhipuram, Coimbatore
  // -------------------------------------------------------------
  console.log('--- TEST 6: Find cinemas near Gandhipuram, Coimbatore ---');
  const taskContext6 = {
    taskId: 'test-6-cinemas-gandhipuram',
    userRequest: 'Find cinemas near Gandhipuram, Coimbatore',
    userLocation: null,
    category: 'LOCATION_DISCOVERY',
  };

  const result6 = await localServiceResearcher.researchLocalServices(taskContext6);
  console.log(`Providers found for Test 6: ${result6.providersFound} near ${result6.params.targetLocation}`);

  assert.strictEqual(result6.status, 'completed');
  assert.ok(result6.providersFound > 0);
  assert.strictEqual(result6.params.locationSource, 'user_specified');
  assert.ok(result6.params.targetLocation.toLowerCase().includes('gandhipuram'), 'Target location must resolve Gandhipuram');

  const task6 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext6.userRequest,
    discoveredData: { localService: result6 },
    externalContacts: result6.providers,
    locationData: result6.locationData,
  };

  const response6 = buildUniversalResponse(task6);
  assert.ok(response6.includes('# Cinema Theatres in Gandhipuram'), 'Header must contain Gandhipuram');
  assert.ok(response6.includes('(User Specified)'), 'Location must be explicitly labelled as User Specified');
  assert.ok(response6.includes('### Search results'));
  console.log('  ✓ PASS: Test 6 (Find cinemas near Gandhipuram, Coimbatore)\n');

  // -------------------------------------------------------------
  // TEST 7: Search when location permission is denied
  // -------------------------------------------------------------
  console.log('--- TEST 7: Search when location permission is denied ---');
  const taskContext7 = {
    taskId: 'test-7-permission-denied',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: { denied: true, source: 'denied' },
    category: 'LOCATION_DISCOVERY',
  };

  const result7 = await localServiceResearcher.researchLocalServices(taskContext7);
  console.log(`Status for Test 7: ${result7.status}`);

  assert.strictEqual(result7.status, 'LOCATION_REQUIRED', 'Must return LOCATION_REQUIRED status');
  assert.strictEqual(result7.searchState, 'LOCATION_REQUIRED');

  const task7 = {
    category: 'LOCATION_DISCOVERY',
    status: 'LOCATION_REQUIRED',
    userRequest: taskContext7.userRequest,
    discoveredData: { localService: result7 },
  };

  const response7 = buildUniversalResponse(task7);
  console.log(`Response 7 message: "${response7}"`);
  assert.strictEqual(
    response7,
    "I couldn't determine your current location. Please enter your area or city so I can find nearby cinema theatres.",
    'Must cleanly prompt for location when denied'
  );
  console.log('  ✓ PASS: Test 7 (Location Permission Denied prompt)\n');

  // -------------------------------------------------------------
  // TEST 8: Search when location coordinates are unavailable
  // -------------------------------------------------------------
  console.log('--- TEST 8: Search when location coordinates are unavailable ---');
  const taskContext8 = {
    taskId: 'test-8-coords-unavailable',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: { unavailable: true, source: 'unavailable' },
    category: 'LOCATION_DISCOVERY',
  };

  const result8 = await localServiceResearcher.researchLocalServices(taskContext8);
  console.log(`Status for Test 8: ${result8.status}`);

  assert.strictEqual(result8.status, 'LOCATION_REQUIRED');
  assert.strictEqual(result8.searchState, 'LOCATION_REQUIRED');

  const task8 = {
    category: 'LOCATION_DISCOVERY',
    status: 'LOCATION_REQUIRED',
    userRequest: taskContext8.userRequest,
    discoveredData: { localService: result8 },
  };

  const response8 = buildUniversalResponse(task8);
  assert.strictEqual(
    response8,
    "I couldn't determine your current location. Please enter your area or city so I can find nearby cinema theatres.",
    'Must cleanly prompt for location when coordinates unavailable'
  );
  console.log('  ✓ PASS: Test 8 (Location Coordinates Unavailable prompt)\n');

  // -------------------------------------------------------------
  // TEST 9: Search when the business provider returns zero results
  // -------------------------------------------------------------
  console.log('--- TEST 9: Search when the business provider returns zero results ---');
  const taskContext9 = {
    taskId: 'test-9-zero-results',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: coimbatoreUserLocation,
    simulateZeroResults: true,
    category: 'LOCATION_DISCOVERY',
  };

  const result9 = await localServiceResearcher.researchLocalServices(taskContext9);
  console.log(`Search state for Test 9: ${result9.searchState}`);

  assert.strictEqual(result9.searchState, 'NO_RESULTS');
  assert.strictEqual(result9.providersFound, 0);

  const task9 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext9.userRequest,
    discoveredData: { localService: result9 },
    externalContacts: [],
  };

  const response9 = buildUniversalResponse(task9);
  console.log(`Response 9 message: "${response9}"`);
  assert.ok(
    response9.includes("I searched for cinema theatres around") &&
    response9.includes("within 15 km, but couldn't find matching results. You can try a wider search radius or another area."),
    'Must return accurate zero-results message per Section 7'
  );
  console.log('  ✓ PASS: Test 9 (Zero Results Message)\n');

  // -------------------------------------------------------------
  // TEST 10: Search when the business provider returns an error
  // -------------------------------------------------------------
  console.log('--- TEST 10: Search when the business provider returns an error ---');
  const taskContext10 = {
    taskId: 'test-10-provider-error',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: coimbatoreUserLocation,
    simulateProviderError: true,
    category: 'LOCATION_DISCOVERY',
  };

  const result10 = await localServiceResearcher.researchLocalServices(taskContext10);
  console.log(`Status for Test 10: ${result10.status}, searchState: ${result10.searchState}`);

  assert.strictEqual(result10.status, 'SEARCH_FAILED');
  assert.strictEqual(result10.searchState, 'SEARCH_FAILED');

  const task10 = {
    category: 'LOCATION_DISCOVERY',
    status: 'SEARCH_FAILED',
    userRequest: taskContext10.userRequest,
    discoveredData: { localService: result10 },
    externalContacts: [],
  };

  const response10 = buildUniversalResponse(task10);
  console.log(`Response 10 message: "${response10}"`);
  assert.strictEqual(
    response10,
    "I couldn't complete the cinema search because the business search service is currently unavailable. Please try again.",
    'Must return service unavailable message per Section 7'
  );
  console.log('  ✓ PASS: Test 10 (Provider Error Message)\n');

  // -------------------------------------------------------------
  // TEST 11: Search when the provider returns fewer than five results
  // -------------------------------------------------------------
  console.log('--- TEST 11: Search when provider returns fewer than 5 results ---');
  const mockThreeCinemas = [
    {
      businessName: 'Maruti Theatre',
      address: 'Bashyakarlu Road, Vadakovai, Coimbatore',
      distanceKm: '1.2 km',
      rating: null,
      phone: null,
      website: null,
      directionsUrl: 'https://maps.google.com/?q=11.018,76.945',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://nominatim.openstreetmap.org/ui/details.html?osmid=1',
    },
    {
      businessName: 'Ganga Yamuna Kaveri Theatre',
      address: 'Gandhipuram, Coimbatore',
      distanceKm: '1.7 km',
      rating: null,
      phone: null,
      website: null,
      directionsUrl: 'https://maps.google.com/?q=11.018,76.970',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://nominatim.openstreetmap.org/ui/details.html?osmid=2',
    },
    {
      businessName: 'Senthil Kumaran Theatres',
      address: 'Ramnagar, Coimbatore',
      distanceKm: '1.7 km',
      rating: null,
      phone: null,
      website: null,
      directionsUrl: 'https://maps.google.com/?q=11.010,76.969',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://nominatim.openstreetmap.org/ui/details.html?osmid=3',
    },
  ];

  const taskContext11 = {
    taskId: 'test-11-partial-results',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: coimbatoreUserLocation,
    simulatePartialResults: true,
    mockProviders: mockThreeCinemas,
    category: 'LOCATION_DISCOVERY',
  };

  const result11 = await localServiceResearcher.researchLocalServices(taskContext11);
  console.log(`Providers found for Test 11: ${result11.providersFound}, searchState: ${result11.searchState}`);

  assert.strictEqual(result11.searchState, 'PARTIAL_RESULTS');
  assert.strictEqual(result11.providersFound, 3);

  const task11 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext11.userRequest,
    discoveredData: { localService: result11 },
    externalContacts: result11.providers,
  };

  const response11 = buildUniversalResponse(task11);
  assert.ok(response11.includes('**Results:** 3 cinema theatres found'), 'Must state 3 cinema theatres found');
  assert.ok(response11.includes('*Note: Only 3 cinema theatres were found within the 15 km search radius.*'), 'Must explain partial results');
  assert.ok(response11.includes('1. **Maruti Theatre**'));
  assert.ok(response11.includes('2. **Ganga Yamuna Kaveri Theatre**'));
  assert.ok(response11.includes('3. **Senthil Kumaran Theatres**'));
  console.log('  ✓ PASS: Test 11 (Partial Results Explanation)\n');

  // -------------------------------------------------------------
  // TEST 12: Search when provider returns results but some lack ratings or contact details
  // -------------------------------------------------------------
  console.log('--- TEST 12: Search with unlisted ratings or contact details ---');
  const taskContext12 = {
    taskId: 'test-12-unlisted-details',
    userRequest: 'Find 5 cinema theatres near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const result12 = await localServiceResearcher.researchLocalServices(taskContext12);
  const task12 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext12.userRequest,
    discoveredData: { localService: result12 },
    externalContacts: result12.providers,
  };

  const response12 = buildUniversalResponse(task12);
  assert.ok(
    response12.includes('Not publicly listed in open directory'),
    'Must display "Not publicly listed in open directory" without fabricating false ratings or numbers'
  );
  assert.ok(
    response12.includes('Website not listed') || response12.includes('[http'),
    'Must handle unlisted websites honestly without fabricating URLs'
  );
  console.log('  ✓ PASS: Test 12 (Honest handling of unlisted ratings and contact details)\n');

  // -------------------------------------------------------------
  // TEST 13: Find 5 laptop service centers near me (GPS Coordinates)
  // -------------------------------------------------------------
  console.log('--- TEST 13: Find 5 laptop service centers near me (GPS Location) ---');
  const taskContext13 = {
    taskId: 'test-13-laptop-services-near-me',
    userRequest: 'find 5 laptop service centers near me',
    userLocation: coimbatoreUserLocation,
    category: 'LOCATION_DISCOVERY',
  };

  const result13 = await localServiceResearcher.researchLocalServices(taskContext13);
  console.log(`Providers found for Test 13: ${result13.providersFound} (requested: ${result13.requestedCount})`);
  assert.strictEqual(result13.status, 'completed', 'Test 13 status must be completed');
  assert.ok(result13.providersFound > 0, 'Test 13 must return real laptop/computer service providers');

  const task13 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext13.userRequest,
    discoveredData: { localService: result13 },
    externalContacts: result13.providers,
    locationData: result13.locationData,
  };

  const response13 = buildUniversalResponse(task13);
  assert.ok(response13.includes('# Laptop Repair Centres Near You'), 'Header must be # Laptop Repair Centres Near You');
  assert.ok(response13.includes('**Search location:**'), 'Must contain **Search location:**');
  assert.ok(response13.includes('### Search results'), 'Must have ### Search results');
  console.log('  ✓ PASS: Test 13 (Find 5 laptop service centers near me - GPS Location)\n');

  // -------------------------------------------------------------
  // TEST 14: Find 5 laptop service centers near me (City Location Without GPS Coordinates)
  // -------------------------------------------------------------
  console.log('--- TEST 14: Find 5 laptop service centers near me (City Location Without GPS) ---');
  const taskContext14 = {
    taskId: 'test-14-laptop-services-city-only',
    userRequest: 'find 5 laptop service centers near me',
    userLocation: {
      status: 'resolved',
      name: 'Coimbatore, Tamil Nadu',
      source: 'user_selected',
    },
    category: 'LOCATION_DISCOVERY',
  };

  const result14 = await localServiceResearcher.researchLocalServices(taskContext14);
  console.log(`Providers found for Test 14: ${result14.providersFound} (requested: ${result14.requestedCount})`);
  assert.strictEqual(result14.status, 'completed', 'Test 14 status must be completed without rejecting for missing GPS');
  assert.ok(result14.providersFound > 0, 'Test 14 must return real laptop/computer providers for city selection');

  const task14 = {
    category: 'LOCATION_DISCOVERY',
    userRequest: taskContext14.userRequest,
    discoveredData: { localService: result14 },
    externalContacts: result14.providers,
    locationData: result14.locationData,
  };

  const response14 = buildUniversalResponse(task14);
  assert.ok(!response14.includes("I couldn't determine your current location"), 'Must not say location unavailable when city was provided');
  assert.ok(response14.includes('### Search results'), 'Must display search results for city location');
  console.log('  ✓ PASS: Test 14 (Find 5 laptop service centers near me - City Location Without GPS)\n');

  console.log('=================================================================');
  console.log('✓ ALL 14 LOCAL SERVICE RESEARCH TESTS COMPLETED SUCCESSFULLY!');
  console.log('=================================================================');
}

runTestSuite().catch((err) => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
