/**
 * Express App Factory - Used for both production and testing
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import leaderboardRoutes from './routes/leaderboard.js';
import manualRoutes from './routes/manual.js';

// Simple password check for aidemo
const aidemoPassword = process.env.AIDEMO_PASSWORD || '';
const aidemoSessions = new Set<string>();

export function createApp() {
  const app = express();

  // Trust proxy (required for rate limiting behind load balancer)
  app.set('trust proxy', 1);

  // Rate limiting: 100 submissions per IP per hour
  const submissionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    message: { error: 'Too many submissions, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Middleware
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));

  // API Routes - apply rate limiter to POST submissions
  app.use(
    '/api/leaderboard',
    (req, res, next) => {
      if (req.method === 'POST') {
        return submissionLimiter(req, res, next);
      }
      next();
    },
    leaderboardRoutes
  );

  app.use(
    '/api/manual',
    (req, res, next) => {
      if (req.method === 'POST') {
        return submissionLimiter(req, res, next);
      }
      next();
    },
    manualRoutes
  );

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

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

  return app;
}

export default createApp;
