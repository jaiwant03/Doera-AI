import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;

// Safe URI string with masked credentials for logging
const maskUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
};

export const connectDB = async (customUri) => {
  if (isConnected) return mongoose.connection;

  const uri = customUri || config.mongoUri;
  const safeLogUri = maskUri(uri);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true,
    });
    isConnected = true;
    console.log(`[DOERA DB] MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('[DOERA DB] Ongoing connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[DOERA DB] MongoDB connection lost. Attempting reconnection...');
      isConnected = false;
    });

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
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[DOERA DB] MongoDB Disconnected.');
  }
};
