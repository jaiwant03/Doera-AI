import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getFollowUps,
  getFollowUpByTask,
  checkFollowUpNow,
  simulateProviderReply,
  stopFollowUp,
} from '../controllers/followUpController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getFollowUps);
router.get('/task/:taskId', getFollowUpByTask);
router.post('/:id/check-now', checkFollowUpNow);
router.post('/:id/simulate-reply', simulateProviderReply);
router.post('/:id/stop', stopFollowUp);

export default router;
