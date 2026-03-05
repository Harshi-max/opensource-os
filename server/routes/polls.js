import express from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { apiLimiter, pollLimiter } from '../middleware/rateLimiter.js';
import {
  createPoll,
  getRoomPolls,
  getPoll,
  castVote,
  closePoll,
  getPollAIResponse,
} from '../controllers/pollController.js';

const router = express.Router();

/**
 * Public routes
 */
router.get('/:pollId', optionalAuthMiddleware, apiLimiter, getPoll);
router.get('/:pollId/ai-response', apiLimiter, getPollAIResponse);

/**
 * Protected routes
 */
router.post('/', authMiddleware, pollLimiter, createPoll);
router.post('/:pollId/vote', authMiddleware, castVote);
router.post('/:pollId/close', authMiddleware, closePoll);

export default router;
