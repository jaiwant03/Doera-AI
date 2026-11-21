import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from './src/config/env.js';

async function testChat() {
  await mongoose.connect(config.mongoUri);
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({});
  if (!user) {
    console.log('No user found');
    await mongoose.disconnect();
    return;
  }
  const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, { expiresIn: '1h' });
  console.log('Testing with user:', user.email);

  const res = await fetch('http://localhost:5000/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({
      message: 'calculate range and covariance',
    })
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response status code:', res.status);
  if (data.error) {
    console.log('ERROR RETURNED:', data.error);
  } else {
    console.log('AI Message Content preview:\n--------------------------');
    console.log(data.aiMessage?.content?.slice(0, 1000));
    console.log('--------------------------');
  }
  await mongoose.disconnect();
}
testChat().catch(console.error);
