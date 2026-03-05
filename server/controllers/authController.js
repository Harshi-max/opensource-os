import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { asyncHandler } from '../middleware/errorHandler.js';
import { registerUser, loginUser, getUserById, generateToken } from '../services/authService.js';
import { User } from '../models/index.js';
import axios from 'axios';
import crypto from 'crypto';
import { encrypt } from '../utils/encryption.js';

// Ensure .env is loaded from server directory (in case this module loads before index.js dotenv)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const getGitHubOAuthConfig = () => ({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
});

// Simple cookie parser to avoid extra dependencies
const parseCookies = (cookieHeader = '') => {
  return cookieHeader.split(';').reduce((acc, part) => {
    const [k, v] = part.split('=');
    if (!k || !v) return acc;
    acc[k.trim()] = decodeURIComponent(v.trim());
    return acc;
  }, {});
};

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, role } = req.body;

  // Validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const result = await registerUser({ name, email, password, role });
  res.status(201).json(result);
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await loginUser(email, password);
    res.json(result);
  } catch (e) {
    // invalid credentials should return 401 instead of 500
    return res.status(401).json({ error: e.message || 'Invalid email or password' });
  }
});

/**
 * Get GitHub OAuth authorization URL
 * GET /api/auth/github/url
 *
 * Supports two modes:
 * - mode=login (default): sign in / sign up with GitHub
 * - mode=link: link GitHub account to existing authenticated user
 */
export const getGitHubAuthUrl = asyncHandler(async (req, res) => {
  const { clientId, clientSecret } = getGitHubOAuthConfig();
  if (!clientId?.trim() || !clientSecret?.trim()) {
    return res.status(503).json({
      error: 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the server .env file and restart the server.',
    });
  }

  const mode = req.query.mode === 'link' ? 'link' : 'login';

  // For link mode, require authenticated user
  let userId = null;
  if (mode === 'link') {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required to link GitHub account' });
    }
    userId = req.userId.toString();
  }

  const state = crypto.randomBytes(16).toString('hex');
  const meta = {
    mode,
    userId,
  };

  // Store state + metadata in short-lived HttpOnly cookies for CSRF protection
  const tenMinutes = 10 * 60;
  res.setHeader('Set-Cookie', [
    `github_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${tenMinutes}`,
    `github_oauth_meta=${encodeURIComponent(JSON.stringify(meta))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${tenMinutes}`,
  ]);

  // GitHub requires an absolute redirect_uri that exactly matches the OAuth App callback URL
  let redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URL;
  if (!redirectUri) {
    const base = process.env.SERVER_URL || (req.protocol + '://' + (req.get('host') || 'localhost:5000'));
    redirectUri = base.replace(/\/$/, '') + '/api/auth/github/callback';
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  });

  const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url });
});

/**
 * GitHub OAuth callback handler
 * GET /api/auth/github/callback?code=...&state=...
 */
export const githubOAuthCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;
  const { clientId, clientSecret } = getGitHubOAuthConfig();

  if (!code || !state) {
    return res.status(400).send('Missing OAuth code or state');
  }

  if (!clientId?.trim() || !clientSecret?.trim()) {
    return res.status(500).send('GitHub OAuth not configured');
  }

  // Validate state from cookies
  const cookies = parseCookies(req.headers.cookie || '');
  if (!cookies.github_oauth_state || cookies.github_oauth_state !== state) {
    return res.status(400).send('Invalid OAuth state');
  }

  let meta = { mode: 'login', userId: null };
  if (cookies.github_oauth_meta) {
    try {
      meta = JSON.parse(cookies.github_oauth_meta);
    } catch {
      // ignore parse error, fallback to defaults
    }
  }

  // Exchange code for access token
  const tokenResp = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
    },
    {
      headers: { Accept: 'application/json' },
    }
  );

  const accessToken = tokenResp.data.access_token;
  if (!accessToken) {
    return res.status(500).send('Failed to obtain GitHub access token');
  }

  // Fetch GitHub user profile
  const userResp = await axios.get('https://api.github.com/user', {
    headers: {
      Authorization: `token ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  const gh = userResp.data;
  const githubId = String(gh.id);
  const githubUsername = gh.login;
  const githubAvatar = gh.avatar_url;

  // Fetch primary email if available (may be null)
  let primaryEmail = gh.email;
  if (!primaryEmail) {
    try {
      const emailsResp = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const primary = emailsResp.data.find((e) => e.primary) || emailsResp.data[0];
      primaryEmail = primary?.email || null;
    } catch {
      // ignore, email is optional
    }
  }

  const encryptedToken = encrypt(accessToken);

  let user;

  if (meta.mode === 'link' && meta.userId) {
    // Link GitHub to existing platform user
    user = await User.findById(meta.userId);
    if (!user) {
      return res.status(400).send('User not found while linking GitHub account');
    }

    user.githubUsername = githubUsername;
    user.githubId = githubId;
    user.githubAvatar = githubAvatar;
    user.githubAccessToken = encryptedToken;
    if (!user.avatar) {
      user.avatar = githubAvatar;
    }
    await user.save();
  } else {
    // Login / sign up with GitHub identity
    user =
      (await User.findOne({ githubId })) ||
      (primaryEmail ? await User.findOne({ email: primaryEmail }) : null);

    if (!user) {
      // Create GitHub-only account; password remains unset/optional
      user = new User({
        name: gh.name || githubUsername,
        email: primaryEmail || `github_${githubId}@no-email.local`,
        githubUsername,
        githubId,
        githubAvatar,
        avatar: githubAvatar,
        role: 'contributor',
        roles: ['contributor'],
      });
    } else {
      // Update any missing GitHub metadata
      user.githubUsername = githubUsername;
      user.githubId = githubId;
      user.githubAvatar = githubAvatar;
      if (!user.avatar) {
        user.avatar = githubAvatar;
      }
      if (!user.role) {
        user.role = 'contributor';
      }
      if (!Array.isArray(user.roles) || user.roles.length === 0) {
        user.roles = ['contributor'];
      }
    }

    user.githubAccessToken = encryptedToken;
    await user.save();
  }

  const token = generateToken(user._id);

  // Redirect back to SPA with JWT so client can finalize login/link
  const redirectUrl = new URL('/oauth/github/callback', CLIENT_URL);
  redirectUrl.searchParams.set('token', token);
  redirectUrl.searchParams.set('mode', meta.mode === 'link' ? 'link' : 'login');

  res.redirect(redirectUrl.toString());
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await getUserById(req.userId);
  res.json(user);
});

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.userId,
    { name, bio, avatar },
    { new: true, runValidators: true }
  );

  res.json(user);
});
