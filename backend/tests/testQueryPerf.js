import axios from 'axios';

async function testQueryFormatting() {
  const t0 = Date.now();
  try {
    const res1 = await axios.get('https://photon.komoot.io/api/?q=laptop+repair+Coimbatore&limit=5', { timeout: 8000 });
    console.log('Query 1 (laptop repair Coimbatore) took:', Date.now() - t0, 'ms. Found:', res1.data.features?.length);
  } catch (e) {
    console.log('Query 1 failed:', e.message);
  }

  const t1 = Date.now();
  try {
    const res2 = await axios.get('https://photon.komoot.io/api/?q=' + encodeURIComponent('laptop repair Ward 51, Central Zone, Coimbatore') + '&limit=5', { timeout: 8000 });
    console.log('Query 2 (with Ward 51) took:', Date.now() - t1, 'ms. Found:', res2.data.features?.length);
  } catch (e) {
    console.log('Query 2 failed:', e.message);
  }
}

testQueryFormatting();
