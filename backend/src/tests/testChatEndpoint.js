import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { config } from '../config/env.js';
import User from '../models/User.js';

async function testEndpoint() {
  await mongoose.connect(config.mongoUri);
  let user = await User.findOne();
  if (!user) {
    user = await User.create({ name: 'Test', email: 'test@example.com', password: 'hash' });
  }

  const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '1h' });
  await mongoose.disconnect();

  try {
    console.log('[TEST] Sending request to http://localhost:5000/api/chat/message ...');
    const res = await axios.post(
      'http://localhost:5000/api/chat/message',
      {
        message: "Find three verified electricians in Coimbatore, compare their service charges, customer ratings and earliest availability, contact them for quotations after showing me the messages for approval, and help me arrange an appointment with the best option. Track the response and provide the actual confirmation details."
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );
    console.log('[TEST] Response status:', res.status);
    console.log('[TEST] aiMessage content length:', res.data?.aiMessage?.content?.length);
    console.log('[TEST] task status:', res.data?.task?.status);
    console.log('[TEST] locationData places:', res.data?.locationData?.places?.length);
    console.log('[TEST] Response content preview:\n', res.data?.aiMessage?.content?.slice(0, 300));
  } catch (err) {
    console.error('[TEST ERROR]', err.response?.status, err.response?.data || err.message);
  }
}

testEndpoint();
