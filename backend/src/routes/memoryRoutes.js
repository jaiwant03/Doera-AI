import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getMemories,
  createMemory,
  updateMemory,
  deleteMemory,
  clearAllMemories,
} from '../controllers/memoryController.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', getMemories);
router.post('/', createMemory);
router.put('/:id', updateMemory);
router.delete('/:id', deleteMemory);
router.delete('/', clearAllMemories);

export default router;
