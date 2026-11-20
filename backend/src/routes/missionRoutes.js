import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMissions,
  createMission,
  getMissionById,
  getMissionDeliverables,
  addFollowUpInstruction,
  pauseMission,
  resumeMission,
  cancelMission,
} from '../controllers/missionController.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getMissions);
router.post('/', createMission);
router.get('/:id', getMissionById);
router.get('/:id/deliverables', getMissionDeliverables);
router.post('/:id/follow-up', addFollowUpInstruction);
router.post('/:id/pause', pauseMission);
router.post('/:id/resume', resumeMission);
router.post('/:id/cancel', cancelMission);

export default router;
