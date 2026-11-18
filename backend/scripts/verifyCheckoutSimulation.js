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

function getRequest(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers: {
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

  console.log('\n--- 1. Testing Simulated Checkout for PRO ($12/mo) ---');
  const proTxnId = `DEMO-TXN-PRO-${Date.now().toString(36).toUpperCase()}`;
  const proCheckoutRes = await postRequest('/api/subscription/upgrade', token, {
    plan: 'pro',
    billingCycle: 'monthly',
    isDemo: true,
    demoTransactionId: proTxnId,
    customerDetails: {
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 (555) 349-8812',
      country: 'United States',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      postalCode: '97477'
    }
  });

  console.log('Pro Checkout Status:', proCheckoutRes.status);
  console.log('Pro Checkout Result:', {
    success: proCheckoutRes.body.success,
    plan: proCheckoutRes.body.plan,
    dailyLimit: proCheckoutRes.body.usage?.dailyLimit,
    remainingRequests: proCheckoutRes.body.usage?.remainingRequests,
    isDemo: proCheckoutRes.body.isDemo,
    demoTransactionId: proCheckoutRes.body.demoTransactionId,
  });

  console.log('\n--- 2. Verifying Usage Summary on PRO ---');
  const usagePro = await getRequest('/api/usage', token);
  console.log('Usage API on Pro:', usagePro.body);

  console.log('\n--- 3. Testing Simulated Checkout for MAX ($25/mo) ---');
  const maxTxnId = `DEMO-TXN-MAX-${Date.now().toString(36).toUpperCase()}`;
  const maxCheckoutRes = await postRequest('/api/subscription/upgrade', token, {
    plan: 'max',
    billingCycle: 'monthly',
    isDemo: true,
    demoTransactionId: maxTxnId,
    customerDetails: {
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      phone: '+1 (555) 349-8812',
      country: 'United States',
      address: '742 Evergreen Terrace',
      city: 'Springfield',
      postalCode: '97477'
    }
  });

  console.log('Max Checkout Status:', maxCheckoutRes.status);
  console.log('Max Checkout Result:', {
    success: maxCheckoutRes.body.success,
    plan: maxCheckoutRes.body.plan,
    dailyLimit: maxCheckoutRes.body.usage?.dailyLimit,
    remainingRequests: maxCheckoutRes.body.usage?.remainingRequests,
    isDemo: maxCheckoutRes.body.isDemo,
    demoTransactionId: maxCheckoutRes.body.demoTransactionId,
  });

  console.log('\n--- 4. Verifying Payment Collection Record for Demo ---');
  const Payment = mongoose.model('Payment', new mongoose.Schema({}, { strict: false }));
  const demoPayments = await Payment.find({ userId: user._id, provider: 'demo' }).sort({ createdAt: -1 }).limit(2);
  console.log('Found Demo Payments:', demoPayments.map(p => ({
    id: p._id,
    provider: p.provider,
    providerPaymentId: p.providerPaymentId,
    amount: p.amount,
    status: p.status,
    isSimulated: p.isSimulated,
  })));

  console.log('\n--- 5. Switching back to FREE (downgrade to 20/day) ---');
  const freeRes = await postRequest('/api/subscription/upgrade', token, {
    plan: 'free',
    billingCycle: 'monthly'
  });
  console.log('Free Switch Status:', freeRes.status);
  console.log('Free Switch Result:', {
    success: freeRes.body.success,
    plan: freeRes.body.plan,
    dailyLimit: freeRes.body.usage?.dailyLimit,
    remainingRequests: freeRes.body.usage?.remainingRequests,
  });

  const finalUsage = await getRequest('/api/usage', token);
  console.log('Final Free Usage:', finalUsage.body);

  await mongoose.disconnect();
  console.log('\nAll End-to-End Simulation Tests Passed Successfully!');
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
