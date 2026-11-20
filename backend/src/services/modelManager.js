import { config } from '../config/env.js';

class ModelManager {
  getAvailableModels() {
    const models = [];

    // 1. Groq Provider (Configured in .env)
    if (config.groqApiKey) {
      models.push(
        {
          id: 'openai/gpt-oss-120b',
          name: 'GPT-OSS 120B (Groq)',
          provider: 'Groq',
          description: 'Flagship reasoning & autonomous orchestration',
          speed: 'Ultra-Fast',
          contextWindow: '128k',
          isDefault: true,
        },
        {
          id: 'qwen/qwen3.8-27b',
          name: 'Qwen 3.8 27B (Groq)',
          provider: 'Groq',
          description: 'Instant response for rapid queries',
          speed: 'Blazing',
          contextWindow: '128k',
          isDefault: false,
        },
        {
          id: 'openai/gpt-oss-20b',
          name: 'GPT-OSS 20B (Groq)',
          provider: 'Groq',
          description: 'Efficient coding & lightweight execution',
          speed: 'Ultra-Fast',
          contextWindow: '128k',
          isDefault: false,
        }
      );
    }

    // 2. OpenAI Provider (Configured in .env)
    if (config.openaiApiKey) {
      models.push(
        {
          id: 'gpt-4o',
          name: 'GPT-4o',
          provider: 'OpenAI',
          description: 'Advanced multimodal intelligence',
          speed: 'Fast',
          contextWindow: '128k',
          isDefault: false,
        },
        {
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          provider: 'OpenAI',
          description: 'Efficient coding & lightweight execution',
          speed: 'Fast',
          contextWindow: '128k',
          isDefault: false,
        }
      );
    }

    // 3. Google Gemini Provider (Configured in .env)
    if (config.geminiApiKey) {
      models.push(
        {
          id: 'gemini-1.5-flash',
          name: 'Gemini 1.5 Flash',
          provider: 'Google',
          description: 'High-speed multimodal vision & reasoning',
          speed: 'Ultra-Fast',
          contextWindow: '1M',
          isDefault: false,
        },
        {
          id: 'gemini-1.5-pro',
          name: 'Gemini 1.5 Pro',
          provider: 'Google',
          description: 'Deep multimodal reasoning & complex visual understanding',
          speed: 'Fast',
          contextWindow: '2M',
          isDefault: false,
        }
      );
    }

    // Fallback baseline model if no keys configured
    if (models.length === 0) {
      models.push({
        id: 'doera-native-core',
        name: 'DOERA Autonomous Core',
        provider: 'DOERA',
        description: 'Native deterministic execution engine',
        speed: 'Instant',
        contextWindow: '32k',
        isDefault: true,
      });
    }

    return models;
  }

  isModelAvailable(modelId) {
    const models = this.getAvailableModels();
    return models.some((m) => m.id === modelId);
  }

  getDefaultModel() {
    const models = this.getAvailableModels();
    const defaultModel = models.find((m) => m.isDefault);
    return defaultModel ? defaultModel.id : (models[0]?.id || 'openai/gpt-oss-120b');
  }
}

export const modelManager = new ModelManager();
export default modelManager;
