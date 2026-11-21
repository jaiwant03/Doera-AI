import assert from 'assert';
import localServiceResearcher from '../src/services/localServiceResearcher.js';
import { buildUniversalResponse } from '../src/services/universalResponseBuilder.js';
import conversationContextEngine from '../src/services/conversationContextEngine.js';

async function runFollowUpTests() {
  console.log('=================================================================');
  console.log(' DOERA AI — LOCAL SERVICE RESEARCH FOLLOW-UP & CONTEXT TEST SUITE');
  console.log('=================================================================\n');

  // Sample authentic Coimbatore mobile service centres as returned from initial search
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
      address: 'AKR Mobiles, G. D. Naidu Flyover, Argus Nagar, Ward 37, East Zone, Coimbatore, Coimbatore North, Coimbatore, Tamil Nadu, 641001, India',
      location: { lat: 11.0263872, lng: 77.0195541 },
      distanceKmNum: 10.7,
      distanceKm: '10.7 km',
      distance: '10.7 km away',
      rating: null,
      reviewsCount: 0,
      phone: null,
      website: null,
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.0263872,77.0195541',
      source: 'OpenStreetMap Nominatim',
      sourceUrl: 'https://www.openstreetmap.org/?mlat=11.0263872&mlon=77.0195541',
      verificationStatus: 'CONFIRMED',
    },
  ];

  const sampleResearchResults = {
    conversationId: 'conv-test-mobile-001',
    missionId: 'MSN-MOBILE-001',
    originalQuery: 'find 5 mobile services centre near me',
    serviceCategory: 'Mobile Phone Service Centres',
    categoryTitle: 'Mobile Phone Service Centres',
    searchLocation: 'Ward 6, West Zone, Coimbatore',
    locationSource: 'device',
    searchRadius: 15,
    center: { lat: 11.0445, lng: 76.9232 },
    providers: sampleMobileProviders,
    searchCompletionStatus: 'RESULTS_FOUND',
  };

  // Seed the researcher cache
  localServiceResearcher.conversationResultsCache.set('conv-test-mobile-001', sampleResearchResults);

  // -------------------------------------------------------------
  // TEST 1: Exact User Follow-Up Scenario
  // Query: "among all these mobile centers which is closely near to me"
  // -------------------------------------------------------------
  console.log('--- TEST 1: Exact User Follow-Up Question ---');
  const res1 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'among all these mobile centers which is closely near to me',
    lastResearchResults: sampleResearchResults,
  });

  console.log('Follow-up Execution Type:', res1.executionType);
  console.log('Response Output:\n', res1.followUpAnswer);

  assert.strictEqual(res1.isFollowUp, true, 'Must be identified as follow-up');
  assert.strictEqual(res1.executionType, 'LOCAL_RESEARCH_FOLLOW_UP', 'Execution type must be LOCAL_RESEARCH_FOLLOW_UP');
  assert.ok(res1.followUpAnswer.includes('The Mobile Junction is the closest among the five mobile phone service centres you found.'), 'Must identify The Mobile Junction as closest');
  assert.ok(res1.followUpAnswer.includes('6.1 km'), 'Must display distance 6.1 km');
  assert.ok(res1.followUpAnswer.includes('Edaiyar Street'), 'Must include Edaiyar Street address');
  assert.ok(res1.followUpAnswer.includes('[Get Directions]'), 'Must include directions link');
  assert.ok(res1.followUpAnswer.includes('Research completed. No business was contacted'), 'Must have zero-transaction guarantee');

  // Verify response builder integration
  const built1 = buildUniversalResponse({
    category: 'LOCATION_DISCOVERY',
    discoveredData: { localService: res1 },
  });
  assert.ok(built1.includes('The Mobile Junction is the closest'), 'buildUniversalResponse must render followUpAnswer');
  console.log('  ✓ PASS: Test 1 (Exact User Follow-Up Question)\n');

  // -------------------------------------------------------------
  // TEST 2: Multi-Turn Conversation Flow (Test A)
  // Turn 2: "among all these mobile centers which is closely near to me"
  // Turn 3: "which one is second closest?"
  // Turn 4: "show me its address."
  // Turn 5: "give me directions to that centre."
  // -------------------------------------------------------------
  console.log('--- TEST 2: Complete 5-Turn Chained Conversation Flow (Test A) ---');

  // Turn 3: Second closest
  const resTurn3 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'which one is second closest?',
    lastResearchResults: sampleResearchResults,
  });
  console.log('Turn 3 (Second closest):\n', resTurn3.followUpAnswer);
  assert.ok(resTurn3.followUpAnswer.includes('Kishore Mobiles & Electronics is the second closest'), 'Turn 3 must identify Kishore Mobiles & Electronics as second closest');
  assert.ok(resTurn3.followUpAnswer.includes('7.1 km'), 'Turn 3 must report 7.1 km');

  // Turn 4: "show me its address" -> refers to Kishore Mobiles from Turn 3
  const resTurn4 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'show me its address.',
    lastResearchResults: sampleResearchResults,
  });
  console.log('\nTurn 4 (Show its address):\n', resTurn4.followUpAnswer);
  assert.ok(resTurn4.followUpAnswer.includes('Kishore Mobiles & Electronics'), 'Turn 4 must resolve "its" to Kishore Mobiles & Electronics');
  assert.ok(resTurn4.followUpAnswer.includes('N.H.Road, Ward 84'), 'Turn 4 must return Kishore Mobiles address');

  // Turn 5: "give me directions to that centre."
  const resTurn5 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'give me directions to that centre.',
    lastResearchResults: sampleResearchResults,
  });
  console.log('\nTurn 5 (Directions to that centre):\n', resTurn5.followUpAnswer);
  assert.ok(resTurn5.followUpAnswer.includes('Kishore Mobiles & Electronics'), 'Turn 5 must give directions to Kishore Mobiles & Electronics');
  assert.ok(resTurn5.followUpAnswer.includes('destination=10.9918897,76.9604554'), 'Turn 5 directions URL must target Kishore Mobiles coords');
  console.log('  ✓ PASS: Test 2 (5-Turn Chained Flow: Closest -> 2nd Closest -> Address -> Directions)\n');

  // -------------------------------------------------------------
  // TEST 3: Cinema Follow-up Flow (Test B)
  // -------------------------------------------------------------
  console.log('--- TEST 3: Cinema Follow-up Flow (Test B) ---');
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
      address: 'Sri Sakthi Kalpana Cinemas, Kaundampalayam - Vadavalli Road, Ward 5, Coimbatore, Tamil Nadu, 641001, India',
      location: { lat: 11.0448, lng: 76.9458 },
      distanceKmNum: 2.5,
      distanceKm: '2.5 km',
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.0448,76.9458',
    },
    {
      businessName: 'Murugan cinemas',
      address: 'Murugan cinemas, Mettupalayam-Coimbatore Road, Ward 1, Coimbatore, Tamil Nadu, 641034, India',
      location: { lat: 11.0776, lng: 76.9419 },
      distanceKmNum: 4.2,
      distanceKm: '4.2 km',
      directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=11.0776,76.9419',
    },
  ];

  const cinemaResults = {
    conversationId: 'conv-test-cinema-002',
    categoryTitle: 'Cinema Theatres',
    serviceCategory: 'Cinema Theatres',
    providers: sampleCinemas,
  };
  localServiceResearcher.conversationResultsCache.set('conv-test-cinema-002', cinemaResults);

  const resCinemaClosest = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-cinema-002',
    userRequest: 'which one is closest?',
    lastResearchResults: cinemaResults,
  });
  console.log('Cinema Closest:\n', resCinemaClosest.followUpAnswer);
  assert.ok(resCinemaClosest.followUpAnswer.includes('Krithika Cinema Hall is the closest'), 'Must identify Krithika Cinema Hall');
  assert.ok(resCinemaClosest.followUpAnswer.includes('1.2 km'), 'Must report 1.2 km');

  const resCinemaAddr = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-cinema-002',
    userRequest: 'show me the address of the closest one.',
    lastResearchResults: cinemaResults,
  });
  assert.ok(resCinemaAddr.followUpAnswer.includes('Thadagam Road, Ward 8'), 'Must return Krithika address');
  console.log('  ✓ PASS: Test 3 (Cinema Follow-up Flow: Closest & Address)\n');

  // -------------------------------------------------------------
  // TEST 4: Dynamic Follow-Up Questions (Ratings, Distance Filter, Ordinals, Comparison) (Test C)
  // -------------------------------------------------------------
  console.log('--- TEST 4: Dynamic Follow-Up Questions (Test C) ---');

  // A. Highest rating check
  const resRating = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'Which one has the highest rating?',
    lastResearchResults: sampleResearchResults,
  });
  console.log('Rating Check Output:\n', resRating.followUpAnswer);
  assert.ok(resRating.followUpAnswer.includes('do not contain public customer review ratings'), 'Must honestly explain open directory lacks public ratings');

  // B. Distance filter: within 8 km
  const resWithin8 = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'Which centres are within 8 km?',
    lastResearchResults: sampleResearchResults,
  });
  console.log('\nDistance Filter Output (within 8 km):\n', resWithin8.followUpAnswer);
  assert.ok(resWithin8.followUpAnswer.includes('The Mobile Junction'), 'Must include The Mobile Junction (6.1 km)');
  assert.ok(resWithin8.followUpAnswer.includes('Kishore Mobiles & Electronics'), 'Must include Kishore Mobiles & Electronics (7.1 km)');
  assert.ok(!resWithin8.followUpAnswer.includes('The Chennai Mobiles'), 'Must exclude The Chennai Mobiles (9.4 km > 8 km)');

  // C. Show address of third centre
  const resThird = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'Show me the address of the third centre.',
    lastResearchResults: sampleResearchResults,
  });
  console.log('\nThird Centre Address:\n', resThird.followUpAnswer);
  assert.ok(resThird.followUpAnswer.includes('The Chennai Mobiles'), 'Third centre must be The Chennai Mobiles');
  assert.ok(resThird.followUpAnswer.includes('Thiruvenkatasamy (TV Samy) Road'), 'Must contain TV Samy Road');

  // D. Compare the first and second centres
  const resCompare = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'Compare the first and second centres.',
    lastResearchResults: sampleResearchResults,
  });
  console.log('\nComparison Output:\n', resCompare.followUpAnswer);
  assert.ok(resCompare.followUpAnswer.includes('| The Mobile Junction | Kishore Mobiles & Electronics |'), 'Must build comparison table between 1 and 2');
  assert.ok(resCompare.followUpAnswer.includes('6.1 km') && resCompare.followUpAnswer.includes('7.1 km'), 'Must compare distances');

  // E. Give directions to a named business
  const resNamed = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'Give me directions to The Mobile Junction.',
    lastResearchResults: sampleResearchResults,
  });
  assert.ok(resNamed.followUpAnswer.includes('directions to **The Mobile Junction**'), 'Must give directions to The Mobile Junction');
  assert.ok(resNamed.followUpAnswer.includes('destination=10.9934,76.9612'), 'Must contain exact destination coordinates');

  // F. Cheapest question
  const resCheap = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'Which one is the cheapest?',
    lastResearchResults: sampleResearchResults,
  });
  assert.ok(resCheap.followUpAnswer.includes('do not contain public pricing or service fee schedules'), 'Must state pricing is not in open directory');
  console.log('  ✓ PASS: Test 4 (Dynamic Questions: Ratings, Distance Filter, Ordinals, Comparison, Named Directions, Price)\n');

  // -------------------------------------------------------------
  // TEST 5: Category Change Triggers New Search (Test D)
  // User previously searched mobile centres, then asks "Find five laptop repair centres near me"
  // -------------------------------------------------------------
  console.log('--- TEST 5: Category Change Triggers New Search (Test D) ---');
  const isFollowUpCatChange = localServiceResearcher.isFollowUpQuery(
    'Find five laptop repair centres near me',
    sampleResearchResults
  );
  console.log('isFollowUp for "Find five laptop repair centres near me":', isFollowUpCatChange);
  assert.strictEqual(isFollowUpCatChange, false, 'Category switch to laptop repair MUST NOT be treated as a follow-up');

  // Also test contextEngine classification
  const intentCatChange = conversationContextEngine.analyzeFollowUpIntent({
    text: 'Find five laptop repair centres near me',
    lower: 'find five laptop repair centres near me',
    hasIncomingAttachments: false,
    hasEffectiveAttachments: false,
    lastResearchResults: sampleResearchResults,
    activeCategory: 'LOCATION_DISCOVERY',
    rawMessages: [{ sender: 'user', content: 'find 5 mobile services centre near me' }],
  });
  console.log('ContextEngine followUpType for laptop switch:', intentCatChange.followUpType);
  assert.notStrictEqual(intentCatChange.followUpType, 'LOCAL_RESEARCH_FOLLOW_UP', 'ContextEngine must not classify laptop switch as local follow-up');
  console.log('  ✓ PASS: Test 5 (Category Change triggers New Search, NOT a follow-up)\n');

  // -------------------------------------------------------------
  // TEST 6: Context Survives Reload / Backend Restart (Test E)
  // Clear researcher in-memory cache, pass only persisted MongoDB record
  // -------------------------------------------------------------
  console.log('--- TEST 6: Context Survives Reload / Backend Restart (Test E) ---');
  localServiceResearcher.conversationResultsCache.clear(); // Simulate complete in-memory wipe on server restart

  const resRestart = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-test-mobile-001',
    userRequest: 'among all these mobile centers which is closely near to me',
    lastResearchResults: sampleResearchResults, // Loaded from MongoDB conversation.lastResearchResults
  });

  assert.strictEqual(resRestart.isFollowUp, true, 'Must succeed from persisted record after memory wipe');
  assert.ok(resRestart.followUpAnswer.includes('The Mobile Junction is the closest'), 'Must find closest from persisted DB record');
  console.log('  ✓ PASS: Test 6 (Survives Server Restart / In-Memory Wipe using Persisted Record)\n');

  // -------------------------------------------------------------
  // TEST 7: Cross-Conversation Isolation (Test F)
  // Conversation 2 has no prior search; asking "which of these is closest" must NOT access Conversation 1
  // -------------------------------------------------------------
  console.log('--- TEST 7: Cross-Conversation Isolation (Test F) ---');
  const resIsolated = await localServiceResearcher.researchLocalServices({
    conversationId: 'conv-different-002', // Completely different conversation with no research
    userRequest: 'among all these mobile centers which is closely near to me',
    lastResearchResults: null,
  });

  console.log('Isolated Conversation Response:\n', resIsolated.followUpAnswer);
  assert.ok(resIsolated.followUpAnswer.includes("I don't have any previous business search results in this conversation"), 'Must NOT access another conversation results');
  assert.strictEqual(resIsolated.providers.length, 0, 'Must have zero providers');
  console.log('  ✓ PASS: Test 7 (Cross-Conversation Isolation Verified)\n');

  console.log('=================================================================');
  console.log('✓ ALL 7 LOCAL SERVICE RESEARCH FOLLOW-UP TESTS PASSED 100%!');
  console.log('=================================================================\n');
}

runFollowUpTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
