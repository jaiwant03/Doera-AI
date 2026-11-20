import jwt from 'jsonwebtoken';
import Integration from '../models/Integration.js';
import User from '../models/User.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { config } from '../config/env.js';
import googleAuthService from '../services/googleAuthService.js';
import { logger } from '../utils/logger.js';

export const getIntegrations = async (req, res, next) => {
  try {
    const list = await Integration.find({ userId: req.user._id });
    const integrationMap = {};

    list.forEach((item) => {
      integrationMap[item.provider] = {
        connected: item.status === 'connected',
        email: item.accountEmail || item.providerEmail,
        lastVerifiedAt: item.lastVerifiedAt,
      };
    });

    const isGoogleAuth = req.user.authProvider === 'google' && !!req.user.googleSubjectId;
    const effectiveMode = 'UNIFIED';

    res.json({
      authProvider: isGoogleAuth ? 'google' : 'local',
      executionMode: effectiveMode,
      isGoogleAuth,
      integrations: {
        gmail: integrationMap.gmail || { connected: false },
        googlePlaces: { configured: !!config.googlePlacesApiKey },
        workflows: { engine: 'Native Node.js Autonomous Engine', status: 'active' },
        llm: { provider: config.llmProvider, model: 'llama-3.3-70b-versatile' },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate OAuth consent URL specifically for "Connect Gmail for Automation"
 * Contains a securely signed JWT in the OAuth state parameter identifying the user.
 */
export const getGmailAuthUrl = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Cryptographically signed state token (expires in 15 mins)
    const signedToken = jwt.sign(
      { userId, purpose: 'gmail_connect', ts: Date.now() },
      config.jwtSecret,
      { expiresIn: '15m' }
    );

    const stateParam = `gmail_${signedToken}`;
    const url = googleAuthService.getGmailConnectAuthUrl(stateParam);

    res.json({
      url,
      clientId: config.googleClientId,
      scopes: ['https://www.googleapis.com/auth/gmail.send', 'openid', 'email'],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Disconnect Gmail integration and revoke OAuth token
 */
export const disconnectGmail = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const integration = await Integration.findOne({ userId, provider: 'gmail' });

    if (integration) {
      if (integration.encryptedRefreshToken) {
        try {
          const refreshToken = decrypt(integration.encryptedRefreshToken);
          await googleAuthService.revokeToken(refreshToken);
        } catch (revokeErr) {
          logger.warn('[IntegrationController] Revoke token notice:', revokeErr.message);
        }
      }

      integration.status = 'disconnected';
      integration.connectionStatus = 'disconnected';
      integration.encryptedRefreshToken = null;
      integration.encryptedAccessToken = null;
      await integration.save();
    }

    await User.findByIdAndUpdate(userId, {
      gmailIntegrationStatus: 'disconnected',
    });

    logger.info(`[IntegrationController] Disconnected and revoked Gmail for user: ${req.user.email}`);
    res.json({
      success: true,
      message: 'Gmail integration disconnected and authorization revoked successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Return current user integration status
 */
export const getIntegrationStatus = async (req, res, next) => {
  try {
    const user = req.user;
    const gmail = await Integration.findOne({
      userId: user._id,
      provider: 'gmail',
      status: 'connected',
    });

    const isGoogleAuth = user.authProvider === 'google' && !!user.googleSubjectId;
    const effectiveMode = 'UNIFIED';

    res.json({
      userId: user._id,
      email: user.email,
      authProvider: isGoogleAuth ? 'google' : 'local',
      executionMode: effectiveMode,
      isGoogleAuth,
      gmail: {
        connected: !!gmail,
        email: gmail?.accountEmail || gmail?.providerEmail || null,
        lastVerifiedAt: gmail?.lastVerifiedAt || null,
        status: gmail?.status || 'disconnected',
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
