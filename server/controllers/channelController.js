import { asyncHandler } from '../middleware/errorHandler.js';
import { Channel, Room } from '../models/index.js';

/**
 * Channel Controller
 * Manages room channels (#setup-help, #issue-discussion, #pr-review, etc.)
 */

/**
 * Get all channels for a room
 * GET /api/rooms/:roomId/channels
 */
export const getRoomChannels = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const channels = await Channel.find({ roomId, isActive: true })
    .sort({ order: 1, createdAt: 1 });

  res.json(channels);
});

/**
 * Create channel (initially used for setup)
 * POST /api/rooms/:roomId/channels
 */
export const createChannel = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { name, displayName, description, icon } = req.body;

  // Check if room exists
  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Check if channel already exists
  const existing = await Channel.findOne({ roomId, name });
  if (existing) {
    return res.status(400).json({ error: 'Channel already exists' });
  }

  const channel = new Channel({
    roomId,
    name,
    displayName: displayName || name,
    description,
    icon: icon || '💬',
  });

  await channel.save();

  res.status(201).json(channel);
});

/**
 * Initialize default channels for a room
 * POST /api/rooms/:roomId/initialize-channels
 */
export const initializeDefaultChannels = asyncHandler(async (req, res) => {
  const { roomId } = req.params;

  const room = await Room.findById(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  // Default channels
  const defaultChannels = [
    { name: 'general', displayName: 'General', icon: '💬', order: 0 },
    { name: 'setup-help', displayName: 'Setup Help', icon: '⚙️', order: 1 },
    { name: 'issue-discussion', displayName: 'Issue Discussion', icon: '🐛', order: 2 },
    { name: 'pr-review', displayName: 'PR Review', icon: '📝', order: 3 },
    { name: 'code-review', displayName: 'Code Review', icon: '👀', order: 4 },
    { name: 'troubleshooting', displayName: 'Troubleshooting', icon: '🚨', order: 5 },
  ];

  const existing = await Channel.find({ roomId });
  const existingNames = existing.map((c) => c.name);

  const toCreate = defaultChannels.filter((ch) => !existingNames.includes(ch.name));

  const created = await Channel.insertMany(
    toCreate.map((ch) => ({
      ...ch,
      roomId,
    }))
  );

  res.json({
    message: `Created ${created.length} default channels`,
    channels: created,
  });
});

/**
 * Get channel details
 * GET /api/channels/:channelId
 */
export const getChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  const channel = await Channel.findById(channelId);

  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  res.json(channel);
});

/**
 * Update channel
 * PUT /api/channels/:channelId
 */
export const updateChannel = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const { displayName, description, icon } = req.body;

  const channel = await Channel.findById(channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }

  if (displayName) channel.displayName = displayName;
  if (description !== undefined) channel.description = description;
  if (icon) channel.icon = icon;

  await channel.save();

  res.json(channel);
});

export default {
  getRoomChannels,
  createChannel,
  initializeDefaultChannels,
  getChannel,
  updateChannel,
};
