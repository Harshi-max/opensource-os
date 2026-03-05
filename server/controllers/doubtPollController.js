import { asyncHandler } from '../middleware/errorHandler.js';
import { DoubtPoll, Channel, Reputation, Room } from '../models/index.js';
import { getRoomLeaderboard } from '../services/reputationService.js';

/**
 * Doubt Poll Controller
 * Handles REST API endpoints for doubt polling features
 */

/**
 * Get all doubt polls for a room/channel
 * GET /api/doubt-polls/:roomId/:channelId
 */
export const getChannelDoubtPolls = asyncHandler(async (req, res) => {
  const { roomId, channelId } = req.params;
  const { status = 'open', limit = 20, skip = 0 } = req.query;

  const query = { roomId, channelId };
  if (status) query.status = status;

  const polls = await DoubtPoll.find(query)
    .populate('userId', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit));

  const total = await DoubtPoll.countDocuments(query);

  res.json({
    polls,
    total,
    status,
  });
});

/**
 * Get single doubt poll details
 * GET /api/doubt-polls/:doubtPollId
 */
export const getDoubtPoll = asyncHandler(async (req, res) => {
  const { doubtPollId } = req.params;

  const poll = await DoubtPoll.findById(doubtPollId)
    .populate('userId', 'name avatar reputation')
    .populate('messageId');

  if (!poll) {
    return res.status(404).json({ error: 'Doubt poll not found' });
  }

  res.json(poll);
});

/**
 * Mark poll as helpful
 * POST /api/doubt-polls/:doubtPollId/helpful
 */
export const markHelpful = asyncHandler(async (req, res) => {
  const { doubtPollId } = req.params;
  const { helpful } = req.body;

  const poll = await DoubtPoll.findById(doubtPollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  poll.helpful = helpful === true;
  poll.helpfulCount = helpful ? (poll.helpfulCount || 0) + 1 : poll.helpfulCount;

  await poll.save();

  res.json({ helpful: poll.helpful, count: poll.helpfulCount });
});

/**
 * Get room leaderboard
 * GET /api/rooms/:roomId/leaderboard
 */
export const getRoomLeaderboardHandler = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 10 } = req.query;

  const leaderboard = await getRoomLeaderboard(roomId, parseInt(limit));

  res.json(leaderboard);
});

/**
 * Get doubt poll statistics for a room
 * GET /api/rooms/:roomId/doubt-stats
 */
export const getDoubtStats = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const totalPolls = await DoubtPoll.countDocuments({ roomId });
  const resolvedPolls = await DoubtPoll.countDocuments({ roomId, status: 'resolved' });
  const openPolls = await DoubtPoll.countDocuments({ roomId, status: 'open' });

  const avgConsensus = await DoubtPoll.aggregate([
    { $match: { roomId: require('mongoose').Types.ObjectId(roomId) } },
    { $group: { _id: null, avg: { $avg: '$consensusPercentage' } } },
  ]);

  const topContributors = await DoubtPoll.aggregate([
    { $match: { roomId: require('mongoose').Types.ObjectId(roomId) } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
  ]);

  res.json({
    totalPolls,
    resolvedPolls,
    openPolls,
    avgConsensus: avgConsensus[0]?.avg || 0,
    topContributors,
  });
});

export default {
  getChannelDoubtPolls,
  getDoubtPoll,
  markHelpful,
  getRoomLeaderboardHandler,
  getDoubtStats,
};
