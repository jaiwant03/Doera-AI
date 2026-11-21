import axios from 'axios';

async function testLaptopQueries() {
  const queries = [
    'https://photon.komoot.io/api/?q=computer&lat=11.0168&lon=76.9558&limit=10',
    'https://photon.komoot.io/api/?q=laptop&lat=11.0168&lon=76.9558&limit=10',
    'https://photon.komoot.io/api/?q=electronics&lat=11.0168&lon=76.9558&limit=10',
  ];

  for (const q of queries) {
    const t0 = Date.now();
    try {
      const res = await axios.get(q, { timeout: 5000 });
      console.log(`URL: ${q}\n  -> SUCCESS (${Date.now() - t0}ms), count: ${res.data.features?.length}`);
      res.data.features?.slice(0, 3).forEach(f => console.log('   *', f.properties.name, `(${f.geometry.coordinates})`));
    } catch (e) {
      console.log(`URL: ${q}\n  -> FAILED (${Date.now() - t0}ms):`, e.message);
    }
  }
}

testLaptopQueries();
