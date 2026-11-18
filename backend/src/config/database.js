import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;

export const connectDB = async (customUri) => {
  if (isConnected) return mongoose.connection;

  const uri = customUri || config.mongoUri;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });
    isConnected = true;
    console.log(`[DOERA DB] MongoDB Connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`[DOERA DB] Error connecting to MongoDB (${uri}):`, error.message);
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
