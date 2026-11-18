import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  resetPassword,
  getGoogleAuthUrl,
  googleLoginWithCredential,
  handleGoogleCallback,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', rateLimiter({ windowMs: 60000, maxRequests: 20 }), register);
router.post('/login', rateLimiter({ windowMs: 60000, maxRequests: 30 }), login);
router.post('/reset-password', rateLimiter({ windowMs: 60000, maxRequests: 10 }), resetPassword);
router.get('/google', getGoogleAuthUrl);
router.post('/google', googleLoginWithCredential);
router.get('/google/callback', handleGoogleCallback);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
