import express from 'express';
import { messageController } from '../controllers/index.js';
import { authMiddleware, requireGitHubLinked } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// compute directory relative to this file, not cwd, to avoid "server/server" bug
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../uploads');
const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, uploadDir),
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname) || '.webm';
		cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`);
	},
});
const upload = multer({ storage });

const router = express.Router();

router.use(apiLimiter);

// Create message
router.post('/', authMiddleware, requireGitHubLinked, messageController.createMessage);

// audio upload route removed (recording feature deprecated)
// router.post('/audio', authMiddleware, upload.single('audio'), messageController.uploadAudioMessage);

// Edit message
router.put('/:messageId', authMiddleware, requireGitHubLinked, messageController.editMessage);

// Delete message
router.delete('/:messageId', authMiddleware, requireGitHubLinked, messageController.deleteMessage);

export default router;
