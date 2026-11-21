import axios from 'axios';

async function testSingleNominatim() {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search?format=json&q=cinema+in+Coimbatore&limit=2', {
      headers: {
        'User-Agent': 'DOERA-Assistant/1.0 (support@doera.ai)',
        'Accept': 'application/json',
      },
      timeout: 6000
    });
    console.log('Status:', res.status, 'found:', res.data?.length);
  } catch (e) {
    console.log('Nominatim failed:', e.response?.status || e.message);
  }
}

testSingleNominatim();
