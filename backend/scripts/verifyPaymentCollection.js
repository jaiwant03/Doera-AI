import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import http from 'http';

dotenv.config({ path: 'd:/Dev/Projects/Doera AI/backend/.env' });

function postRequest(path, token, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/doera-ai');
  console.log('Connected to MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findOne({ email: 'abc@gmail.com' });
  if (!user) {
    console.error('User not found!');
    process.exit(1);
  }

  const token = jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET || 'dev_jwt_secret_key_12345',
    { expiresIn: '7d' }
  );

  console.log('\n--- Testing Upgrade with 12-digit Card (1414 1414 1414) ---');
  const demoTxnId = `DEMO-TXN-${Date.now().toString(36).toUpperCase()}`;
  const res = await postRequest('/api/subscription/upgrade', token, {
    plan: 'pro',
    billingCycle: 'monthly',
    isDemo: true,
    demoTransactionId: demoTxnId,
    customerDetails: {
      name: 'Jaiwant',
      email: 'abc@gmail.com',
      phone: '+1 (555) 000-0000',
      country: 'United States',
      city: 'San Francisco',
      address: '123 Main St',
      postalCode: '94105'
    },
    paymentDetails: {
      method: 'credit_card',
      cardholderName: 'JAIWANT',
      cardNumber: '1414 1414 1414',
      cardNumberMasked: '•••• •••• •••• 1414',
      cardLast4: '1414',
      cardBrand: 'DOERA PAY',
      expiry: '12/28'
    }
  });

  console.log('API Status:', res.status);
  console.log('API Body:', res.body);

  console.log('\n--- Inspecting Stored Document in MongoDB "payments" Collection ---');
  const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));
  const savedPayment = await Payment.findOne({ providerPaymentId: demoTxnId });
  console.log('Found Payment in MongoDB:', JSON.stringify(savedPayment, null, 2));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
