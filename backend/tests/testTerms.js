import axios from 'axios';

async function testTerms() {
  const terms = ["mobile phone repair", "mobile service center", "phone repair", "mobile repair", "electronics repair"];
  for (const t of terms) {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(t + ' Coimbatore')}&lat=11.0445&lon=76.9232&limit=5`;
    const res = await axios.get(url);
    const feats = res.data?.features || [];
    console.log(`Term: "${t} Coimbatore" -> found ${feats.length} results:`);
    feats.forEach(f => {
      console.log(` - ${f.properties.name} (${f.properties.city || f.properties.district || f.properties.country})`);
    });
  }
}

testTerms();
