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

async function testMobileClean() {
  const center = { lat: 11.0445, lng: 76.9232 };
  const targetCity = 'Coimbatore';
  const radiusKm = 15;
  const maxDist = Math.max(radiusKm * 2, 35); // 35 km
  const terms = ['mobile repair', 'mobile service', 'phone repair', 'mobiles', 'electronics repair'];
  const candidates = [];
  const seen = new Set();

  for (const t of terms) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(t + ' ' + targetCity)}&lat=${center.lat}&lon=${center.lng}&limit=15`;
    const res = await axios.get(url);
    const feats = res.data?.features || [];
    for (const f of feats) {
      const name = f.properties?.name;
      if (!name || name.toLowerCase() === 'undefined' || seen.has(name.toLowerCase())) continue;
      const [lon, lat] = f.geometry.coordinates;
      const dist = haversine(center.lat, center.lng, lat, lon);
      if (dist > maxDist) continue; // Discard places outside search area!
      seen.add(name.toLowerCase());
      candidates.push({ name, dist, coords: [lat, lon] });
    }
  }

  candidates.sort((a, b) => a.dist - b.dist);
  console.log(`Discovered ${candidates.length} valid local mobile businesses within ${maxDist}km:`);
  candidates.slice(0, 10).forEach((c, i) => {
    console.log(` ${i + 1}. ${c.name} - ${c.dist} km`);
  });
}

testMobileClean();
