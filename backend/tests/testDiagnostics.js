import axios from 'axios';

async function testPhotonQueries() {
  const lat = 11.0445;
  const lon = 76.9232;

  console.log('--- 1. Photon Reverse Geocoding ---');
  const rev = await axios.get(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
  const props = rev.data?.features?.[0]?.properties;
  console.log('Reverse result:', {
    name: props?.name,
    city: props?.city || props?.district,
    state: props?.state,
    country: props?.country,
    postcode: props?.postcode
  });

  const city = props?.city || props?.district || 'Coimbatore';

  console.log('\n--- 2. Photon: "theatre" with lat/lon ---');
  let res = await axios.get(`https://photon.komoot.io/api/?q=theatre&lat=${lat}&lon=${lon}&limit=15`);
  let feats = res.data?.features || [];
  console.log(`Found ${feats.length} for 'theatre':`);
  feats.slice(0, 8).forEach(f => {
    console.log(` - ${f.properties.name} (${f.properties.district || f.properties.city || f.properties.state}) [${f.geometry.coordinates}]`);
  });

  console.log(`\n--- 3. Photon: "cinema ${city}" with lat/lon ---`);
  res = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent('cinema ' + city)}&lat=${lat}&lon=${lon}&limit=15`);
  feats = res.data?.features || [];
  console.log(`Found ${feats.length} for 'cinema ${city}':`);
  feats.slice(0, 8).forEach(f => {
    console.log(` - ${f.properties.name} (${f.properties.district || f.properties.city || f.properties.state}) [${f.geometry.coordinates}]`);
  });

  console.log(`\n--- 4. Photon: "theatre ${city}" with lat/lon ---`);
  res = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent('theatre ' + city)}&lat=${lat}&lon=${lon}&limit=15`);
  feats = res.data?.features || [];
  console.log(`Found ${feats.length} for 'theatre ${city}':`);
  feats.slice(0, 8).forEach(f => {
    console.log(` - ${f.properties.name} (${f.properties.district || f.properties.city || f.properties.state}) [${f.geometry.coordinates}]`);
  });

  console.log(`\n--- 5. Photon: "mobile repair ${city}" or "mobile service ${city}" ---`);
  res = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent('mobile repair ' + city)}&lat=${lat}&lon=${lon}&limit=15`);
  feats = res.data?.features || [];
  console.log(`Found ${feats.length} for 'mobile repair ${city}':`);
  feats.forEach(f => {
    console.log(` - ${f.properties.name} (${f.properties.district || f.properties.city || f.properties.state}) [${f.geometry.coordinates}]`);
  });

  console.log(`\n--- 6. Photon: "mobile service center ${city}" ---`);
  res = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent('mobile service center ' + city)}&lat=${lat}&lon=${lon}&limit=15`);
  feats = res.data?.features || [];
  console.log(`Found ${feats.length} for 'mobile service center ${city}':`);
  feats.forEach(f => {
    console.log(` - ${f.properties.name} (${f.properties.district || f.properties.city || f.properties.state}) [${f.geometry.coordinates}]`);
  });

  console.log(`\n--- 7. Photon: "electronics repair ${city}" ---`);
  res = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent('electronics repair ' + city)}&lat=${lat}&lon=${lon}&limit=15`);
  feats = res.data?.features || [];
  console.log(`Found ${feats.length} for 'electronics repair ${city}':`);
  feats.forEach(f => {
    console.log(` - ${f.properties.name} (${f.properties.district || f.properties.city || f.properties.state}) [${f.geometry.coordinates}]`);
  });
}

testPhotonQueries();
