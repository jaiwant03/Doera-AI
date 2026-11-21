import axios from 'axios';

async function inspectNominatim629() {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/search?format=json&q=theatre&limit=1', {
      headers: {
        'User-Agent': 'DOERA-AI-Research-Agent/1.0 (test@doera.ai)',
        'Accept': 'application/json'
      }
    });
    console.log('Status:', res.status, res.data);
  } catch (err) {
    console.log('Status:', err.response?.status);
    console.log('Headers:', err.response?.headers);
    console.log('Data:', err.response?.data);
  }
}

inspectNominatim629();
