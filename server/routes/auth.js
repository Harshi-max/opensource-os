import express from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authMiddleware } from '../middleware/auth.js';
import { register, login, getCurrentUser, updateProfile } from '../controllers/authController.js';

const router = express.Router();

/**
 * Public routes
 */
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

/**
 * Protected routes
 */
router.get('/me', authMiddleware, getCurrentUser);
router.put('/profile', authMiddleware, updateProfile);

export default router;
