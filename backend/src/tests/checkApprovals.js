import axios from 'axios';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import User from '../models/User.js';

async function check() {
  await mongoose.connect(config.mongoUri);
  const user = await User.findOne({ email: 'ecosystem_test@doera.ai' }) || await User.findOne();
  const token = jwt.sign({ userId: user._id }, config.jwtSecret);
  
  try {
    const res = await axios.get('http://localhost:5000/api/approvals?status=pending', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('STATUS:', res.status);
    console.log('APPROVALS LENGTH:', res.data?.approvals?.length);
    console.log('COUNTS:', res.data?.counts);
    if (res.data?.approvals?.length > 0) {
      console.log('FIRST APPROVAL:', res.data.approvals[0].actionTitle, res.data.approvals[0].status);
    }
  } catch (err) {
    console.error('ERROR:', err.response?.status, err.response?.data || err.message);
  } finally {
    await mongoose.disconnect();
  }
}

check();
