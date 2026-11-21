import axios from 'axios';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

async function testMobileDistances() {
  const centerLat = 11.0445;
  const centerLng = 76.9232;
  const terms = ['mobile repair', 'phone repair', 'mobile service', 'mobile repair shop'];
  const candidates = [];
  const seen = new Set();

  for (const t of terms) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(t + ' Coimbatore')}&lat=${centerLat}&lon=${centerLng}&limit=15`;
    const res = await axios.get(url);
    const feats = res.data?.features || [];
    for (const f of feats) {
      const name = f.properties?.name;
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      const [lon, lat] = f.geometry.coordinates;
      const dist = haversine(centerLat, centerLng, lat, lon);
      candidates.push({
        name,
        lat,
        lon,
        dist,
        address: [name, f.properties.street, f.properties.district, f.properties.city, f.properties.state].filter(Boolean).join(', ')
      });
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  console.log(`Discovered ${candidates.length} unique mobile repair places:`);
  candidates.slice(0, 10).forEach((c, i) => {
    console.log(`${i + 1}. ${c.name} - ${c.dist} km - ${c.address}`);
  });
}

testMobileDistances();
