/**
 * Express Server for Snake AI Arena
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import leaderboardRoutes from './routes/leaderboard.js';
import manualRoutes from './routes/manual.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy (required for rate limiting behind Railway's load balancer)
app.set('trust proxy', 1);

// Rate limiting: 100 submissions per IP per hour (strict for writes)
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: { error: 'Too many submissions, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiter for all API requests (prevents scraping/DoS)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 min = 20/min average
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Allow CORS preflight
});

// CORS configuration - restrict to allowed origins
const allowedOrigins = [
  'https://snake3js.com',
  'https://p.snake3js.com',
  'https://www.snake3js.com',
  'https://web-production-e0a3.up.railway.app',
  'https://web-preview-e0a3.up.railway.app',
];

// In development or local testing, allow localhost
if (!isProduction || process.env.ALLOW_LOCALHOST) {
  allowedOrigins.push('http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, Postman, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

// Security headers with helmet
// NOTE: unsafe-inline and unsafe-eval are required and cannot be removed:
// - unsafe-eval: Monaco Editor uses eval() internally, user algorithms use new Function()
// - unsafe-inline: Tailwind CSS generates inline styles, Chatwoot uses inline scripts
// These are acceptable tradeoffs for this application's functionality.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind, Chatwoot, Vite dev
        "'unsafe-eval'",   // Required for Monaco Editor and user algorithm execution (new Function)
        "https://app.chatwoot.com",
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net", // Required for Monaco Editor CDN
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Tailwind and Monaco
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net", // Required for Monaco Editor CDN
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: [
        "'self'",
        "https://app.chatwoot.com",
        "wss://app.chatwoot.com",
      ],
      frameSrc: ["'self'", "https://app.chatwoot.com", "https://www.youtube.com"],
      workerSrc: ["'self'", "blob:"], // For Web Workers
    },
  },
  crossOriginEmbedderPolicy: false, // Required for Three.js
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Required for YouTube embeds
}));

// Apply general rate limiter to all API routes
app.use('/api', generalLimiter);

// API Routes - apply stricter rate limiter to POST submissions
app.use('/api/leaderboard', (req, res, next) => {
  if (req.method === 'POST') {
    return submissionLimiter(req, res, next);
  }
  next();
}, leaderboardRoutes);

app.use('/api/manual', (req, res, next) => {
  if (req.method === 'POST') {
    return submissionLimiter(req, res, next);
  }
  next();
}, manualRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple password check middleware for /aidemo route
const aidemoPassword = process.env.AIDEMO_PASSWORD || '';
const aidemoSessions = new Set<string>();

function checkAidemoAuth(req: any, res: any, next: any) {
  const sessionId = req.cookies?.aidemo_session;
  if (sessionId && aidemoSessions.has(sessionId)) {
    return next();
  }
  // Not authenticated - serve login page or check password
  if (req.method === 'POST' && req.body?.password === aidemoPassword && aidemoPassword) {
    const newSession = Math.random().toString(36).substring(2);
    aidemoSessions.add(newSession);
    res.cookie('aidemo_session', newSession, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    return res.json({ success: true });
  }
  next();
}

// API endpoint for aidemo password check
app.post('/api/aidemo/auth', (req, res) => {
  if (req.body?.password === aidemoPassword && aidemoPassword) {
    const newSession = Math.random().toString(36).substring(2) + Date.now().toString(36);
    aidemoSessions.add(newSession);
    res.cookie('aidemo_session', newSession, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: 'Invalid password' });
});

app.get('/api/aidemo/check', (req, res) => {
  const sessionId = req.cookies?.aidemo_session;
  const authenticated = sessionId && aidemoSessions.has(sessionId);
  res.json({ authenticated });
});

// Serve static files in production
if (isProduction) {
  // Vite outputs to dist/client in production build
  const clientPath = path.join(__dirname, '..', 'dist', 'client');

  app.use(express.static(clientPath));

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Initialize database and start server
async function start() {
  try {
    await db.init();

    app.listen(PORT, () => {
      console.log(`🐍 Snake AI Arena API running on port ${PORT}`);
      console.log(`   Environment: ${isProduction ? 'production' : 'development'}`);
      console.log(`   Database: PostgreSQL`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
