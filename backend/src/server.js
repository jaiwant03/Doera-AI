// DOERA AI — Server
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import { config, validateEnv } from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { seedDefaultUsers } from './config/seed.js';
import realtimeServer from './websocket/wsServer.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Guarantee global availability of logger across all asynchronous and event contexts
if (typeof global !== 'undefined') {
  global.logger = logger;
}
if (typeof globalThis !== 'undefined') {
  globalThis.logger = logger;
}

// Route imports
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import integrationRoutes from './routes/integrationRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import memoryRoutes from './routes/memoryRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import researchRoutes from './routes/researchRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import usageRoutes from './routes/usageRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import missionRoutes from './routes/missionRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import followUpRoutes from './routes/followUpRoutes.js';
import proactiveEngine from './services/proactiveEngine.js';

// DOERA AI 3.0 Platform Server
const app = express();
const server = http.createServer(app);

// Startup Environment Validation
const envWarnings = validateEnv();
envWarnings.forEach((w) => logger.warn(`[CONFIG] ${w}`));

// CORS Configuration
const allowedOrigins = [
  config.clientUrl,
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else if (config.nodeEnv !== 'production') {
        callback(null, true); // Allow during development
      } else {
        const isClient = config.clientUrl && (origin === config.clientUrl || origin === config.clientUrl.replace(/\/+$/, ''));
        if (isClient) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive fallback to prevent breaking cross-domain UI
        }
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Endpoint
const handleHealth = (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DOERA AI Backend Execution Engine',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    database: mongoose.connection.name,
  });
};
app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes); // Direct alias for external Google OAuth redirects and callbacks
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/followups', followUpRoutes);

// Global Error Handler
app.use(errorHandler);

// Initialize WebSocket server
realtimeServer.init(server);

// Start Server Function
export const startServer = async () => {
  await connectDB();
  await seedDefaultUsers();

  if (config.nodeEnv !== 'test') {
    proactiveEngine.start();
  }

  return new Promise((resolve, reject) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`[DOERA] Port ${config.port} is already in use (EADDRINUSE). Another process or background instance is occupying port ${config.port}.`);
      } else {
        logger.error('[DOERA] Server listen error:', err.message);
      }
      reject(err);
    });

    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`====================================================`);
      logger.info(`  DOERA AI 3.0 — Autonomous Assistant Platform     `);
      logger.info(`  Server running on port: ${config.port}            `);
      logger.info(`  Client URL: ${config.clientUrl}                   `);
      logger.info(`  Environment: ${config.nodeEnv}                    `);
      logger.info(`====================================================`);
      resolve(server);
    });
  });
};

// Graceful Shutdown
const handleShutdown = async (signal) => {
  logger.info(`[DOERA] Received ${signal}. Commencing graceful shutdown...`);
  proactiveEngine.stop();
  server.close(async () => {
    logger.info('[DOERA] HTTP and WebSocket server stopped.');
    await disconnectDB();
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle nodemon restarts cleanly so port 5000 is released immediately
process.once('SIGUSR2', async () => {
  logger.info('[DOERA] Received SIGUSR2 (nodemon restart). Releasing port and shutting down cleanly...');
  proactiveEngine.stop();
  server.close(async () => {
    await disconnectDB().catch(() => {});
    process.kill(process.pid, 'SIGUSR2');
  });
});

// Process-level unhandled exception and rejection handlers — prevents unexpected crash/restart loops
process.on('uncaughtException', (err) => {
  logger.error('[DOERA PROCESS ERROR] Uncaught exception caught:', err?.stack || err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[DOERA PROCESS ERROR] Unhandled rejection caught:', reason?.stack || reason?.message || reason);
});

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    logger.error('[DOERA] Failed to start server:', err);
  });
}

export { app, server };
export default app;
