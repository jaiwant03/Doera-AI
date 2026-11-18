import express from 'express';
import {
  getIntegrations,
  connectGmail,
  connectGoogleCalendar,
} from '../controllers/integrationController.js';
import { handleGoogleCallback } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public callback endpoint matching GOOGLE_REDIRECT_URI
router.get('/google/callback', handleGoogleCallback);

router.use(authenticate);

router.get('/', getIntegrations);
router.post('/gmail/connect', connectGmail);
router.post('/google-calendar/connect', connectGoogleCalendar);

export default router;
