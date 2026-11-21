import axios from 'axios';

async function testOverpass() {
  const query = `[out:json][timeout:15];(node["amenity"="cinema"](around:15000,11.0445,76.9232);way["amenity"="cinema"](around:15000,11.0445,76.9232););out center 10;`;
  try {
    const res = await axios.post('https://overpass-api.de/api/interpreter', 'data=' + encodeURIComponent(query), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'DOERA-AI-Local-Research/3.0 (contact@doera.ai)',
      },
      timeout: 10000,
    });
    console.log('Overpass status:', res.status, 'Elements found:', res.data.elements?.length);
    res.data.elements?.forEach((e) => {
      console.log(' - Name:', e.tags?.name, 'Lat/Lon:', e.lat || e.center?.lat, e.lon || e.center?.lon);
    });
  } catch (err) {
    console.error('Overpass error:', err.message);
  }
}

testOverpass();
