import express from 'express';
import {
  getTasks,
  getTask,
  approveTask,
  rejectTask,
  cancelTask,
  resumeTask,
  getTaskEvents,
} from '../controllers/taskController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getTasks);
router.get('/:id', getTask);
router.post('/:id/approve', approveTask);
router.post('/:id/reject', rejectTask);
router.post('/:id/cancel', cancelTask);
router.post('/:id/resume', resumeTask);
router.get('/:id/events', getTaskEvents);

export default router;
