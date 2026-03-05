import express from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import {
  createRoom,
  getAllRooms,
  getRoom,
  joinRoom,
  leaveRoom,
  getRoomMembers,
  getRoomMessages,
} from '../controllers/roomController.js';

const router = express.Router();

/**
 * Public routes
 */
router.get('/', apiLimiter, getAllRooms);
router.get('/:roomId', apiLimiter, getRoom);

/**
 * Protected routes
 */
router.post('/', authMiddleware, apiLimiter, createRoom);
router.post('/:roomId/join', authMiddleware, joinRoom);
router.post('/:roomId/leave', authMiddleware, leaveRoom);

router.get('/:roomId/members', getRoomMembers);
router.get('/:roomId/messages', optionalAuthMiddleware, getRoomMessages);

export default router;
