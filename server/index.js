import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ⭐ LOAD ENV VARIABLES FIRST - from server/.env (so "npm start" from root still finds it)
dotenv.config({ path: path.join(__dirname, '.env') });

// Verify env loaded
console.log('\n📋 Environment Check:');
// report both keys, but note if Groq is active then OpenAI is optional
const usingGroq = Boolean(process.env.GROQ_API_KEY || process.env.GROQ_ENABLED === 'true');
console.log(
  '  OPENAI_API_KEY:',
  process.env.OPENAI_API_KEY ? '✓ Loaded' : usingGroq ? '✗ NOT NEEDED (Groq active)' : '✗ NOT LOADED'
);
console.log('  GROQ_API_KEY:', process.env.GROQ_API_KEY ? '✓ Loaded' : '✗ NOT LOADED');
console.log('  GROQ_ENABLED:', process.env.GROQ_ENABLED === 'true' ? '✓ YES' : '✗ NO');
console.log('  MONGO_URI:', process.env.MONGO_URI ? '✓ Loaded' : '✗ NOT LOADED');
console.log('  GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? '✓ Loaded' : '✗ NOT LOADED');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'development\n');

import authRoutes from './routes/authRoutes.js';
import roomsRoutes from './routes/roomsRoutes.js';
import pollsRoutes from './routes/pollsRoutes.js';
import messagesRoutes from './routes/messagesRoutes.js';
import doubtPollRoutes from './routes/doubtPollRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import meetingsRoutes from './routes/meetingsRoutes.js';
import notificationsRoutes from './routes/notificationsRoutes.js';
import { initializeSocket } from './socket/socketHandlerV2.js';
import { errorHandler, asyncHandler } from './middleware/errorHandler.js';
import { handleGitHubWebhook } from './controllers/githubWebhookController.js';

const app = express();
const httpServer = createServer(app);

// make sure uploads directory exists (used for audio files)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// ===== CONFIGURATION =====
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/opensource-os';
const NODE_ENV = process.env.NODE_ENV || 'development';

// make socket.io available on req for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ===== MIDDLEWARE =====

// GitHub webhook endpoint must receive raw body for signature verification.
app.post('/api/webhooks/github', express.raw({ type: 'application/json' }), handleGitHubWebhook);

// Security middlewares
app.use(helmet());
// custom CORS helper that permits any localhost origin (useful when dev port changes)
const corsOptions = {
  origin: (origin, callback) => {
    // if no origin (e.g. Postman) allow as well
    if (!origin) return callback(null, true);
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return callback(null, true);
      }
    } catch (e) {
      // malformed origin, fall through to reject
    }
    // allow explicit client url from env (for production)
    if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }
    callback(new Error('CORS policy: origin not allowed'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ===== DATABASE CONNECTION =====
async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// ===== API ROUTES =====

// serve uploads with explicit CORS so that media elements can request ranges
// (express.static can send 206 Partial Content, and the generic cors() middleware
// sometimes doesn't inject headers on those responses).
// Debug helper: log everything that hits /uploads so we can inspect headers
if (NODE_ENV === 'development') {
  app.use('/uploads', (req, res, next) => {
    console.log('→ uploads request', req.method, req.originalUrl);
    res.on('finish', () => {
      console.log('← served', res.statusCode, res.get('Access-Control-Allow-Origin'), res.get('Content-Type'));
    });
    next();
  });
}

// we no longer need a separate uploadsCorsMiddleware – static setHeaders will add CORS
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, fpath) => {
      // always mirror origin for localhost/dev and allow credentials
      const origin = res.req.get('origin');
      if (origin) {
        res.set('Access-Control-Allow-Origin', origin);
      } else {
        res.set('Access-Control-Allow-Origin', '*');
      }
      res.set('Access-Control-Allow-Credentials', 'true');

      if (fpath.endsWith('.webm')) {
        res.set('Content-Type', 'audio/webm');
      }
    },
  })
);

// Health check
app.get('/api/health', asyncHandler(async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
}));

// Auth routes
app.use('/api/auth', authRoutes);

// Rooms routes
app.use('/api/rooms', roomsRoutes);

// Polls routes
app.use('/api/polls', pollsRoutes);

// Messages routes
app.use('/api/messages', messagesRoutes);

// Doubt Polls routes (Real-time doubt polling system)
app.use('/api/doubt-polls', doubtPollRoutes);

// Channels routes (Discord-like channels)
app.use('/api/channels', channelRoutes);

// Analytics routes (GitHub data)
app.use('/api/analytics', analyticsRoutes);

// Meetings routes (video conferences inside rooms)
app.use('/api', meetingsRoutes);  // meetings paths are prefixed with /api

// Notifications (mentions)
app.use('/api/notifications', notificationsRoutes);

// ===== STATIC FILES & SPA FALLBACK =====
const clientBuildPath = path.join(__dirname, '../client/dist');

// Always serve static files from client/dist (works for both local and production builds)
app.use(express.static(clientBuildPath, {
  maxAge: NODE_ENV === 'production' ? '1d' : '0',
  etag: NODE_ENV === 'production' ? true : false,
}));

// Serve uploaded audio files

// SPA catch-all: return index.html for all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ===== SOCKET.IO INITIALIZATION =====
initializeSocket(io);

// ===== ERROR HANDLING =====
app.use(errorHandler);

// ===== SERVER STARTUP =====
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`\n┌─────────────────────────────────┐`);
      console.log(`│ OpenSource OS Server Running    │`);
      console.log(`├─────────────────────────────────┤`);
      console.log(`│ Port:       ${PORT.toString().padEnd(19)} │`);
      console.log(`│ Environment: ${NODE_ENV.padEnd(18)} │`);
      console.log(`│ Socket.IO:  ✓ Ready             │`);
      console.log(`└─────────────────────────────────┘\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(() => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Start the server
startServer();

export default app;
