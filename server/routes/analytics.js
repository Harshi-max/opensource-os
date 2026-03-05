import express from 'express';
import { apiLimiter } from '../middleware/rateLimiter.js';
import {
  getRoomAnalytics,
  getTopContributorsHandler,
  getMostConfusingTopicsHandler,
} from '../controllers/analyticsController.js';

const router = express.Router();

/**
 * Public routes
 */
router.get('/:roomId', apiLimiter, getRoomAnalytics);
router.get('/:roomId/contributors', apiLimiter, getTopContributorsHandler);
router.get('/:roomId/confusing-topics', apiLimiter, getMostConfusingTopicsHandler);

export default router;
