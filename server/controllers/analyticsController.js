import { asyncHandler } from '../middleware/errorHandler.js';
import {
  calculateRoomAnalytics,
  getTopContributors,
  getMostConfusingTopics,
} from '../services/analyticsService.js';

/**
 * Get room analytics
 * GET /api/rooms/:roomId/analytics
 */
export const getRoomAnalytics = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const analytics = await calculateRoomAnalytics(roomId);
  res.json(analytics);
});

/**
 * Get top contributors in a room
 * GET /api/rooms/:roomId/contributors
 */
export const getTopContributorsHandler = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 10 } = req.query;

  const contributors = await getTopContributors(roomId, parseInt(limit));
  res.json(contributors);
});

/**
 * Get most confusing topics in a room
 * GET /api/rooms/:roomId/confusing-topics
 */
export const getMostConfusingTopicsHandler = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 5 } = req.query;

  const topics = await getMostConfusingTopics(roomId, parseInt(limit));
  res.json(topics);
});
