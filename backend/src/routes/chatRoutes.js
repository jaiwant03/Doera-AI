import express from 'express';
import {
  getModels,
  streamMessage,
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
  renameConversation,
  togglePinConversation,
  archiveConversation,
  feedbackMessage,
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';
import { chatLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

// Models
router.get('/models', getModels);

// Streaming & Standard Messaging (protected by user-based chatLimiter)
router.post('/stream', chatLimiter, streamMessage);
router.post('/message', chatLimiter, sendMessage);

// Conversations
router.get('/conversations', getConversations);
router.get('/conversations/:id', getConversation);
router.patch('/conversations/:id', renameConversation);
router.put('/conversations/:id', renameConversation);
router.delete('/conversations/:id', deleteConversation);
router.patch('/conversations/:id/pin', togglePinConversation);
router.patch('/conversations/:id/archive', archiveConversation);

// Messages
router.post('/messages/:id/feedback', feedbackMessage);

export default router;
