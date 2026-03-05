import express from 'express';
import {
  getChannelDoubtPolls,
  getDoubtPoll,
  markHelpful,
  getRoomLeaderboardHandler,
  getDoubtStats,
} from '../controllers/doubtPollController.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Doubt Poll Routes
 * Handles real-time doubt polling system
 */

// Get all doubt polls for a channel
// GET /api/doubt-polls/:roomId/:channelId?status=open&limit=20&skip=0
router.get('/:roomId/:channelId', optionalAuthMiddleware, getChannelDoubtPolls);

// Get single doubt poll details
// GET /api/doubt-polls/:doubtPollId
router.get('/poll/:doubtPollId', optionalAuthMiddleware, getDoubtPoll);

// Mark poll as helpful
// POST /api/doubt-polls/:doubtPollId/helpful
router.post('/:doubtPollId/helpful', optionalAuthMiddleware, markHelpful);

export default router;
