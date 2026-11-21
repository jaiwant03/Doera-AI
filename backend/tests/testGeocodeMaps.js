import axios from 'axios';

async function testGeocodeMapsCo() {
  try {
    const res = await axios.get('https://geocode.maps.co/search?q=cinema+Coimbatore', { timeout: 5000 });
    console.log('geocode.maps.co status:', res.status, 'results:', res.data?.length);
    res.data?.slice(0, 3).forEach(r => console.log('  *', r.display_name));
  } catch (e) {
    console.log('geocode.maps.co failed:', e.response?.status || e.message);
  }
}

testGeocodeMapsCo();
