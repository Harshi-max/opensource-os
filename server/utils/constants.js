/**
 * Application Constants
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  USER_EXISTS: 'User already exists',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',
  POLL_CLOSED: 'Poll is already closed',
  ALREADY_VOTED: 'You have already voted in this poll',
  INVALID_OPTION: 'Invalid poll option',
  ROOM_NOT_FOUND: 'Room not found',
  ROOM_EXISTS: 'Room already exists',
  INVALID_GITHUB_URL: 'Invalid GitHub URL',
  GITHUB_API_ERROR: 'Failed to fetch from GitHub API',
  AI_API_ERROR: 'Failed to generate AI response',
};

export const POLL_CONFIG = {
  MIN_DURATION_MINUTES: 1,
  MAX_DURATION_MINUTES: 1440, // 24 hours
  DEFAULT_DURATION_MINUTES: 30,
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 10,
};

export const RATE_LIMIT_CONFIG = {
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_MAX_REQUESTS: 5,
  API_WINDOW_MS: 15 * 60 * 1000,
  API_MAX_REQUESTS: 100,
  POLL_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  POLL_MAX_REQUESTS: 20,
};

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_SKIP: 0,
};

export const JWT_CONFIG = {
  EXPIRY: '7d',
  REFRESH_EXPIRY: '30d',
};

export const REPUTATION = {
  POLL_AGREEMENT: 5,
  HELPFUL_ANSWER: 10,
  ROOM_CREATION: 25,
  POLL_CREATION: 5,
};

export const SOCKET_EVENTS = {
  // Client to Server
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  SEND_MESSAGE: 'send-message',
  TYPING: 'typing',
  CAST_VOTE: 'cast-vote',
  POLL_CLOSED: 'poll-closed',

  // Server to Client
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',
  NEW_MESSAGE: 'new-message',
  USER_TYPING: 'user-typing',
  POLL_UPDATED: 'poll-updated',
  AI_DECISION: 'ai-decision',
  ERROR: 'error',
};

export const CACHE_DURATION = {
  ROOM_DATA: 5 * 60 * 1000, // 5 minutes
  POLL_DATA: 1 * 60 * 1000, // 1 minute
  USER_DATA: 10 * 60 * 1000, // 10 minutes
};
