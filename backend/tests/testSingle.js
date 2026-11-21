import axios from 'axios';

async function testSinglePhoton() {
  const t0 = Date.now();
  try {
    const res = await axios.get('https://photon.komoot.io/api/?q=cinema&lat=11.0445&lon=76.9232&limit=5', {
      timeout: 5000
    });
    console.log(`[SUCCESS] Photon responded in ${Date.now() - t0}ms, found: ${res.data?.features?.length}`);
  } catch (e) {
    console.log(`[FAILED] Photon error in ${Date.now() - t0}ms:`, e.message);
  }
}

testSinglePhoton();
