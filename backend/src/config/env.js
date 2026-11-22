import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Standard MongoDB URI from environment or local fallback
let baseMongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai';

export const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: baseMongoUri,
  jwtSecret: process.env.JWT_SECRET || 'doera_ai_development_jwt_secret_key_super_secure_32chars!',
  encryptionKey: process.env.ENCRYPTION_KEY || 'doera_ai_32_bytes_super_secure_encrypt_key_0123',

  // Cloud LLM Provider (groq, openai, or built-in intelligent fallback)
  llmProvider: process.env.LLM_PROVIDER || 'groq',
  groqApiKey: process.env.GROQ_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  
  // Google Integrations
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || process.env.GOOGLE_CALLBACK_URL || process.env.GMAIL_OAUTH_REDIRECT_URI || 'http://localhost:5000/api/integrations/google/callback',
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',

  // External Self-Hosted n8n Automation Engine (DO NOT DEPLOY TO VERCEL OR RENDER)
  n8nEnabled: process.env.N8N_ENABLED === 'true' || !!process.env.N8N_WEBHOOK_URL,
  n8nBaseUrl: process.env.N8N_BASE_URL || '',
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || '',
  
  // WhatsApp Cloud API
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'doera_whatsapp_verify_token_2026',
  
  // Email encryption
  emailEncryptionKey: process.env.EMAIL_ENCRYPTION_KEY || 'doera_email_enc_key_32bytes_sec!',

  // Redis Distributed Cache & Rate Limiting
  redisUrl: process.env.REDIS_URL || '',

  // Subscription Quota Limits
  freeRequestLimit: parseInt(process.env.FREE_REQUEST_LIMIT, 10) || 20,
  proRequestLimit: parseInt(process.env.PRO_REQUEST_LIMIT, 10) || 500,
  maxRequestLimit: parseInt(process.env.MAX_REQUEST_LIMIT, 10) || 2000,

  // Payment Providers (Stripe & Razorpay)
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
};

export const validateEnv = () => {
  const warnings = [];
  if (config.demoMode) {
    console.log(`[DOERA CONFIG] 🛡️ SAFE DEMO MODE ACTIVE. Database: ${config.demoDatabaseName}`);
  }
  if (!process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET not set; using development fallback.');
  }
  if (!process.env.GROQ_API_KEY && config.llmProvider === 'groq') {
    warnings.push('GROQ_API_KEY not configured. Orchestration will run with intelligent rule-based planner until key is provided.');
  }
  return warnings;
};
