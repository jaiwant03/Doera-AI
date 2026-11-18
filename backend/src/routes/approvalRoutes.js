import express from 'express';
import {
  createApproval,
  getApprovals,
  getApprovalCounts,
  getApproval,
  editApproval,
  approveAction,
  rejectAction,
  executeAction,
  getApprovalsByTask,
} from '../controllers/approvalController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Require authentication for all approval routes
router.use(authenticate);

router.post('/', createApproval);
router.get('/', getApprovals);
router.get('/counts', getApprovalCounts);
router.get('/task/:taskId', getApprovalsByTask);
router.get('/:id', getApproval);
router.put('/:id', editApproval);
router.post('/:id/approve', approveAction);
router.post('/:id/reject', rejectAction);
router.post('/:id/execute', executeAction);

export default router;
