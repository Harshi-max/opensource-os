import express from 'express';
import {
  createMeeting,
  listMeetings,
  updateMeeting,
  getActiveMeeting,
  endMeeting,
  generateSummary,
} from '../controllers/meetingController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All meeting routes: any logged-in user can view, create, join, end, and summarize
router.get('/rooms/:roomId/meetings', authMiddleware, listMeetings);
router.get('/rooms/:roomId/active-meeting', authMiddleware, getActiveMeeting);
router.post('/rooms/:roomId/meetings', authMiddleware, createMeeting);
router.post('/meetings/:meetingId/end', authMiddleware, endMeeting);
router.post('/meetings/:meetingId/summarize', authMiddleware, generateSummary);
router.patch('/meetings/:meetingId', authMiddleware, updateMeeting);

export default router;