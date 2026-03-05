import express from 'express';
import { getNotifications } from '../controllers/notificationController.js';
import { authMiddleware, requireGitHubLinked } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
router.use(apiLimiter);

router.get('/', authMiddleware, requireGitHubLinked, getNotifications);

export default router;
