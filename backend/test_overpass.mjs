import axios from 'axios';

async function testOverpass() {
  const lat = 11.0168;
  const lng = 76.9558;
  const q = `[out:json][timeout:10];(node["amenity"="cinema"](around:15000,${lat},${lng});way["amenity"="cinema"](around:15000,${lat},${lng}););out center 10;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
  console.log('Querying Overpass API...');
  const res = await axios.get(url, { headers: { 'User-Agent': 'DOERA-AI-Research/1.0' }, timeout: 10000 });
  console.log('Status:', res.status, 'Total found:', res.data.elements?.length);
  for (const el of (res.data.elements || []).slice(0, 10)) {
    const name = el.tags?.name || 'Unnamed';
    const cLat = el.lat || el.center?.lat;
    const cLng = el.lon || el.center?.lon;
    const street = el.tags?.['addr:street'] || '';
    const city = el.tags?.['addr:city'] || '';
    console.log(`- ${name} | Lat: ${cLat}, Lng: ${cLng} | ${street} ${city}`);
  }
}

testOverpass().catch(console.error);
