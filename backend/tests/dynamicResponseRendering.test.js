import assert from 'assert';
import localServiceResearcher from '../src/services/localServiceResearcher.js';
import { buildUniversalResponse } from '../src/services/universalResponseBuilder.js';
import conversationContextEngine from '../src/services/conversationContextEngine.js';

async function runDynamicRenderingTests() {
  console.log('=================================================================');
  console.log(' DOERA AI — DYNAMIC RESPONSE RENDERING & CONDITIONAL MAP SUITE');
  console.log('=================================================================\n');

  // Sample authentic Coimbatore mobile service centres
  const sampleMobileProviders = [
    {
      businessName: 'The Mobile Junction',
      address: 'The Mobile Junction, Edaiyar Street, Ward 80, Central Zone, Perur, Coimbatore South, Coimbatore, Tamil Nadu, 641007, India',
      location: { lat: 10.9934, lng: 76.9612 },
      distanceKmNum: 6.1,
      distanceKm: '6.1 km',
      distance: '6.1 km away',
      rating: null,
      reviewsCount: 0,
      phone: null,
      website: null,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=10.9934,76.9612',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://www.openstreetmap.org/?mlat=10.9934&mlon=76.9612',
      verificationStatus: 'CONFIRMED',
    },
    {
      businessName: 'Kishore Mobiles & Electronics',
      address: 'Kishore Mobiles & Electronics, N.H.Road, Ward 84, Central Zone, Podanur, Coimbatore South, Coimbatore, Tamil Nadu, 641007, India',
      location: { lat: 10.9918897, lng: 76.9604554 },
      distanceKmNum: 7.1,
      distanceKm: '7.1 km',
      distance: '7.1 km away',
      rating: null,
      reviewsCount: 0,
      phone: null,
      website: null,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=10.9918897,76.9604554',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://www.openstreetmap.org/?mlat=10.9918897&mlon=76.9604554',
      verificationStatus: 'CONFIRMED',
    },
    {
      businessName: 'The Chennai Mobiles',
      address: 'The Chennai Mobiles, Thiruvenkatasamy (TV Samy) Road, Ward 23, West Zone, Perur, Coimbatore South, Coimbatore, Tamil Nadu, 641002, India',
      location: { lat: 11.0096192, lng: 76.9482085 },
      distanceKmNum: 9.4,
      distanceKm: '9.4 km',
      distance: '9.4 km away',
      rating: null,
      reviewsCount: 0,
      phone: null,
      website: null,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.0096192,76.9482085',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://www.openstreetmap.org/?mlat=11.0096192&mlon=76.9482085',
      verificationStatus: 'CONFIRMED',
    },
    {
      businessName: 'Mobile Spot',
      address: 'Mobile Spot, Ward 37, East Zone, Coimbatore North, Coimbatore, Tamil Nadu, 641001, India',
      location: { lat: 11.0261, lng: 77.0190 },
      distanceKmNum: 10.7,
      distanceKm: '10.7 km',
      distance: '10.7 km away',
      rating: null,
      reviewsCount: 0,
      phone: null,
      website: null,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.0261,77.0190',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://www.openstreetmap.org/?mlat=11.0261&mlon=77.0190',
      verificationStatus: 'CONFIRMED',
    },
    {
      businessName: 'AKR Mobiles',
      address: 'AKR Mobiles, Ward 37, East Zone, Coimbatore North, Coimbatore, Tamil Nadu, 641001, India',
      location: { lat: 11.0263, lng: 77.0192 },
      distanceKmNum: 10.7,
      distanceKm: '10.7 km',
      distance: '10.7 km away',
      rating: null,
      reviewsCount: 0,
      phone: null,
      website: null,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.0263,77.0192',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://www.openstreetmap.org/?mlat=11.0263&mlon=77.0192',
      verificationStatus: 'CONFIRMED',
    },
  ];

  const sampleLocationData = {
    type: 'places',
    places: sampleMobileProviders.map((p, idx) => ({
      id: `place-${idx + 1}`,
      index: idx + 1,
      name: p.businessName,
      address: p.address,
      lat: p.location.lat,
      lng: p.location.lng,
      distanceKm: p.distanceKm,
      directionsUrl: p.directionsUrl,
    })),
    center: { lat: 11.0096, lng: 76.9612 },
    zoom: 13,
  };

  const sampleResearchResults = {
    conversationId: 'conv-test-dynamic-001',
    missionId: 'MSN-MOBILE-DYNAMIC',
    originalQuery: 'find 5 mobile services centre near me',
    serviceCategory: 'Mobile Phone Service Centres',
    categoryTitle: 'Mobile Phone Service Centres',
    searchLocation: 'Ward 51, Central Zone, Coimbatore',
    searchRadius: 15,
    providers: sampleMobileProviders,
    locationData: sampleLocationData,
    lastFocusedBusiness: sampleMobileProviders[0],
  };

  // Seed cache for conversation
  localServiceResearcher.conversationResultsCache.set('conv-test-dynamic-001', sampleResearchResults);

  // -------------------------------------------------------------
  // TEST 1: Initial Search displays full results and geographic map
  // -------------------------------------------------------------
  console.log('--- TEST 1: Initial Local Search (Full Results + Map) ---');
  const t1Classification = localServiceResearcher.classifyLocalServiceQuery('find 5 mobile services centre near me');
  const t1Presentation = localServiceResearcher.getPresentationMode(t1Classification);
  console.log(`Response Type: ${t1Classification}`);
  console.log(`Presentation Mode:`, t1Presentation);
  assert.strictEqual(t1Classification, 'NEW_LOCAL_SEARCH', 'Initial query must be NEW_LOCAL_SEARCH');
  assert.strictEqual(t1Presentation.showBusinessList, true, 'Initial search must show business list');
  assert.strictEqual(t1Presentation.showMap, true, 'Initial search must show map');

  const res1 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-init-001',
    userRequest: 'find 5 mobile services centre near me',
    userLocation: { lat: 11.0168, lng: 76.9558, name: 'Ward 51, Central Zone, Coimbatore', source: 'precise' },
  });
  assert.strictEqual(res1.responseType, 'NEW_LOCAL_SEARCH', 'Must return responseType NEW_LOCAL_SEARCH');
  assert.strictEqual(res1.showMap, true, 'Initial search must have showMap: true');
  assert.strictEqual(res1.showBusinessList, true, 'Initial search must have showBusinessList: true');
  assert.ok(res1.locationData && res1.locationData.places.length > 0, 'Initial search must contain locationData with places');
  console.log('  ✓ PASS: TEST 1 (Initial Local Search - Full Results + Map)\n');

  // -------------------------------------------------------------
  // TEST 2: Follow-up "Among all these centres, which is closest to me?"
  // Expected: The Mobile Junction, 6.1 km. NO MAP. NO FULL 5-BUSINESS LIST.
  // -------------------------------------------------------------
  console.log('--- TEST 2: Nearest Business Follow-Up ("Which is closest to me?") ---');
  const res2 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-dynamic-001',
    userRequest: 'among all the centres which is closely near to me',
    lastResearchResults: sampleResearchResults,
  });

  console.log('Test 2 Response Type:', res2.responseType);
  console.log('Test 2 Show Map:', res2.showMap);
  console.log('Test 2 Show Business List:', res2.showBusinessList);
  console.log('Test 2 Location Data:', res2.locationData);
  console.log('Test 2 Providers Returned:', res2.providers.length);
  console.log('Test 2 Output Preview:\n', res2.followUpAnswer);

  assert.strictEqual(res2.responseType, 'NEAREST_BUSINESS_ANSWER', 'Must be classified as NEAREST_BUSINESS_ANSWER');
  assert.strictEqual(res2.showMap, false, 'Must have showMap: false');
  assert.strictEqual(res2.showBusinessList, false, 'Must have showBusinessList: false');
  assert.strictEqual(res2.locationData, null, 'locationData must be strictly null (NO MAP)');
  assert.strictEqual(res2.providers.length, 0, 'providers array must be empty to prevent repeating 5 cards');
  assert.ok(res2.followUpAnswer.includes('The Mobile Junction is the closest'), 'Must identify The Mobile Junction');
  assert.ok(res2.followUpAnswer.includes('6.1 km'), 'Must state 6.1 km');
  assert.ok(!res2.followUpAnswer.includes('5 Verified Locations Discovered'), 'Must not repeat 5 Verified Locations Discovered');
  console.log('  ✓ PASS: TEST 2 (Closest Business - Concise Answer, NO MAP, NO 5-BUSINESS LIST)\n');

  // -------------------------------------------------------------
  // TEST 3: User: "Which is second closest?"
  // Expected: Kishore Mobiles & Electronics, 7.1 km. NO MAP.
  // -------------------------------------------------------------
  console.log('--- TEST 3: Second Closest Follow-Up ---');
  const res3 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-dynamic-001',
    userRequest: 'Which one is second closest?',
    lastResearchResults: sampleResearchResults,
  });

  console.log('Test 3 Response Type:', res3.responseType);
  console.log('Test 3 Show Map:', res3.showMap);
  console.log('Test 3 Answer:\n', res3.followUpAnswer);

  assert.strictEqual(res3.responseType, 'NEAREST_BUSINESS_ANSWER', 'Must be NEAREST_BUSINESS_ANSWER');
  assert.strictEqual(res3.showMap, false, 'Must have showMap: false');
  assert.strictEqual(res3.locationData, null, 'Must have locationData: null');
  assert.ok(res3.followUpAnswer.includes('Kishore Mobiles & Electronics is the second closest'), 'Must identify Kishore Mobiles & Electronics');
  assert.ok(res3.followUpAnswer.includes('7.1 km'), 'Must report 7.1 km');
  console.log('  ✓ PASS: TEST 3 (Second Closest - Concise Answer, NO MAP)\n');

  // -------------------------------------------------------------
  // TEST 4: User: "Show me all five locations on the map."
  // Expected: Map with the five previously retrieved businesses (ZERO new API call)
  // -------------------------------------------------------------
  console.log('--- TEST 4: Explicit Map Request ("Show me all five locations on the map") ---');
  const res4 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-dynamic-001',
    userRequest: 'Show me all five locations on the map.',
    lastResearchResults: sampleResearchResults,
  });

  console.log('Test 4 Response Type:', res4.responseType);
  console.log('Test 4 Show Map:', res4.showMap);
  console.log('Test 4 Location Data Places Count:', res4.locationData?.places?.length);
  console.log('Test 4 Answer Preview:\n', res4.followUpAnswer);

  assert.strictEqual(res4.responseType, 'MAP_REQUEST', 'Must be classified as MAP_REQUEST');
  assert.strictEqual(res4.showMap, true, 'MAP_REQUEST must have showMap: true');
  assert.ok(res4.locationData !== null, 'locationData must be populated');
  assert.strictEqual(res4.locationData.places.length, 5, 'Must contain all 5 verified coordinates');
  assert.ok(res4.followUpAnswer.includes('Locations on Map'), 'Must indicate map rendering');
  console.log('  ✓ PASS: TEST 4 (Explicit Map Request - Renders Map with 5 Coordinates)\n');

  // -------------------------------------------------------------
  // TEST 5: User: "Which one has the highest rating?"
  // Expected: Honest rating assessment. NO MAP.
  // -------------------------------------------------------------
  console.log('--- TEST 5: Rating Inquiry ---');
  const res5 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-dynamic-001',
    userRequest: 'Which one has the highest rating?',
    lastResearchResults: sampleResearchResults,
  });

  console.log('Test 5 Response Type:', res5.responseType);
  console.log('Test 5 Show Map:', res5.showMap);
  assert.strictEqual(res5.responseType, 'RATING_INQUIRY', 'Must be RATING_INQUIRY');
  assert.strictEqual(res5.showMap, false, 'Rating check must have showMap: false');
  assert.strictEqual(res5.locationData, null, 'Rating check must have locationData: null');
  assert.ok(res5.followUpAnswer.includes('do not contain public customer review ratings'), 'Must honestly state directory lacks public ratings');
  console.log('  ✓ PASS: TEST 5 (Rating Inquiry - Honest Assessment, NO MAP)\n');

  // -------------------------------------------------------------
  // TEST 6: User: "Find five cinema theatres near me."
  // Expected: Category switch detected -> New cinema results and a new map containing cinema locations only
  // -------------------------------------------------------------
  console.log('--- TEST 6: Category Change to Cinema (New Results + New Map) ---');
  const isFollowUpCinema = localServiceResearcher.isFollowUpQuery(
    'Find five cinema theatres near me',
    sampleResearchResults
  );
  assert.strictEqual(isFollowUpCinema, false, 'Category switch to cinema MUST NOT be treated as a follow-up');

  const res6 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-cinema-switch',
    userRequest: 'Find five cinema theatres near me',
    userLocation: { lat: 11.0168, lng: 76.9558, name: 'Ward 51, Central Zone, Coimbatore', source: 'precise' },
  });
  console.log('Test 6 Category:', res6.params?.categoryTitle);
  console.log('Test 6 Response Type:', res6.responseType);
  console.log('Test 6 Show Map:', res6.showMap);
  assert.strictEqual(res6.params?.categoryTitle, 'Cinema Theatres', 'Must search Cinema Theatres');
  assert.strictEqual(res6.responseType, 'NEW_LOCAL_SEARCH', 'Must be NEW_LOCAL_SEARCH');
  assert.strictEqual(res6.showMap, true, 'New cinema search must have showMap: true');
  assert.ok(res6.locationData && res6.locationData.places.length > 0, 'Must have new cinema locations');
  console.log('  ✓ PASS: TEST 6 (Category Switch to Cinema - New Results & New Cinema Map)\n');

  // -------------------------------------------------------------
  // TEST 7: User: "Which cinema is closest?"
  // Expected: Krithika Cinema Hall (1.2 km). Direct answer only, NO full previous map.
  // -------------------------------------------------------------
  console.log('--- TEST 7: Which cinema is closest? ---');
  const sampleCinemas = [
    {
      businessName: 'Krithika Cinema Hall',
      address: 'Krithika Cinema Hall, Thadagam Road, Ward 8, Coimbatore, Tamil Nadu, 641001, India',
      location: { lat: 11.0342, lng: 76.9274 },
      distanceKmNum: 1.2,
      distanceKm: '1.2 km',
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.0342,76.9274',
    },
    {
      businessName: 'Sri Sakthi Kalpana Cinemas',
      address: 'Sri Sakthi Kalpana Cinemas, Kaundampalayam Road, Coimbatore, Tamil Nadu, 641001, India',
      location: { lat: 11.0448, lng: 76.9458 },
      distanceKmNum: 2.5,
      distanceKm: '2.5 km',
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.0448,76.9458',
    },
  ];

  const cinemaResults = {
    conversationId: 'conv-test-cinema-002',
    categoryTitle: 'Cinema Theatres',
    serviceCategory: 'Cinema Theatres',
    providers: sampleCinemas,
    locationData: {
      type: 'places',
      places: sampleCinemas.map((p, i) => ({ id: `p-${i}`, name: p.businessName, lat: p.location.lat, lng: p.location.lng })),
    },
  };
  localServiceResearcher.conversationResultsCache.set('conv-test-cinema-002', cinemaResults);

  const res7 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-cinema-002',
    userRequest: 'Which cinema is closest?',
    lastResearchResults: cinemaResults,
  });

  console.log('Test 7 Response Type:', res7.responseType);
  console.log('Test 7 Show Map:', res7.showMap);
  console.log('Test 7 Location Data:', res7.locationData);
  console.log('Test 7 Answer:\n', res7.followUpAnswer);

  assert.strictEqual(res7.responseType, 'NEAREST_BUSINESS_ANSWER', 'Must be NEAREST_BUSINESS_ANSWER');
  assert.strictEqual(res7.showMap, false, 'Cinema closest follow-up must have showMap: false');
  assert.strictEqual(res7.locationData, null, 'Must have locationData: null');
  assert.ok(res7.followUpAnswer.includes('Krithika Cinema Hall is the closest'), 'Must identify Krithika Cinema Hall');
  assert.ok(res7.followUpAnswer.includes('1.2 km'), 'Must state 1.2 km');
  console.log('  ✓ PASS: TEST 7 (Which cinema is closest - Direct Answer, NO MAP)\n');

  // -------------------------------------------------------------
  // TEST 8: Reload the conversation and ask a follow-up
  // Expected: In-memory cache wiped; context restored from MongoDB persisted state; appropriate response presentation
  // -------------------------------------------------------------
  console.log('--- TEST 8: Context Persistence Across Page Reload / Backend Restart ---');
  localServiceResearcher.conversationResultsCache.clear(); // Complete in-memory wipe

  const res8 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-dynamic-001',
    userRequest: 'among all the centres which is closely near to me',
    lastResearchResults: sampleResearchResults, // Loaded from MongoDB conversation.lastResearchResults
  });

  console.log('Test 8 Response Type after memory wipe:', res8.responseType);
  console.log('Test 8 Show Map:', res8.showMap);
  assert.strictEqual(res8.isFollowUp, true, 'Must identify as follow-up from persisted state');
  assert.strictEqual(res8.responseType, 'NEAREST_BUSINESS_ANSWER', 'Must be NEAREST_BUSINESS_ANSWER');
  assert.strictEqual(res8.showMap, false, 'Must have showMap: false after reload');
  assert.strictEqual(res8.locationData, null, 'Must have locationData: null');
  assert.ok(res8.followUpAnswer.includes('The Mobile Junction is the closest'), 'Must identify closest after reload');
  console.log('  ✓ PASS: TEST 8 (Reload Conversation - Persistent Context & Appropriate Presentation)\n');

  // -------------------------------------------------------------
  // TEST 9: Per-Message Independent Map Visibility Verification (Section 6)
  // Message 1: Search -> Map
  // Message 2: Closest -> No Map
  // Message 3: Show Map -> Map
  // Message 4: Second Closest -> No Map
  // -------------------------------------------------------------
  console.log('--- TEST 9: Independent Per-Message Map Visibility (Section 6) ---');
  const msg1Map = t1Presentation.showMap;
  const msg2Map = res2.showMap;
  const msg3Map = res4.showMap;
  const msg4Map = res3.showMap;

  console.log(`Message 1 (Initial Search): showMap = ${msg1Map}`);
  console.log(`Message 2 (Which is closest): showMap = ${msg2Map}`);
  console.log(`Message 3 (Show on map): showMap = ${msg3Map}`);
  console.log(`Message 4 (Second closest): showMap = ${msg4Map}`);

  assert.strictEqual(msg1Map, true, 'Message 1 must have map');
  assert.strictEqual(msg2Map, false, 'Message 2 must NOT have map');
  assert.strictEqual(msg3Map, true, 'Message 3 must have map');
  assert.strictEqual(msg4Map, false, 'Message 4 must NOT have map');
  console.log('  ✓ PASS: TEST 9 (Per-Message Independent Map Visibility Confirmed)\n');

  console.log('=================================================================');
  console.log('✓ ALL DYNAMIC RESPONSE RENDERING & MAP CONTROL TESTS PASSED 100%!');
  console.log('=================================================================\n');
}

runDynamicRenderingTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
