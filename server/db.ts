/**
 * Database Setup - PostgreSQL Only
 *
 * Requires DATABASE_URL environment variable to be set.
 * Use Docker for local development: npm run docker:dev
 */

import { Pool } from 'pg';

export interface SubmissionRow {
  id: number;
  name: string;
  code: string;
  lines_of_code: number;
  avg_score: number;
  max_score: number;
  survival_rate: number;
  games_played: number;
  created_at: string;
}

export interface ManualScoreRow {
  id: number;
  name: string;
  score: number;
  length: number;
  control_type: string;
  view_mode: string;
  created_at: string;
}

// Control type constants
export const CONTROL_TYPES = ['wasd-zx', 'wasd-qe', 'arrows-ws'] as const;
export type ControlType = (typeof CONTROL_TYPES)[number];

// View mode constants
export const VIEW_MODES = ['orbit', 'fpv'] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

// PostgreSQL connection pool
let pgPool: Pool | null = null;

async function initPostgres() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL environment variable is required.\n' +
        'For local development, use: npm run docker:dev\n' +
        'This will start PostgreSQL in Docker automatically.'
    );
  }

  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  // Create tables if not exists
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      lines_of_code INTEGER NOT NULL,
      avg_score REAL NOT NULL,
      max_score INTEGER NOT NULL,
      survival_rate REAL NOT NULL,
      games_played INTEGER DEFAULT 10,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_avg_score
    ON submissions(avg_score DESC);

    CREATE TABLE IF NOT EXISTS manual_scores (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      length INTEGER NOT NULL,
      control_type TEXT DEFAULT 'wasd-zx',
      view_mode TEXT DEFAULT 'orbit',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_manual_scores_score
    ON manual_scores(score DESC);
  `);

  // Add control_type column if it doesn't exist (migration for existing DBs)
  try {
    await pgPool.query(
      `ALTER TABLE manual_scores ADD COLUMN IF NOT EXISTS control_type TEXT DEFAULT 'wasd-zx'`
    );
  } catch (e) {
    // Column already exists or other error, ignore
  }

  // Add view_mode column if it doesn't exist (migration for existing DBs)
  try {
    await pgPool.query(
      `ALTER TABLE manual_scores ADD COLUMN IF NOT EXISTS view_mode TEXT DEFAULT 'orbit'`
    );
  } catch (e) {
    // Column already exists or other error, ignore
  }

  console.log('✅ PostgreSQL connected and initialized');
}

// Database Interface
export const db = {
  async init() {
    await initPostgres();
  },

  async getLeaderboard(): Promise<SubmissionRow[]> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query(`
      SELECT id, name, lines_of_code, avg_score, max_score, survival_rate, games_played, created_at
      FROM submissions
      ORDER BY avg_score DESC
      LIMIT 50
    `);
    return result.rows;
  },

  async getSubmission(id: number): Promise<SubmissionRow | null> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query('SELECT * FROM submissions WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async insertSubmission(
    name: string,
    code: string,
    linesOfCode: number,
    avgScore: number,
    maxScore: number,
    survivalRate: number,
    gamesPlayed: number
  ): Promise<{ lastInsertRowid: number }> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query(
      `INSERT INTO submissions (name, code, lines_of_code, avg_score, max_score, survival_rate, games_played)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, code, linesOfCode, avgScore, maxScore, survivalRate, gamesPlayed]
    );
    return { lastInsertRowid: result.rows[0].id };
  },

  async getRank(avgScore: number): Promise<{ rank: number }> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query(
      'SELECT COUNT(*) + 1 as rank FROM submissions WHERE avg_score > $1',
      [avgScore]
    );
    return { rank: parseInt(result.rows[0].rank) };
  },

  async getTotalCount(): Promise<{ count: number }> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query('SELECT COUNT(*) as count FROM submissions');
    return { count: parseInt(result.rows[0].count) };
  },

  // Manual scores methods
  async getManualLeaderboard(): Promise<ManualScoreRow[]> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query(`
      SELECT id, name, score, length, COALESCE(control_type, 'wasd-zx') as control_type, COALESCE(view_mode, 'orbit') as view_mode, created_at
      FROM manual_scores
      ORDER BY score DESC
      LIMIT 50
    `);
    return result.rows;
  },

  async insertManualScore(
    name: string,
    score: number,
    length: number,
    controlType: string = 'wasd-zx',
    viewMode: string = 'orbit'
  ): Promise<{ lastInsertRowid: number }> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query(
      `INSERT INTO manual_scores (name, score, length, control_type, view_mode)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, score, length, controlType, viewMode]
    );
    return { lastInsertRowid: result.rows[0].id };
  },

  async getManualRank(score: number): Promise<{ rank: number }> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query(
      'SELECT COUNT(*) + 1 as rank FROM manual_scores WHERE score > $1',
      [score]
    );
    return { rank: parseInt(result.rows[0].rank) };
  },

  async getManualTotalCount(): Promise<{ count: number }> {
    if (!pgPool) throw new Error('Database not initialized');
    const result = await pgPool.query('SELECT COUNT(*) as count FROM manual_scores');
    return { count: parseInt(result.rows[0].count) };
  },
};

export default db;
