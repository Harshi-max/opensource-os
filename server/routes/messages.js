import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { createMessage, getRoomMessages, editMessage, deleteMessage } from '../controllers/messageController.js';

const router = express.Router();

/**
 * Protected routes (all message operations require authentication)
 */
router.post('/', authMiddleware, createMessage);
router.put('/:messageId', authMiddleware, editMessage);
router.delete('/:messageId', authMiddleware, deleteMessage);

export default router;
