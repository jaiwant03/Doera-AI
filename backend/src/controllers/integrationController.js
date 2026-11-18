import Integration from '../models/Integration.js';
import { encrypt } from '../utils/encryption.js';
import { config } from '../config/env.js';

export const getIntegrations = async (req, res, next) => {
  try {
    const list = await Integration.find({ userId: req.user._id });
    const integrationMap = {};

    list.forEach((item) => {
      integrationMap[item.provider] = {
        connected: item.status === 'connected',
        email: item.accountEmail,
        lastVerifiedAt: item.lastVerifiedAt,
      };
    });

    res.json({
      integrations: {
        gmail: integrationMap.gmail || { connected: false },
        calendar: integrationMap.google_calendar || { connected: false },
        whatsapp: { configured: !!config.whatsappAccessToken && !!config.whatsappPhoneNumberId },
        googlePlaces: { configured: !!config.googlePlacesApiKey },
        workflows: { engine: 'Native Node.js Autonomous Engine', status: 'active' },
        llm: { provider: config.llmProvider, model: 'llama-3.3-70b-versatile' },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const connectGmail = async (req, res, next) => {
  try {
    const { email, refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    const encryptedRefreshToken = encrypt(refreshToken);

    const integration = await Integration.findOneAndUpdate(
      { userId: req.user._id, provider: 'gmail' },
      {
        accountEmail: email,
        encryptedRefreshToken,
        status: 'connected',
        lastVerifiedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, integration: { provider: 'gmail', status: 'connected', email } });
  } catch (error) {
    next(error);
  }
};

export const connectGoogleCalendar = async (req, res, next) => {
  try {
    const { email, refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required.' });
    }

    const encryptedRefreshToken = encrypt(refreshToken);

    const integration = await Integration.findOneAndUpdate(
      { userId: req.user._id, provider: 'google_calendar' },
      {
        accountEmail: email,
        encryptedRefreshToken,
        status: 'connected',
        lastVerifiedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, integration: { provider: 'google_calendar', status: 'connected', email } });
  } catch (error) {
    next(error);
  }
};
