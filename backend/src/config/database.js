import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;
let listenersAttached = false;

// Safe URI string with masked credentials for logging
const maskUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
};

export const connectDB = async (customUri) => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = customUri || config.mongoUri;
  const safeLogUri = maskUri(uri);

  const maxPoolSize = process.env.MONGO_MAX_POOL_SIZE ? parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) : 10;
  const minPoolSize = process.env.MONGO_MIN_POOL_SIZE ? parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) : 2;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize,
      minPoolSize,
      maxIdleTimeMS: 30000,
      socketTimeoutMS: 45000,
      autoIndex: config.nodeEnv !== 'production',
    });

    isConnected = true;
    console.log(`[DOERA DB] MongoDB Connected: ${conn.connection.host} (Pool: min=${minPoolSize}, max=${maxPoolSize})`);

    if (!listenersAttached) {
      mongoose.connection.on('error', (err) => {
        console.error('[DOERA DB] Ongoing connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('[DOERA DB] MongoDB connection lost. Driver attempting automatic reconnection...');
        isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('[DOERA DB] MongoDB successfully reconnected.');
        isConnected = true;
      });

      listenersAttached = true;
    }

    return conn.connection;
  } catch (error) {
    console.error(`[DOERA DB] Error connecting to MongoDB (${safeLogUri}):`, error.message);
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
    return null;
  }
};

export const disconnectDB = async () => {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[DOERA DB] MongoDB Disconnected.');
  }
};

export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
    poolSize: mongoose.connection.readyState === 1 ? (process.env.MONGO_MAX_POOL_SIZE ? parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) : 10) : 0,
  };
};

export default {
  connectDB,
  disconnectDB,
  isDBConnected,
  getDBStatus,
};
