import express from 'express';
import { pollController } from '../controllers/index.js';
import { authMiddleware, requireGitHubLinked } from '../middleware/auth.js';
import { apiLimiter, pollLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

// Create poll from body (alternative method with roomId in body)
router.post('/', authMiddleware, requireGitHubLinked, pollLimiter, pollController.createPoll);

// Get single poll
router.get('/:pollId', pollController.getPoll);

// Post vote
router.post('/:pollId/vote', authMiddleware, requireGitHubLinked, pollController.castVote);

// Close poll and get AI response
router.post('/:pollId/close', authMiddleware, requireGitHubLinked, pollController.closePoll);

// Get AI response
router.get('/:pollId/ai-response', pollController.getPollAIResponse);

export default router;
