import axios from 'axios';

async function testOverpassEndpoints() {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  // Search cinema / theatres within 15km of 11.0445, 76.9232 (Coimbatore)
  const q = `[out:json][timeout:10];(node["amenity"="cinema"](around:15000,11.0445,76.9232);way["amenity"="cinema"](around:15000,11.0445,76.9232););out center 5;`;

  for (const ep of endpoints) {
    try {
      const res = await axios.post(ep, 'data=' + encodeURIComponent(q), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'DOERA-Local-Research/1.0 (contact@doera.ai)',
        },
        timeout: 10000,
      });
      console.log(`Endpoint "${ep}" -> Status: ${res.status}, Elements: ${res.data.elements?.length}`);
      res.data.elements?.forEach((e) => {
        console.log('   - Name:', e.tags?.name, 'Coords:', e.lat || e.center?.lat, e.lon || e.center?.lon);
      });
      if (res.data.elements?.length > 0) return;
    } catch (err) {
      console.log(`Endpoint "${ep}" -> Error: ${err.message}`);
    }
  }
}

testOverpassEndpoints();
