import axios from 'axios';

async function testPhotonSearch() {
  try {
    // 1. Search cinema / theatre around coordinates
    const res = await axios.get('https://photon.komoot.io/api/?q=theatre&lat=11.0445&lon=76.9232&limit=5', {
      headers: { 'User-Agent': 'DOERA-AI-Local-Research/3.0' },
      timeout: 5000,
    });
    console.log('Photon search "theatre" status:', res.status, 'Features:', res.data.features?.length);
    res.data.features?.forEach((f) => {
      console.log(' - Name:', f.properties.name, 'City:', f.properties.city, 'Coords:', f.geometry.coordinates);
    });

    // 2. Search mobile phone repair
    const resMobile = await axios.get('https://photon.komoot.io/api/?q=mobile+repair&lat=11.0445&lon=76.9232&limit=5', {
      headers: { 'User-Agent': 'DOERA-AI-Local-Research/3.0' },
      timeout: 5000,
    });
    console.log('Photon search "mobile repair" status:', resMobile.status, 'Features:', resMobile.data.features?.length);
    resMobile.data.features?.forEach((f) => {
      console.log(' - Name:', f.properties.name, 'City:', f.properties.city, 'Coords:', f.geometry.coordinates);
    });
  } catch (err) {
    console.error('Photon search error:', err.message);
  }
}

testPhotonSearch();
