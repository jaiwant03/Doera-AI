import axios from 'axios';

async function testMirrors() {
  const mirrors = [
    'https://nominatim.openstreetmap.de/search?format=json&q=theatre+Coimbatore&limit=3',
    'https://nominatim.openstreetmap.de/reverse?format=json&lat=11.0445&lon=76.9232',
  ];

  for (const m of mirrors) {
    try {
      const res = await axios.get(m, {
        headers: { 'User-Agent': 'DOERA-LocalResearch/2.0 (contact@doera.ai)', Accept: 'application/json' },
        timeout: 5000,
      });
      console.log(`[SUCCESS] ${m} -> Status ${res.status}:`, Array.isArray(res.data) ? res.data.length + ' results' : res.data?.display_name);
    } catch (e) {
      console.log(`[FAILED] ${m} ->`, e.response?.status || e.message);
    }
  }
}

testMirrors();
