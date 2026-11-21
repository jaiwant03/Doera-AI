import axios from 'axios';

async function testProviders() {
  const providers = [
    { name: 'OSM Nominatim', url: 'https://nominatim.openstreetmap.org/search?format=json&q=theatre+Coimbatore&limit=3' },
    { name: 'Overpass de', url: 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent('[out:json][timeout:5];(node["amenity"="cinema"](around:15000,11.0168,76.9558););out center 3;') },
    { name: 'Overpass kumi systems', url: 'https://overpass.kumi.systems/api/interpreter?data=' + encodeURIComponent('[out:json][timeout:5];(node["amenity"="cinema"](around:15000,11.0168,76.9558););out center 3;') },
    { name: 'Photon', url: 'https://photon.komoot.io/api/?q=cinema&lat=11.0168&lon=76.9558&limit=3' },
  ];

  for (const p of providers) {
    try {
      const res = await axios.get(p.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 4000
      });
      console.log(`[SUCCESS] ${p.name}: status ${res.status}`);
    } catch (e) {
      console.log(`[FAILED] ${p.name}: ${e.response?.status || e.message}`);
    }
  }
}

testProviders();
