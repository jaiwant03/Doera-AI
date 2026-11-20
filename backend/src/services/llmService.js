import Groq from 'groq-sdk';
import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import modelManager from './modelManager.js';

class LLMService {
  constructor() {
    this.provider = config.llmProvider;
    this.groqClient = config.groqApiKey ? new Groq({ apiKey: config.groqApiKey, timeout: 5000 }) : null;
    this.openaiApiKey = config.openaiApiKey;
    this.openaiBaseUrl = config.openaiBaseUrl || 'https://api.openai.com/v1';
  }

  /**
   * Genuine Progressive Token Streaming via Groq or OpenAI SSE
   */
  async streamResponse({ messages, systemPrompt, model, onToken, signal }) {
    const chosenModel = model || modelManager.getDefaultModel();
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    // 1. Groq Native Stream
    if (this.groqClient) {
      const modelsToTry = [
        chosenModel,
        'qwen/qwen3.8-27b',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
      ].filter(Boolean);

      for (const modelName of modelsToTry) {
        try {
          const stream = await this.groqClient.chat.completions.create({
            model: modelName,
            messages: formattedMessages,
            temperature: 0.3,
            stream: true,
          });

          for await (const chunk of stream) {
            if (signal?.aborted) break;
            const token = chunk.choices[0]?.delta?.content || '';
            if (token) {
              onToken(token);
            }
          }
          return;
        } catch (err) {
          logger.warn(`[LLM Stream] Groq stream model ${modelName} failed, checking fallback: ${err.message}`);
        }
      }
    }

    // 2. OpenAI Native Stream
    if (this.openaiApiKey) {
      try {
        const response = await fetch(`${this.openaiBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: chosenModel.startsWith('gpt-') ? chosenModel : 'gpt-4o-mini',
            messages: formattedMessages,
            temperature: 0.3,
            stream: true,
          }),
          signal,
        });

        if (!response.ok) {
          throw new Error(`OpenAI stream HTTP error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done || signal?.aborted) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const token = parsed.choices[0]?.delta?.content || '';
                if (token) onToken(token);
              } catch (_) {}
            }
          }
        }
        return;
      } catch (err) {
        logger.warn('[LLM Stream] OpenAI stream failed:', err.message);
      }
    }

    // 3. Fallback progressive simulation if external streams fail
    const fallbackText = "Hello! I am DOERA AI, your personal autonomous execution assistant (\"Don't Just Ask AI. Let AI Get It Done.\"). I specialize in taking real-world tasks off your shoulders—from finding verified local professionals and negotiating quotes to booking appointments and confirming outcomes.";
    for (const word of fallbackText.split(' ')) {
      if (signal?.aborted) break;
      onToken(word + ' ');
      await new Promise((r) => setTimeout(r, 35));
    }
  }

  /**
   * Complete prompt with structured JSON output or text
   */
  async generate({ systemPrompt, userPrompt, jsonMode = false, temperature = 0.2 }) {
    // 1. Cloud Groq Provider (Ultra-fast hosted GPT-OSS 120B / Qwen, zero local GPU required)
    if (this.groqClient) {
      const modelsToTry = [
        'qwen/qwen3.8-27b',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
      ];

      for (const modelName of modelsToTry) {
        try {
          const response = await this.groqClient.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature,
            max_tokens: 950,
            response_format: jsonMode ? { type: 'json_object' } : undefined,
          });

          const content = response.choices[0]?.message?.content || '';
          if (jsonMode) {
            try {
              return JSON.parse(content);
            } catch {
              const match = content.match(/\{[\s\S]*\}/);
              if (match) return JSON.parse(match[0]);
              return { error: 'Invalid JSON', raw: content };
            }
          }
          return content;
        } catch (err) {
          logger.warn(`[LLM Service] Groq model ${modelName} completion failed: ${err.message}`);
          if (jsonMode && err.error?.failed_generation) {
            try {
              const cleaned = err.error.failed_generation.replace(/,\s*([\]\}])/g, '$1');
              const match = cleaned.match(/\{[\s\S]*\}/);
              if (match) return JSON.parse(match[0]);
            } catch {}
          }
          // If Groq is rate-limited on tokens, break early so robust deterministic agent fallbacks can engage without hanging
          if (err.message?.includes('rate_limit_exceeded') || err.message?.includes('Rate limit reached') || err.status === 429) {
            break;
          }
        }
      }
    }

    // 2. Cloud OpenAI / Compatible API Provider (Optional)
    if (this.openaiApiKey) {
      try {
        const res = await axios.post(
          `${this.openaiBaseUrl}/chat/completions`,
          {
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature,
            response_format: jsonMode ? { type: 'json_object' } : undefined,
          },
          {
            headers: {
              Authorization: `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 20000,
          }
        );

        const content = res.data.choices[0]?.message?.content || '';
        return jsonMode ? JSON.parse(content) : content;
      } catch (err) {
        logger.warn('[LLM Service] OpenAI cloud completion failed:', err.message);
      }
    }

    // 3. Intelligent deterministic fallback if external LLM key is not yet added
    return this.fallbackCompletion(systemPrompt, userPrompt, jsonMode);
  }

  /**
   * Format message content into multimodal parts if images are present
   */
  buildMultimodalMessages(userPrompt, attachments = []) {
    const imageAttachments = attachments.filter(
      (a) => a.type?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(a.name || '')
    );

    if (imageAttachments.length === 0) {
      return [{ role: 'user', content: userPrompt }];
    }

    const contentParts = [{ type: 'text', text: userPrompt }];

    imageAttachments.forEach((img) => {
      if (img.url || img.base64) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: img.url || `data:${img.type || 'image/jpeg'};base64,${img.base64}`,
          },
        });
      }
    });

    return [{ role: 'user', content: contentParts }];
  }

  fallbackCompletion(system, user, jsonMode) {
    if (!jsonMode) {
      return `DOERA AI is processing your request: "${user.substring(0, 100)}..." with autonomous agent coordination.`;
    }

    // Structured planning fallback
    const lower = user.toLowerCase();
    let category = 'GENERAL_EXECUTION';
    if (lower.includes('electrician') || lower.includes('plumber') || lower.includes('carpenter') || lower.includes('clean')) {
      category = 'LOCAL_SERVICE';
    } else if (lower.includes('repair') || lower.includes('fix') || lower.includes('laptop') || lower.includes('phone')) {
      category = 'REPAIR';
    } else if (lower.includes('donate') || lower.includes('donation') || lower.includes('ngo')) {
      category = 'DONATION';
    } else if (lower.includes('tutor') || lower.includes('class') || lower.includes('teach') || lower.includes('course')) {
      category = 'EDUCATION';
    } else if (lower.includes('complaint') || lower.includes('unresolved') || lower.includes('customer care')) {
      category = 'COMPLAINT';
    }

    return {
      category,
      toolsRequired: ['DISCOVERY', 'COMMUNICATION', 'SCHEDULING', 'VERIFICATION'],
      plan: [
        { id: 'understand', name: 'Understanding your request', agent: 'Orchestrator' },
        { id: 'discover', name: 'Finding available providers', agent: 'Discovery' },
        { id: 'communicate', name: 'Inquiring pricing & terms', agent: 'Communication' },
        { id: 'compare', name: 'Comparing received quotes', agent: 'Quotation' },
        { id: 'schedule', name: 'Scheduling execution slot', agent: 'Scheduling' },
        { id: 'verify', name: 'Verifying task outcome', agent: 'Verification' },
      ],
      summary: `Autonomous plan formulated for: ${category}`,
    };
  }
}

export const llmService = new LLMService();
export default llmService;
