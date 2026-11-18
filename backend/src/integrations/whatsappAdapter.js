import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

class WhatsAppAdapter {
  constructor() {
    this.accessToken = config.whatsappAccessToken;
    this.phoneNumberId = config.whatsappPhoneNumberId;
    this.apiVersion = 'v21.0';
  }

  /**
   * Send WhatsApp text message using Meta Graph API
   */
  async sendMessage({ to, textMessage }) {
    logger.info(`[WhatsApp Integration] Dispatching WhatsApp message to: ${to}`);

    if (!this.accessToken || !this.phoneNumberId) {
      logger.warn('[WhatsApp Integration] WhatsApp Business credentials not configured in .env. Message recorded for dispatch.');
      return {
        success: false,
        status: 'PENDING_CONFIGURATION',
        error: 'WhatsApp Business credentials not configured in environment.',
      };
    }

    // Clean phone number (remove +, spaces, hyphens)
    const cleanNumber = to.replace(/[^0-9]/g, '');

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      const res = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanNumber,
          type: 'text',
          text: { preview_url: false, body: textMessage },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 12000,
        }
      );

      const messageId = res.data.messages?.[0]?.id;
      logger.info(`[WhatsApp Integration] Message delivered. ID: ${messageId}`);

      return {
        success: true,
        provider: 'WHATSAPP_CLOUD_API',
        messageId,
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      logger.error('[WhatsApp Integration] Cloud API delivery error:', errMsg);
      throw new Error(`WhatsApp API delivery failed: ${errMsg}`);
    }
  }

  /**
   * Verify Webhook challenge from Meta
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === config.whatsappVerifyToken) {
      return challenge;
    }
    return null;
  }
}

export const whatsappAdapter = new WhatsAppAdapter();
export default whatsappAdapter;
