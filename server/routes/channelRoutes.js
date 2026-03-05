import express from 'express';
import {
  getRoomChannels,
  createChannel,
  initializeDefaultChannels,
  getChannel,
  updateChannel,
} from '../controllers/channelController.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * Channel Routes
 * Manages Discord-like channels within rooms
 */

// Get channel details
// GET /api/channels/:channelId
router.get('/:channelId', optionalAuthMiddleware, getChannel);

// Create a new channel
// POST /api/channels/:channelId
router.post('/:channelId', optionalAuthMiddleware, createChannel);

// Update channel
// PUT /api/channels/:channelId
router.put('/:channelId', optionalAuthMiddleware, updateChannel);

export default router;
