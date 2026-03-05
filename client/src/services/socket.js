import io from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let socket = null;

/**
 * Initialize Socket.IO connection
 */
export const initSocket = () => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

/**
 * Get current socket instance
 */
export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

/**
 * Register current user for notifications (call when logged in so mention notifications work everywhere)
 */
export const registerUser = (userId) => {
  if (!userId) return;
  const socket = getSocket();
  socket.emit('register-user', { userId });
};

/**
 * Join a room
 */
export const joinRoom = (roomId, userId, userName) => {
  const socket = getSocket();
  socket.emit('join-room', { roomId, userId, userName });
};

/**
 * Leave a room
 */
export const leaveRoom = (roomId, userId, userName) => {
  const socket = getSocket();
  socket.emit('leave-room', { roomId, userId, userName });
};

/**
 * Send a message (broadcast) - for mention-only messages, pass mentions for targeted delivery
 */
export const sendMessage = (roomId, userId, userName, content, messageId, options = {}) => {
  const socket = getSocket();
  socket.emit('new-message', {
    roomId,
    userId,
    userName,
    content,
    messageId,
    mentions: options.mentions || [],
    userAvatar: options.userAvatar,
  });
};

/**
 * Typing indicator
 */
export const emitTyping = (roomId, userId, userName) => {
  const socket = getSocket();
  socket.emit('typing', { roomId, userId, userName });
};

/**
 * Stop typing indicator
 */
export const emitStopTyping = (roomId, userId) => {
  const socket = getSocket();
  socket.emit('stop-typing', { roomId, userId });
};

/**
 * Emit new poll
 */
export const emitNewPoll = (roomId, poll) => {
  const socket = getSocket();
  socket.emit('new-poll', { roomId, poll });
};

/**
 * Emit poll vote
 */
export const emitPollVote = (roomId, pollId, userId, selectedOptionId, updatedPoll) => {
  const socket = getSocket();
  socket.emit('poll-vote', { roomId, pollId, userId, selectedOptionId, updatedPoll });
};

/**
 * Emit poll closed
 */
export const emitPollClosed = (roomId, pollId, closedPoll, aiResponse) => {
  const socket = getSocket();
  socket.emit('poll-closed', { roomId, pollId, closedPoll, aiResponse });
};

/**
 * Emit vote on doubt poll (REAL-TIME KILLER FEATURE)
 */
export const emitDoubtPollVote = (doubtPollId, optionIndex, userId, reputation) => {
  const socket = getSocket();
  socket.emit('vote-doubt-poll', { doubtPollId, optionIndex, userId, reputation });
};

/**
 * Emit close doubt poll
 */
export const emitCloseDoubtPoll = (doubtPollId, userId) => {
  const socket = getSocket();
  socket.emit('close-doubt-poll', { doubtPollId, userId });
};

/**
 * Emit @bot mention (triggers immediate guidance poll)
 */
export const emitBotMention = (roomId, channelId, content, userId) => {
  const socket = getSocket();
  socket.emit('bot-mention', { roomId, channelId, content, userId });
};

/**
 * Start a meeting via socket (also persists on the server)
 */
export const emitStartMeeting = (roomId, title, userId) => {
  const socket = getSocket();
  socket.emit('start-meeting', { roomId, title, userId });
};

/**
 * End/update a meeting via socket
 */
export const emitEndMeeting = (meetingId, summary) => {
  const socket = getSocket();
  socket.emit('end-meeting', { meetingId, summary });
};

/**
 * Listen for messages
 */
export const onNewMessage = (callback) => {
  const socket = getSocket();
  socket.on('message', callback);
};

/**
 * Listen for user joined
 */
export const onUserJoined = (callback) => {
  const socket = getSocket();
  socket.on('user-joined', callback);
};

/**
 * Listen for user left
 */
export const onUserLeft = (callback) => {
  const socket = getSocket();
  socket.on('user-left', callback);
};

/**
 * Listen for typing
 */
export const onUserTyping = (callback) => {
  const socket = getSocket();
  socket.on('user-typing', callback);
};

/**
 * Listen for stop typing
 */
export const onUserStopTyping = (callback) => {
  const socket = getSocket();
  socket.on('user-stop-typing', callback);
};

/**
 * Listen for new poll
 */
export const onPollCreated = (callback) => {
  const socket = getSocket();
  socket.on('poll-created', callback);
};

/**
 * Listen for vote casted
 */
export const onVoteCasted = (callback) => {
  const socket = getSocket();
  socket.on('vote-casted', callback);
};

/**
 * Listen for poll ended
 */
export const onPollEnded = (callback) => {
  const socket = getSocket();
  socket.on('poll-ended', callback);
};

/**
 * Listen for AI response (onboarding guide)
 */
export const onAIResponse = (callback) => {
  const socket = getSocket();
  socket.on('ai-response', callback);
};

/**
 * Listen for doubt poll created (REAL-TIME KILLER FEATURE)
 */
export const onDoubtPollCreated = (callback) => {
  const socket = getSocket();
  socket.on('doubt-poll-created', callback);
};

/**
 * Listen for doubt poll updated (real-time vote updates)
 */
export const onDoubtPollUpdated = (callback) => {
  const socket = getSocket();
  socket.on('doubt-poll-updated', callback);
};

/**
 * Listen for mentor response (AI analysis)
 */
export const onMentorResponse = (callback) => {
  const socket = getSocket();
  socket.on('mentor-response', callback);
};

/**
 * Listen for doubt poll closed
 */
export const onDoubtPollClosed = (callback) => {
  const socket = getSocket();
  socket.on('doubt-poll-closed', callback);
};

/**
 * Listen for @bot mention response
 */
export const onBotResponse = (callback) => {
  const socket = getSocket();
  socket.on('bot-response', callback);
};

/**
 * Listen for @bot direct answer
 */
export const onBotAnswer = (callback) => {
  const socket = getSocket();
  socket.on('bot-answer', callback);
};

/**
 * Listen for @bot audio reply (server-generated TTS file)
 */
export const onBotAudio = (callback) => {
  const socket = getSocket();
  socket.on('bot-audio', callback);
};

/**
 * Listen for message deletions
 */
export const onMessageDeleted = (callback) => {
  const socket = getSocket();
  socket.on('message-deleted', callback);
};

/**
 * Listen for new notification (e.g. mention)
 */
export const onNotification = (callback) => {
  const socket = getSocket();
  socket.on('notification', callback);
};

// meeting listeners
export const onMeetingStarted = (callback) => {
  const socket = getSocket();
  socket.on('meeting-started', callback);
};

export const onMeetingEnded = (callback) => {
  const socket = getSocket();
  socket.on('meeting-ended', callback);
};

export const onMeetingUpdated = (callback) => {
  const socket = getSocket();
  socket.on('meeting-updated', callback);
};

/**
 * Remove listener
 */
export const removeListener = (event) => {
  const socket = getSocket();
  socket.off(event);
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
