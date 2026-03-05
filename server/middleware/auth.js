import { verifyToken } from '../services/authService.js';
import { User } from '../models/index.js';

/**
 * Middleware to authenticate requests using JWT
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message || 'Invalid token' });
  }
};

/**
 * Middleware for optional authentication
 */
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (user) {
        req.user = user;
        req.userId = decoded.userId;
      }
    }
  } catch (error) {
    console.log('Optional auth failed:', error.message);
    // Silently fail for optional auth
  }

  next();
};

/**
 * Middleware to enforce GitHub identity binding before
 * accessing repository-specific collaboration features.
 */
export const requireGitHubLinked = (req, res, next) => {
  if (!req.user || !req.user.githubUsername) {
    return res
      .status(403)
      .json({ error: 'Please connect your GitHub account to join this repository.' });
  }

  next();
};
