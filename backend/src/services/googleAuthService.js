import { google } from 'googleapis';
import axios from 'axios';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * DOERA AI — Google OAuth & Authentication Service
 */
class GoogleAuthService {
  constructor() {
    this.clientId = config.googleClientId;
    this.clientSecret = config.googleClientSecret;
    this.redirectUri = config.googleRedirectUri || 'http://localhost:5000/api/integrations/google/callback';
  }

  getOAuth2Client() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  /**
   * Generate Google OAuth consent URL for user login or integration
   */
  getAuthUrl(state = 'login') {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/gmail.send',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state,
    });
  }

  /**
   * Exchange OAuth authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(code) {
    try {
      const oauth2Client = this.getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: profile } = await oauth2.userinfo.get();

      return {
        tokens,
        profile: {
          googleId: profile.id,
          email: profile.email,
          name: profile.name || profile.email?.split('@')[0],
          avatar: profile.picture,
        },
      };
    } catch (err) {
      logger.error('[Google AuthService] exchangeCodeForTokens failed:', err.message);
      throw err;
    }
  }

  /**
   * Verify Google ID token from Google Identity Services (One-Tap / button popup)
   */
  async verifyGoogleIdToken(idToken) {
    try {
      const oauth2Client = this.getOAuth2Client();
      try {
        const ticket = await oauth2Client.verifyIdToken({
          idToken,
          audience: this.clientId,
        });
        const payload = ticket.getPayload();
        return {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name || payload.email?.split('@')[0],
          avatar: payload.picture,
        };
      } catch (clientErr) {
        // Fallback to Google's public tokeninfo endpoint
        const res = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, {
          timeout: 6000,
        });
        const payload = res.data;
        return {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name || payload.email?.split('@')[0],
          avatar: payload.picture,
        };
      }
    } catch (err) {
      logger.error('[Google AuthService] verifyGoogleIdToken failed:', err.message);
      throw new Error('Invalid Google credential token.');
    }
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
