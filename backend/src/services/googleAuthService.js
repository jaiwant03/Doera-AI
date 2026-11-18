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
   * Minimal scopes for ordinary user login / sign-in (NO Gmail sending permission)
   */
  getLoginAuthUrl(state = 'login') {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'online',
      prompt: 'select_account',
      scope: scopes,
      state,
    });
  }

  /**
   * Explicit, separate OAuth consent URL specifically for "Connect Gmail for Automation"
   * Requests https://www.googleapis.com/auth/gmail.send with offline access for a refresh token.
   */
  getGmailConnectAuthUrl(signedState) {
    const oauth2Client = this.getOAuth2Client();
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.send',
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: true,
      scope: scopes,
      state: signedState,
    });
  }

  /**
   * Backward-compatible getAuthUrl — routes to login scopes unless state indicates integration
   */
  getAuthUrl(state = 'login') {
    if (typeof state === 'string' && (state.startsWith('gmail_') || state.includes('gmail_connect'))) {
      return this.getGmailConnectAuthUrl(state);
    }
    return this.getLoginAuthUrl(state);
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

  /**
   * Securely revoke OAuth token with Google
   */
  async revokeToken(token) {
    if (!token) return { success: false, message: 'No token provided' };
    try {
      const oauth2Client = this.getOAuth2Client();
      await oauth2Client.revokeToken(token);
      logger.info('[Google AuthService] Successfully revoked Google token.');
      return { success: true };
    } catch (err) {
      // Fallback direct revocation call
      try {
        await axios.post(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, null, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        });
        logger.info('[Google AuthService] Token revoked via direct endpoint fallback.');
        return { success: true };
      } catch (axErr) {
        logger.warn('[Google AuthService] Revocation warning (token may already be expired or revoked):', axErr.message);
        return { success: false, error: axErr.message };
      }
    }
  }

  /**
   * Refreshes access token on demand for the user's authorized Gmail integration
   */
  async getFreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required to obtain fresh access credentials.');
    }
    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const { token, res } = await oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Failed to refresh access token from Google.');
    }
    return {
      accessToken: token,
      expiryDate: res?.data?.expiry_date ? new Date(res.data.expiry_date) : new Date(Date.now() + 3500 * 1000),
    };
  }
}

export const googleAuthService = new GoogleAuthService();
export default googleAuthService;
