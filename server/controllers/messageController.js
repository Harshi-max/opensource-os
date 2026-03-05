import { asyncHandler } from '../middleware/errorHandler.js';
import { Message, Room, User } from '../models/index.js';

/**
 * Resolve @mentions in content to user IDs (room members only)
 */
async function resolveMentions(roomId, content) {
  const match = content.match(/@([a-zA-Z0-9_-]+)/g);
  if (!match || match.length === 0) return [];

  const room = await Room.findById(roomId).lean();
  if (!room || !room.members?.length) return [];

  const members = await User.find({ _id: { $in: room.members } })
    .select('_id name githubUsername')
    .lean();

  const mentionIds = [];
  const seen = new Set();

  for (const m of match) {
    const handle = m.slice(1).toLowerCase();
    if (handle === 'bot') continue;

    for (const u of members) {
      const nameMatch = u.name && u.name.toLowerCase() === handle;
      const ghMatch = u.githubUsername && u.githubUsername.toLowerCase() === handle;
      if ((nameMatch || ghMatch) && !seen.has(u._id.toString())) {
        mentionIds.push(u._id);
        seen.add(u._id.toString());
      }
    }
  }

  return mentionIds;
}

/**
 * Create a message
 * POST /api/messages
 */
export const createMessage = asyncHandler(async (req, res) => {
  const { roomId, content } = req.body;

  if (!roomId || !content || !content.trim()) {
    return res.status(400).json({ error: 'Room ID and content are required' });
  }

  const mentions = await resolveMentions(roomId, content.trim());

  const message = new Message({
    roomId,
    userId: req.userId,
    content: content.trim(),
    mentions,
  });

  await message.save();
  await message.populate('userId', 'name avatar reputation');
  await message.populate('mentions', 'name githubUsername avatar');

  // Notify mentioned users in real-time so they see "X tagged you in RoomName"
  if (mentions.length > 0 && req.io) {
    let roomName = null;
    try {
      const room = await Room.findById(roomId).select('repoOwner repoName').lean();
      if (room) roomName = [room.repoOwner, room.repoName].filter(Boolean).join('/');
    } catch (_) {}
    const payload = {
      type: 'mention',
      messageId: message._id,
      roomId,
      roomName,
      fromUser: { _id: req.userId, name: message.userId?.name, avatar: message.userId?.avatar },
      content: message.content?.substring(0, 150) + (message.content?.length > 150 ? '…' : ''),
      createdAt: message.createdAt,
    };
    mentions.forEach((id) => {
      req.io.to(`user-${id}`).emit('notification', payload);
    });
  }

  res.status(201).json(message);
});
// audio upload service disabled – recording is no longer supported
// export const uploadAudioMessage = asyncHandler(async (req, res) => {
//   // multer will have stored file info on req.file
//   const { file } = req;
//   const { roomId, duration } = req.body;
//
//   if (!file || !roomId) {
//     return res.status(400).json({ error: 'Audio file and roomId are required' });
//   }
//
//   const audioUrl = `/uploads/${file.filename}`;
//
//   // Use absolute URL so the frontend (dev server or separate host) can fetch the file
//   const host = req.get('host');
//   const protocol = req.protocol;
//   const absoluteAudioUrl = `${protocol}://${host}/uploads/${file.filename}`;
//
//   const message = new Message({
//     roomId,
//     userId: req.userId,
//     content: '',
//     isAudio: true,
//     audioUrl: absoluteAudioUrl,
//     audioDuration: duration ? Number(duration) : 0,
//   });
//
//   await message.save();
//   await message.populate('userId', 'name avatar reputation');
//
//   // emit to room if socket available
//   if (req.io) {
//     req.io.to(`room-${roomId}`).emit('new-message', {
//       _id: message._id,
//       content: message.content,
//       userId: message.userId._id,
//       userName: message.userId.name,
//       userAvatar: message.userId.avatar,
//       isAudio: message.isAudio,
//       audioUrl: message.audioUrl,
//       audioDuration: message.audioDuration,
//       createdAt: message.createdAt,
//     });
//   }
//
//   res.status(201).json(message);
// });

/**
 * Get room messages (filtered by mention visibility)
 * Messages with @mentions are only visible to sender + mentioned users
 * GET /api/rooms/:roomId/messages
 */
export const getRoomMessages = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, skip = 0 } = req.query;
  const currentUserId = req.userId;

  let messages = await Message.find({ roomId })
    .populate('userId', 'name avatar reputation')
    .populate('mentions', 'name githubUsername avatar')
    .sort({ createdAt: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit) * 2); // over-fetch then filter

  // Filter: mention-only messages visible only to sender + mentioned users
  const filtered = messages.filter((msg) => {
    const hasMentions = msg.mentions && msg.mentions.length > 0;
    if (!hasMentions) return true;
    if (!currentUserId) return false; // unauthenticated: hide mention-only
    const senderId = msg.userId?._id?.toString?.() || msg.userId?.toString?.();
    const isSender = senderId === currentUserId.toString();
    const isMentioned = (msg.mentions || []).some(
      (m) => (m._id?.toString?.() || m?.toString?.()) === currentUserId.toString()
    );
    return isSender || isMentioned;
  });

  messages = filtered.slice(0, parseInt(limit));

  const host = req.get('host');
  const protocol = req.protocol;
  messages = messages.map((msg) => {
    if (msg.isAudio && msg.audioUrl && msg.audioUrl.startsWith('/uploads')) {
      msg.audioUrl = `${protocol}://${host}${msg.audioUrl}`;
    }
    return msg;
  });

  res.json(messages.reverse());
});

/**
 * Edit a message
 * PUT /api/messages/:messageId
 */
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'You can only edit your own messages' });
  }

  message.content = content.trim();
  message.isEdited = true;
  message.editedAt = new Date();
  
  await message.save();
  await message.populate('userId', 'name avatar reputation');

  res.json(message);
});

/**
 * Delete a message
 * DELETE /api/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }

  if (message.userId.toString() !== req.userId.toString()) {
    return res.status(403).json({ error: 'You can only delete your own messages' });
  }

  await Message.deleteOne({ _id: messageId });

  // Emit deletion to the room so other clients can remove it in real-time
  if (req.io && message && message.roomId) {
    req.io.to(`room-${message.roomId}`).emit('message-deleted', { messageId });
  }

  res.json({ message: 'Message deleted' });
});
