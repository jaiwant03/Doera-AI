import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  startResearch,
  getResearchSessions,
  getResearchSession,
} from '../controllers/researchController.js';

const router = express.Router();
router.use(authenticate);

router.post('/', startResearch);
router.get('/', getResearchSessions);
router.get('/:id', getResearchSession);

export default router;
