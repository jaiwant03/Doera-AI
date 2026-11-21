import axios from 'axios';

async function testOverpass() {
  const q = `[out:json][timeout:10];(node["amenity"="cinema"](around:15000,11.0445,76.9232););out center 5;`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.post(ep, `data=${encodeURIComponent(q)}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'DOERA-Research/1.0' },
        timeout: 6000,
      });
      console.log(`[SUCCESS] ${ep}: status ${res.status}, found: ${res.data?.elements?.length}`);
      res.data?.elements?.forEach(el => console.log('  *', el.tags?.name));
      break;
    } catch (e) {
      console.log(`[FAILED] ${ep}:`, e.response?.status || e.message);
    }
  }
}

testOverpass();
