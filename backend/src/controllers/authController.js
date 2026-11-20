import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Integration from '../models/Integration.js';
import { config } from '../config/env.js';
import googleAuthService from '../services/googleAuthService.js';
import { encrypt } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'An account with this email already exists. Please sign in or reset your password.',
        userExists: true
      });
    }

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      authProvider: 'local',
      googleSubjectId: null,
      googleEmail: null,
      executionMode: 'DEMO',
      gmailIntegrationStatus: 'not_connected',
      subscription: {
        plan: 'free',
        status: 'active',
      },
    });

    const token = jwt.sign({ userId: user._id, role: user.role, executionMode: 'UNIFIED', authProvider: 'local' }, config.jwtSecret, {
      expiresIn: '7d',
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: 'local',
        googleSubjectId: null,
        googleEmail: null,
        executionMode: 'UNIFIED',
        gmailIntegrationStatus: 'not_connected',
        connectedGmailEmail: null,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Check for user with cleaned email
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(401).json({ 
        error: 'No account found with this email. Please check your email or create a new account.',
        userExists: false
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: 'Invalid password. Please try again or use the password reset option below.',
        userExists: true
      });
    }

    // Check if user has an active Gmail integration
    const gmailIntegration = await Integration.findOne({
      userId: user._id,
      provider: 'gmail',
      status: 'connected',
    });

    // Unified AI Execution Mode:
    // All authenticated users operate with full genuine AI capabilities.
    const isGoogleAuth = user.authProvider === 'google' && !!user.googleSubjectId;
    const effectiveMode = 'UNIFIED';
    const gmailStatus = gmailIntegration ? 'connected' : (user.gmailIntegrationStatus || 'not_connected');

    const token = jwt.sign(
      { userId: user._id, role: user.role, executionMode: effectiveMode, authProvider: isGoogleAuth ? 'google' : 'local' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authProvider: isGoogleAuth ? 'google' : 'local',
        googleSubjectId: user.googleSubjectId || null,
        googleEmail: user.googleEmail || null,
        executionMode: effectiveMode,
        gmailIntegrationStatus: gmailStatus,
        connectedGmailEmail: gmailIntegration?.accountEmail || gmailIntegration?.providerEmail || null,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Please provide email and new password.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email address.' });
    }

    user.password = newPassword;
    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, {
      expiresIn: '7d',
    });

    res.json({
      success: true,
      message: 'Password updated successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
};

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    const gmailIntegration = await Integration.findOne({
      userId: user._id,
      provider: 'gmail',
      status: 'connected',
    });

    const isGoogleAuth = user.authProvider === 'google' && !!user.googleSubjectId;
    const effectiveMode = 'UNIFIED';
    const gmailStatus = gmailIntegration ? 'connected' : (user.gmailIntegrationStatus || 'not_connected');

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        authProvider: isGoogleAuth ? 'google' : 'local',
        googleSubjectId: user.googleSubjectId || null,
        googleEmail: user.googleEmail || null,
        executionMode: effectiveMode,
        gmailIntegrationStatus: gmailStatus,
        connectedGmailEmail: gmailIntegration?.accountEmail || gmailIntegration?.providerEmail || null,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 6. INITIATE GOOGLE OAUTH REDIRECT OR GET URL (FOR LOGIN)
export const getGoogleAuthUrl = async (req, res, next) => {
  try {
    const { state = 'login', redirect } = req.query;
    const url = googleAuthService.getLoginAuthUrl(state);

    if (redirect === 'true' || req.headers.accept?.includes('text/html')) {
      return res.redirect(url);
    }
    res.json({ url, clientId: config.googleClientId });
  } catch (err) {
    next(err);
  }
};

// 7. GOOGLE SIGN IN VIA ONE-TAP / POPUP ID TOKEN
export const googleLoginWithCredential = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required.' });
    }

    const profile = await googleAuthService.verifyGoogleIdToken(credential);

    let user = await User.findOne({
      $or: [
        { googleSubjectId: profile.googleId },
        { googleId: profile.googleId },
        { email: profile.email.toLowerCase() },
      ],
    });

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email.toLowerCase(),
        googleId: profile.googleId,
        googleSubjectId: profile.googleId,
        googleEmail: profile.email.toLowerCase(),
        authProvider: 'google',
        executionMode: 'UNIFIED',
        gmailIntegrationStatus: 'not_connected',
        avatar: profile.avatar,
        subscription: {
          plan: 'free',
          status: 'active',
        },
      });
      logger.info(`[Google Auth] Created new user via Google Sign-In: ${user.email} (executionMode: UNIFIED)`);
    } else {
      user.googleId = profile.googleId;
      user.googleSubjectId = profile.googleId;
      user.googleEmail = profile.email.toLowerCase();
      user.authProvider = 'google';
      user.executionMode = 'UNIFIED';
      if (!user.avatar && profile.avatar) user.avatar = profile.avatar;

      // Sync active Gmail integration status
      const existingGmail = await Integration.findOne({
        userId: user._id,
        provider: 'gmail',
        status: 'connected',
      });
      user.gmailIntegrationStatus = existingGmail ? 'connected' : 'not_connected';
      await user.save();
    }

    const activeGmail = await Integration.findOne({
      userId: user._id,
      provider: 'gmail',
      status: 'connected',
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role, executionMode: 'UNIFIED', authProvider: 'google' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        authProvider: 'google',
        googleSubjectId: user.googleSubjectId,
        googleEmail: user.googleEmail,
        executionMode: 'UNIFIED',
        gmailIntegrationStatus: activeGmail ? 'connected' : 'not_connected',
        connectedGmailEmail: activeGmail?.accountEmail || activeGmail?.providerEmail || null,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    logger.error('[Google Auth] Token verification failed:', err.message);
    res.status(401).json({ error: 'Google Sign-In failed. Please try again.' });
  }
};

// 8. GOOGLE OAUTH 2.0 CALLBACK (EXCHANGES CODE -> USER & INTEGRATIONS)
export const handleGoogleCallback = async (req, res) => {
  const { code, state, error } = req.query;

  if (error || !code) {
    logger.warn('[Google Auth] Callback error received from Google:', error);
    return res.redirect(`${config.clientUrl}/login?error=GoogleAuthCanceled`);
  }

  try {
    // 1. Check if state indicates a signed "Connect Gmail for Automation" flow
    let isGmailConnect = false;
    let targetUserId = null;

    if (state) {
      try {
        const tokenStr = state.startsWith('gmail_') ? state.slice(6) : state;
        const decoded = jwt.verify(tokenStr, config.jwtSecret);
        if (decoded && decoded.purpose === 'gmail_connect' && decoded.userId) {
          isGmailConnect = true;
          targetUserId = decoded.userId;
        }
      } catch (stateErr) {
        logger.debug('[Google Auth] State is not a signed gmail_connect token:', stateErr.message);
      }
    }

    const { tokens, profile } = await googleAuthService.exchangeCodeForTokens(code);

    // Case A: Explicit Gmail authorization initiated by an authenticated user
    if (isGmailConnect && targetUserId) {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        logger.warn('[Google Auth] Target user not found for Gmail connect callback:', targetUserId);
        return res.redirect(`${config.clientUrl}/login?error=UserNotFound`);
      }

      const updateData = {
        providerAccountId: profile.googleId,
        providerEmail: profile.email.toLowerCase(),
        accountEmail: profile.email.toLowerCase(),
        grantedScopes: tokens.scope
          ? (typeof tokens.scope === 'string' ? tokens.scope.split(' ') : tokens.scope)
          : ['https://www.googleapis.com/auth/gmail.send'],
        connectionStatus: 'connected',
        status: 'connected',
        lastVerifiedAt: new Date(),
      };

      if (tokens.refresh_token) {
        updateData.encryptedRefreshToken = encrypt(tokens.refresh_token);
      }
      if (tokens.access_token) {
        updateData.encryptedAccessToken = encrypt(tokens.access_token);
      }
      if (tokens.expiry_date) {
        updateData.tokenExpiryDate = new Date(tokens.expiry_date);
      }

      await Integration.findOneAndUpdate(
        { userId: targetUser._id, provider: 'gmail' },
        updateData,
        { upsert: true, new: true }
      );

      targetUser.gmailIntegrationStatus = 'connected';
      await targetUser.save();

      logger.info(`[Google Auth] Explicit Gmail authorization linked: ${targetUser.email} -> ${profile.email}`);
      return res.redirect(`${config.clientUrl}/settings?tab=integrations&connected=gmail&email=${encodeURIComponent(profile.email)}`);
    }

    // Case B: Standard Google Sign-In / Login Callback
    let user = await User.findOne({
      $or: [
        { googleSubjectId: profile.googleId },
        { googleId: profile.googleId },
        { email: profile.email.toLowerCase() },
      ],
    });

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email.toLowerCase(),
        googleId: profile.googleId,
        googleSubjectId: profile.googleId,
        googleEmail: profile.email.toLowerCase(),
        authProvider: 'google',
        executionMode: 'REAL',
        gmailIntegrationStatus: 'not_connected',
        avatar: profile.avatar,
        subscription: {
          plan: 'free',
          status: 'active',
        },
      });
      logger.info(`[Google Auth] Registered new user via Google OAuth: ${user.email} (executionMode: REAL)`);
    } else {
      user.googleId = profile.googleId;
      user.googleSubjectId = profile.googleId;
      user.googleEmail = profile.email.toLowerCase();
      user.authProvider = 'google';
      user.executionMode = 'REAL';
      if (!user.avatar && profile.avatar) user.avatar = profile.avatar;

      const existingGmail = await Integration.findOne({
        userId: user._id,
        provider: 'gmail',
        status: 'connected',
      });
      user.gmailIntegrationStatus = existingGmail ? 'connected' : 'not_connected';
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role, executionMode: 'REAL', authProvider: 'google' },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Redirect user to frontend workspace with active token
    return res.redirect(`${config.clientUrl}/chat?token=${encodeURIComponent(token)}`);
  } catch (err) {
    logger.error('[Google Auth] Callback exchange failed:', err.message);
    return res.redirect(`${config.clientUrl}/login?error=GoogleAuthFailed`);
  }
};
