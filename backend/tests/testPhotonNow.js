import axios from 'axios';

async function testPhotonNow() {
  try {
    const res = await axios.get('https://photon.komoot.io/api/?q=cinema&lat=11.0445&lon=76.9232&limit=5', { timeout: 8000 });
    console.log('Photon status:', res.status, 'found:', res.data?.features?.length);
  } catch (e) {
    console.log('Photon failed:', e.message);
  }
}

testPhotonNow();
