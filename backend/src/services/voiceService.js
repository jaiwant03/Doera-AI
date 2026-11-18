import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class VoiceService {
  /**
   * Transcribe Audio Buffer via Groq Whisper or OpenAI Whisper
   */
  async transcribeAudio({ buffer, filename = 'audio.webm', language = 'en' }) {
    // 1. Groq Ultra-Fast Whisper (Primary)
    if (config.groqApiKey) {
      try {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        let postData = [];
        
        postData.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n`));
        if (language === 'ta') {
          postData.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\rta\r\n`));
        }
        postData.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/webm\r\n\r\n`));
        postData.push(buffer);
        postData.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        
        const payload = Buffer.concat(postData);

        const res = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', payload, {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            Authorization: `Bearer ${config.groqApiKey}`,
          },
          timeout: 12000,
        });

        return { text: res.data.text, provider: 'groq-whisper' };
      } catch (err) {
        logger.warn(`[Voice Service] Groq Whisper failed: ${err.message}`);
      }
    }

    // 2. OpenAI Whisper Fallback
    if (config.openaiApiKey) {
      try {
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        let postData = [];
        postData.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`));
        postData.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/webm\r\n\r\n`));
        postData.push(buffer);
        postData.push(Buffer.from(`\r\n--${boundary}--\r\n`));
        
        const payload = Buffer.concat(postData);

        const res = await axios.post('https://api.openai.com/v1/audio/transcriptions', payload, {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            Authorization: `Bearer ${config.openaiApiKey}`,
          },
          timeout: 15000,
        });

        return { text: res.data.text, provider: 'openai-whisper' };
      } catch (err) {
        logger.error(`[Voice Service] OpenAI Whisper error: ${err.message}`);
      }
    }

    return { text: 'Speech detected. Transcription requires GROQ_API_KEY or OPENAI_API_KEY configured.', provider: 'local-fallback' };
  }

  /**
   * Synthesize Speech via OpenAI TTS
   */
  async synthesizeSpeech({ text, voice = 'alloy', speed = 1.0 }) {
    if (!config.openaiApiKey) {
      throw new Error('OPENAI_API_KEY required for server-side TTS.');
    }

    const res = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: 'tts-1',
        input: text.substring(0, 4096),
        voice,
        speed,
      },
      {
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 15000,
      }
    );

    return Buffer.from(res.data);
  }
}

export const voiceService = new VoiceService();
export default voiceService;
