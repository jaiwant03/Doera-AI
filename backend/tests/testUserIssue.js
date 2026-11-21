import localServiceResearcher from '../src/services/localServiceResearcher.js';
import { buildUniversalResponse } from '../src/services/universalResponseBuilder.js';

async function testUserScenario() {
  const userLoc = {
    lat: 11.0445,
    lng: 76.9232,
    accuracy: 20,
    source: 'precise'
  };

  console.log('--- TEST A: "find 5 theatres near me" with (11.0445, 76.9232) ---');
  const resA = await localServiceResearcher.researchLocalServices({
    taskId: 'test-user-theatres',
    userRequest: 'find 5 theatres near me',
    userLocation: userLoc,
    category: 'LOCATION_DISCOVERY',
  });
  console.log('Result A status:', resA.status, 'searchState:', resA.searchState, 'providersFound:', resA.providersFound);
  const respA = buildUniversalResponse({
    category: 'LOCATION_DISCOVERY',
    userRequest: 'find 5 theatres near me',
    discoveredData: { localService: resA },
  });
  console.log('Response A output:\n', respA);

  console.log('\n--- TEST B: "find 5 mobile phone service center near me" with (11.0445, 76.9232) ---');
  const resB = await localServiceResearcher.researchLocalServices({
    taskId: 'test-user-mobile',
    userRequest: 'find 5 mobile phone service center near me',
    userLocation: userLoc,
    category: 'LOCATION_DISCOVERY',
  });
  console.log('Result B status:', resB.status, 'searchState:', resB.searchState, 'providersFound:', resB.providersFound);
  const respB = buildUniversalResponse({
    category: 'LOCATION_DISCOVERY',
    userRequest: 'find 5 mobile phone service center near me',
    discoveredData: { localService: resB },
  });
  console.log('Response B output:\n', respB);
}

testUserScenario();
