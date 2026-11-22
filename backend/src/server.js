// DOERA AI — Production Server
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { config, validateEnv } from './config/env.js';
import { connectDB, disconnectDB, isDBConnected, getDBStatus } from './config/database.js';
import { getRedisClient, isRedisAvailable, disconnectRedis } from './config/redis.js';
import { generalApiLimiter } from './middleware/rateLimiter.js';
import heavyTaskLimiter from './utils/concurrencyLimiter.js';
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
import usageRoutes from './routes/usageRoutes.js';
import memoryRoutes from './routes/memoryRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import researchRoutes from './routes/researchRoutes.js';
import voiceRoutes from './routes/voiceRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import missionRoutes from './routes/missionRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import followUpRoutes from './routes/followUpRoutes.js';
import proactiveEngine from './services/proactiveEngine.js';

// DOERA AI 3.0 Platform Server
const app = express();
const server = http.createServer(app);

// Trust reverse proxy (essential for Render / Vercel accurate IP rate-limiting & SSL)
app.set('trust proxy', 1);

// Startup Environment Validation
const envWarnings = validateEnv();
envWarnings.forEach((w) => logger.warn(`[CONFIG] ${w}`));

// Security Headers via Helmet (with permissive cross-origin resource policy for the SPA frontend)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Managed at edge / Vercel
  })
);

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
        callback(null, true);
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

// Request Correlation ID Middleware & Timing Diagnostics
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || `req-${uuidv4().substring(0, 12)}`;
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. Liveness Health Check Endpoint (Render Health Check)
const handleHealth = (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DOERA AI Backend Execution Engine',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting',
  });
};
app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

// 2. Readiness Probe Endpoint
const handleReady = (req, res) => {
  const dbConnected = isDBConnected();
  if (dbConnected) {
    res.status(200).json({
      ready: true,
      service: 'DOERA AI Backend',
      timestamp: new Date().toISOString(),
      database: 'connected',
      redis: isRedisAvailable() ? 'connected' : 'in-memory-fallback',
    });
  } else {
    res.status(503).json({
      ready: false,
      service: 'DOERA AI Backend',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: 'Database connection is initializing or reconnecting.',
    });
  }
};
app.get('/ready', handleReady);
app.get('/api/ready', handleReady);

// 3. Safe Dependency & Diagnostics Endpoint (Zero Credentials Exposed)
const handleDependencies = (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    service: 'DOERA AI Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: getDBStatus(),
    redis: {
      available: isRedisAvailable(),
      mode: isRedisAvailable() ? 'distributed-redis' : 'resilient-in-memory-fallback',
    },
    concurrency: heavyTaskLimiter.getStatus(),
    memoryTelemetry: {
      heapUsedMb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
      rssMb: Number((mem.rss / 1024 / 1024).toFixed(2)),
      externalMb: Number((mem.external / 1024 / 1024).toFixed(2)),
    },
  });
};
app.get('/health/dependencies', handleDependencies);
app.get('/api/health/dependencies', handleDependencies);

// Apply General Rate Limiter to all /api routes
app.use('/api', generalApiLimiter);

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
  getRedisClient(); // Initialize Redis client if REDIS_URL is configured
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
    await disconnectRedis().catch(() => {});
    await disconnectDB().catch(() => {});
    process.exit(0);
  });

  // Force exit after 10s if connections fail to close in time
  setTimeout(() => {
    logger.warn('[DOERA] Forced exit after timeout during graceful shutdown.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle nodemon restarts cleanly
process.once('SIGUSR2', async () => {
  logger.info('[DOERA] Received SIGUSR2 (nodemon restart). Releasing port and shutting down cleanly...');
  proactiveEngine.stop();
  server.close(async () => {
    await disconnectRedis().catch(() => {});
    await disconnectDB().catch(() => {});
    process.kill(process.pid, 'SIGUSR2');
  });
});

// Process-level unhandled exception and rejection handlers
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
