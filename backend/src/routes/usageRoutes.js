import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getUsage,
  reserveUsage,
  completeUsage,
  releaseUsage,
} from '../controllers/usageController.js';

const router = express.Router();

// All usage endpoints require authentication
router.use(authenticate);

router.get('/', getUsage);
router.get('/current', getUsage);
router.post('/reserve', reserveUsage);
router.post('/complete', completeUsage);
router.post('/release', releaseUsage);

export default router;
