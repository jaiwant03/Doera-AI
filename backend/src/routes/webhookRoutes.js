import express from 'express';
import {
  handleWorkflowWebhook,
  handleN8nCallback,
  handleGmailWebhook,
  handleWhatsappWebhook,
} from '../controllers/webhookController.js';

const router = express.Router();

router.post('/workflow', handleWorkflowWebhook);
router.post('/n8n', handleN8nCallback);
router.post('/n8n/callback', handleN8nCallback);
router.post('/gmail', handleGmailWebhook);

// WhatsApp Cloud API webhook supports GET (challenge verification) and POST (incoming events)
router.get('/whatsapp', handleWhatsappWebhook);
router.post('/whatsapp', handleWhatsappWebhook);

export default router;
