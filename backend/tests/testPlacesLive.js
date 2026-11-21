import placesAdapter from '../src/integrations/placesAdapter.js';

async function testPlacesAdapterLive() {
  console.log('Testing placesAdapter.searchLiveWebDirectory for cinema in Coimbatore...');
  const res = await placesAdapter.searchLiveWebDirectory('cinema theatre', 'Coimbatore', 'Cinema Theatres');
  console.log(`Results: ${res.length}`);
  res.forEach((r, i) => {
    console.log(` ${i + 1}. ${r.businessName} - ${r.address} (${r.website})`);
  });

  console.log('\nTesting placesAdapter.searchLiveWebDirectory for mobile repair in Coimbatore...');
  const res2 = await placesAdapter.searchLiveWebDirectory('mobile repair center', 'Coimbatore', 'Service Centres');
  console.log(`Results: ${res2.length}`);
  res2.forEach((r, i) => {
    console.log(` ${i + 1}. ${r.businessName} - ${r.address} (${r.website})`);
  });
}

testPlacesAdapterLive();
