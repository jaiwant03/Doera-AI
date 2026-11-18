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

    const token = jwt.sign({ userId: user._id, role: user.role, executionMode: 'DEMO', authProvider: 'local' }, config.jwtSecret, {
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
        executionMode: 'DEMO',
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

    // Enforce server-side access mode:
    // Only verified Google OAuth identities qualify for REAL mode;
    // local password accounts always use DEMO mode.
    const isGoogleAuth = user.authProvider === 'google' && !!user.googleSubjectId;
    const effectiveMode = isGoogleAuth ? (user.executionMode || 'REAL') : 'DEMO';
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
    const effectiveMode = isGoogleAuth ? (user.executionMode || 'REAL') : 'DEMO';
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
      $or: [{ googleId: profile.googleId }, { email: profile.email.toLowerCase() }],
    });

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email.toLowerCase(),
        googleId: profile.googleId,
        avatar: profile.avatar,
        subscription: {
          plan: 'free',
          status: 'active',
        },
      });
      logger.info(`[Google Auth] Created new user via Google Sign-In: ${user.email}`);
    } else {
      if (!user.googleId) user.googleId = profile.googleId;
      if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
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
    const { tokens, profile } = await googleAuthService.exchangeCodeForTokens(code);

    let user = await User.findOne({
      $or: [{ googleId: profile.googleId }, { email: profile.email.toLowerCase() }],
    });

    if (!user) {
      user = await User.create({
        name: profile.name,
        email: profile.email.toLowerCase(),
        googleId: profile.googleId,
        avatar: profile.avatar,
        subscription: {
          plan: 'free',
          status: 'active',
        },
      });
      logger.info(`[Google Auth] Registered new user via OAuth Callback: ${user.email}`);
    } else {
      if (!user.googleId) user.googleId = profile.googleId;
      if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
      await user.save();
    }

    // If refresh token returned, automatically connect Google Calendar & Gmail integration
    if (tokens.refresh_token) {
      const encryptedRefreshToken = encrypt(tokens.refresh_token);

      await Integration.findOneAndUpdate(
        { userId: user._id, provider: 'google_calendar' },
        {
          accountEmail: profile.email,
          encryptedRefreshToken,
          status: 'connected',
          lastVerifiedAt: new Date(),
        },
        { upsert: true }
      );

      await Integration.findOneAndUpdate(
        { userId: user._id, provider: 'gmail' },
        {
          accountEmail: profile.email,
          encryptedRefreshToken,
          status: 'connected',
          lastVerifiedAt: new Date(),
        },
        { upsert: true }
      );

      logger.info(`[Google Auth] Stored Google Calendar & Gmail tokens for user: ${user.email}`);
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, config.jwtSecret, {
      expiresIn: '7d',
    });

    // Redirect user to frontend workspace with active token
    return res.redirect(`${config.clientUrl}/chat?token=${encodeURIComponent(token)}`);
  } catch (err) {
    logger.error('[Google Auth] Callback exchange failed:', err.message);
    return res.redirect(`${config.clientUrl}/login?error=GoogleAuthFailed`);
  }
};
