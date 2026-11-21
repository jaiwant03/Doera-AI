import dotenv from 'dotenv';
dotenv.config();
import Groq from 'groq-sdk';

async function listGroqModels() {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const list = await client.models.list();
  const models = list.data.map(m => m.id);
  console.log('Available Groq models:', models);
  const visionModels = models.filter(m => m.includes('vision') || m.includes('image') || m.includes('multimodal') || m.includes('3.2') || m.includes('scout'));
  console.log('Potential vision models on Groq:', visionModels);
}

listGroqModels().catch(console.error);
