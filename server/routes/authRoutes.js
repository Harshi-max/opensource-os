import express from 'express';
import { authController } from '../controllers/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);

// GitHub OAuth routes
router.get('/github/url', authMiddleware, authController.getGitHubAuthUrl);
router.get('/github/callback', authController.githubOAuthCallback);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.put('/profile', authMiddleware, authController.updateProfile);

export default router;
