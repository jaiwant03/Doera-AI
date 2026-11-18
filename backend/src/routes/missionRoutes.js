import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMissions,
  getMissionById,
  pauseMission,
  resumeMission,
  cancelMission,
} from '../controllers/missionController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getMissions);
router.get('/:id', getMissionById);
router.post('/:id/pause', pauseMission);
router.post('/:id/resume', resumeMission);
router.post('/:id/cancel', cancelMission);

export default router;
