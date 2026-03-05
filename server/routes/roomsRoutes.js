import express from 'express';
import {
  roomController,
  pollController,
  analyticsController,
  messageController,
  doubtPollController,
  channelController,
} from '../controllers/index.js';
import { authMiddleware, optionalAuthMiddleware, requireGitHubLinked } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply rate limiting to all routes
router.use(apiLimiter);

// Room routes
router.post('/', authMiddleware, requireGitHubLinked, roomController.createRoom);
router.get('/', optionalAuthMiddleware, roomController.getAllRooms);

// Meeting summaries route (must come before /:roomId routes)
router.get('/meeting-summaries', optionalAuthMiddleware, roomController.getMeetingSummaries);

// Debug route - all meetings
router.get('/debug/all-meetings', roomController.getAllMeetingsDebug);

router.get('/:roomId', optionalAuthMiddleware, roomController.getRoom);
router.post('/:roomId/join', authMiddleware, requireGitHubLinked, roomController.joinRoom);
router.post('/:roomId/leave', authMiddleware, requireGitHubLinked, roomController.leaveRoom);
router.get('/:roomId/members', optionalAuthMiddleware, roomController.getRoomMembers);

// Message routes
router.get('/:roomId/messages', optionalAuthMiddleware, messageController.getRoomMessages);
router.post('/:roomId/messages', authMiddleware, requireGitHubLinked, messageController.createMessage);

// AI chat route for asking questions
import { askQuestion } from '../controllers/aiController.js';
router.post('/:roomId/ai', authMiddleware, requireGitHubLinked, askQuestion);
router.post('/ai', authMiddleware, requireGitHubLinked, askQuestion); // global if no room specified

// Poll routes
router.get('/:roomId/polls', optionalAuthMiddleware, pollController.getRoomPolls);
router.post('/:roomId/polls', authMiddleware, requireGitHubLinked, pollController.createPoll);

// Analytics routes - with optional auth to allow viewing without login initially
router.get('/:roomId/analytics', optionalAuthMiddleware, analyticsController.getRoomAnalytics);
router.get('/:roomId/contributors', optionalAuthMiddleware, analyticsController.getTopContributorsHandler);
router.get('/:roomId/confusing-topics', optionalAuthMiddleware, analyticsController.getMostConfusingTopicsHandler);

// Doubt Polling routes
router.get('/:roomId/leaderboard', optionalAuthMiddleware, doubtPollController.getRoomLeaderboardHandler);
router.get('/:roomId/doubt-stats', optionalAuthMiddleware, doubtPollController.getDoubtStats);

// Channel routes
router.get('/:roomId/channels', optionalAuthMiddleware, channelController.getRoomChannels);
router.post('/:roomId/channels', authMiddleware, channelController.createChannel);
router.post('/:roomId/initialize-channels', authMiddleware, channelController.initializeDefaultChannels);

// GitHub data routes
router.get('/:roomId/issues', optionalAuthMiddleware, roomController.getRoomIssues);
router.get('/:roomId/pull-requests', optionalAuthMiddleware, roomController.getRoomPullRequests);
router.get('/:roomId/github-stats', optionalAuthMiddleware, roomController.getGitHubStats);

// Meeting summaries route
router.get('/meeting-summaries', optionalAuthMiddleware, roomController.getMeetingSummaries);
router.get('/:roomId/meeting-summaries', optionalAuthMiddleware, roomController.getMeetingSummaries);

// Onboarding analytics route
router.get('/:roomId/onboarding-analytics', optionalAuthMiddleware, roomController.getOnboardingAnalytics);

export default router;
