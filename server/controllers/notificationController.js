import { asyncHandler } from '../middleware/errorHandler.js';
import { Message } from '../models/index.js';

/**
 * Get notifications (messages where the current user was mentioned)
 * GET /api/notifications
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { limit = 20 } = req.query;

  const messages = await Message.find({
    mentions: userId,
  })
    .populate('userId', 'name avatar githubUsername')
    .populate('roomId', 'name')
    .sort({ createdAt: -1 })
    .limit(Math.min(parseInt(limit, 10) || 20, 50))
    .lean();

  const notifications = messages.map((m) => ({
    _id: m._id,
    type: 'mention',
    messageId: m._id,
    roomId: m.roomId?._id,
    roomName: m.roomId ? `${m.roomId.repoOwner || ''}/${m.roomId.repoName || ''}`.replace(/^\/+|\/+$/g, '') || null : null,
    fromUser: m.userId
      ? {
          _id: m.userId._id,
          name: m.userId.name,
          avatar: m.userId.avatar,
          githubUsername: m.userId.githubUsername,
        }
      : null,
    content: m.content?.substring(0, 150) + (m.content?.length > 150 ? '…' : ''),
    createdAt: m.createdAt,
  }));

  res.json(notifications);
});
