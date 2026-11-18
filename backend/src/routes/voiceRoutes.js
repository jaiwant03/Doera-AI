import express from 'express';
import { authenticate } from '../middleware/auth.js';
import voiceService from '../services/voiceService.js';

const router = express.Router();
router.use(authenticate);

// 1. Transcribe Audio
router.post('/transcribe', express.raw({ type: '*/*', limit: '25mb' }), async (req, res) => {
  try {
    const language = req.query.lang || 'en';
    const result = await voiceService.transcribeAudio({
      buffer: req.body,
      filename: 'speech.webm',
      language,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

// 2. Synthesize Speech
router.post('/speak', async (req, res) => {
  try {
    const { text, voice = 'alloy', speed = 1.0 } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text is required' });

    const audioBuffer = await voiceService.synthesizeSpeech({ text, voice, speed });
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Speech synthesis failed' });
  }
});

export default router;
