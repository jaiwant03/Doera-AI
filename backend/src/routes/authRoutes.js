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
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/google', getGoogleAuthUrl);
router.post('/google', googleLoginWithCredential);
router.get('/google/callback', handleGoogleCallback);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
