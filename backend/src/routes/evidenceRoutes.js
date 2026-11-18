import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getEvidenceByTask,
  getEvidenceById,
} from '../controllers/evidenceController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/task/:taskId', getEvidenceByTask);
router.get('/:id', getEvidenceById);

export default router;
