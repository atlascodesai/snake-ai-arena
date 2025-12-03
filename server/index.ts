/**
 * Express Server for Snake AI Arena
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
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
app.use(express.json({ limit: '100kb' }));

// API Routes - apply rate limiter to POST submissions
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
      console.log(`   Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export default app;
