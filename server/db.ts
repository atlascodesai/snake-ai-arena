/**
 * Database Setup - Supports both SQLite (local) and PostgreSQL (Railway)
 */

import Database from 'better-sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if we're using PostgreSQL (Railway provides DATABASE_URL)
const isPostgres = !!process.env.DATABASE_URL;

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
  created_at: string;
}

// Control type constants
export const CONTROL_TYPES = ['wasd-zx', 'wasd-qe', 'arrows-ws'] as const;
export type ControlType = typeof CONTROL_TYPES[number];

// ============================================
// SQLite Implementation (Local Development)
// ============================================

let sqliteDb: Database.Database | null = null;
let sqliteQueries: any = null;

function initSqlite() {
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'snake.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      lines_of_code INTEGER NOT NULL,
      avg_score REAL NOT NULL,
      max_score INTEGER NOT NULL,
      survival_rate REAL NOT NULL,
      games_played INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_submissions_avg_score
    ON submissions(avg_score DESC);

    CREATE TABLE IF NOT EXISTS manual_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      score INTEGER NOT NULL,
      length INTEGER NOT NULL,
      control_type TEXT DEFAULT 'wasd-zx',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_manual_scores_score
    ON manual_scores(score DESC);
  `);

  // Add control_type column if it doesn't exist (migration for existing DBs)
  try {
    sqliteDb.exec(`ALTER TABLE manual_scores ADD COLUMN control_type TEXT DEFAULT 'wasd-zx'`);
  } catch (e) {
    // Column already exists, ignore
  }

  sqliteQueries = {
    getLeaderboard: sqliteDb.prepare(`
      SELECT id, name, lines_of_code, avg_score, max_score, survival_rate, games_played, created_at
      FROM submissions
      ORDER BY avg_score DESC
      LIMIT 50
    `),
    getSubmission: sqliteDb.prepare(`SELECT * FROM submissions WHERE id = ?`),
    insertSubmission: sqliteDb.prepare(`
      INSERT INTO submissions (name, code, lines_of_code, avg_score, max_score, survival_rate, games_played)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    getRank: sqliteDb.prepare(`SELECT COUNT(*) + 1 as rank FROM submissions WHERE avg_score > ?`),
    getTotalCount: sqliteDb.prepare(`SELECT COUNT(*) as count FROM submissions`),
    // Manual scores queries
    getManualLeaderboard: sqliteDb.prepare(`
      SELECT id, name, score, length, control_type, created_at
      FROM manual_scores
      ORDER BY score DESC
      LIMIT 50
    `),
    insertManualScore: sqliteDb.prepare(`
      INSERT INTO manual_scores (name, score, length, control_type)
      VALUES (?, ?, ?, ?)
    `),
    getManualRank: sqliteDb.prepare(`SELECT COUNT(*) + 1 as rank FROM manual_scores WHERE score > ?`),
    getManualTotalCount: sqliteDb.prepare(`SELECT COUNT(*) as count FROM manual_scores`),
  };
}

// ============================================
// PostgreSQL Implementation (Railway/Production)
// ============================================

let pgPool: pg.Pool | null = null;

async function initPostgres() {
  pgPool = new pg.Pool({
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_manual_scores_score
    ON manual_scores(score DESC);
  `);

  // Add control_type column if it doesn't exist (migration for existing DBs)
  try {
    await pgPool.query(`ALTER TABLE manual_scores ADD COLUMN IF NOT EXISTS control_type TEXT DEFAULT 'wasd-zx'`);
  } catch (e) {
    // Column already exists or other error, ignore
  }

  console.log('✅ PostgreSQL connected and initialized');
}

// ============================================
// Unified Database Interface
// ============================================

export const db = {
  async init() {
    if (isPostgres) {
      await initPostgres();
    } else {
      initSqlite();
      console.log('✅ SQLite initialized (local development)');
    }
  },

  async getLeaderboard(): Promise<SubmissionRow[]> {
    if (isPostgres && pgPool) {
      const result = await pgPool.query(`
        SELECT id, name, lines_of_code, avg_score, max_score, survival_rate, games_played, created_at
        FROM submissions
        ORDER BY avg_score DESC
        LIMIT 50
      `);
      return result.rows;
    } else if (sqliteQueries) {
      return sqliteQueries.getLeaderboard.all();
    }
    return [];
  },

  async getSubmission(id: number): Promise<SubmissionRow | null> {
    if (isPostgres && pgPool) {
      const result = await pgPool.query('SELECT * FROM submissions WHERE id = $1', [id]);
      return result.rows[0] || null;
    } else if (sqliteQueries) {
      return sqliteQueries.getSubmission.get(id) || null;
    }
    return null;
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
    if (isPostgres && pgPool) {
      const result = await pgPool.query(
        `INSERT INTO submissions (name, code, lines_of_code, avg_score, max_score, survival_rate, games_played)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [name, code, linesOfCode, avgScore, maxScore, survivalRate, gamesPlayed]
      );
      return { lastInsertRowid: result.rows[0].id };
    } else if (sqliteQueries) {
      const result = sqliteQueries.insertSubmission.run(
        name, code, linesOfCode, avgScore, maxScore, survivalRate, gamesPlayed
      );
      return { lastInsertRowid: Number(result.lastInsertRowid) };
    }
    throw new Error('Database not initialized');
  },

  async getRank(avgScore: number): Promise<{ rank: number }> {
    if (isPostgres && pgPool) {
      const result = await pgPool.query(
        'SELECT COUNT(*) + 1 as rank FROM submissions WHERE avg_score > $1',
        [avgScore]
      );
      return { rank: parseInt(result.rows[0].rank) };
    } else if (sqliteQueries) {
      return sqliteQueries.getRank.get(avgScore);
    }
    return { rank: 1 };
  },

  async getTotalCount(): Promise<{ count: number }> {
    if (isPostgres && pgPool) {
      const result = await pgPool.query('SELECT COUNT(*) as count FROM submissions');
      return { count: parseInt(result.rows[0].count) };
    } else if (sqliteQueries) {
      return sqliteQueries.getTotalCount.get();
    }
    return { count: 0 };
  },

  // Manual scores methods
  async getManualLeaderboard(): Promise<ManualScoreRow[]> {
    if (isPostgres && pgPool) {
      const result = await pgPool.query(`
        SELECT id, name, score, length, COALESCE(control_type, 'wasd-zx') as control_type, created_at
        FROM manual_scores
        ORDER BY score DESC
        LIMIT 50
      `);
      return result.rows;
    } else if (sqliteQueries) {
      return sqliteQueries.getManualLeaderboard.all();
    }
    return [];
  },

  async insertManualScore(
    name: string,
    score: number,
    length: number,
    controlType: string = 'wasd-zx'
  ): Promise<{ lastInsertRowid: number }> {
    if (isPostgres && pgPool) {
      const result = await pgPool.query(
        `INSERT INTO manual_scores (name, score, length, control_type)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [name, score, length, controlType]
      );
      return { lastInsertRowid: result.rows[0].id };
    } else if (sqliteQueries) {
      const result = sqliteQueries.insertManualScore.run(name, score, length, controlType);
      return { lastInsertRowid: Number(result.lastInsertRowid) };
    }
    throw new Error('Database not initialized');
  },

  async getManualRank(score: number): Promise<{ rank: number }> {
    if (isPostgres && pgPool) {
      const result = await pgPool.query(
        'SELECT COUNT(*) + 1 as rank FROM manual_scores WHERE score > $1',
        [score]
      );
      return { rank: parseInt(result.rows[0].rank) };
    } else if (sqliteQueries) {
      return sqliteQueries.getManualRank.get(score);
    }
    return { rank: 1 };
  },

  async getManualTotalCount(): Promise<{ count: number }> {
    if (isPostgres && pgPool) {
      const result = await pgPool.query('SELECT COUNT(*) as count FROM manual_scores');
      return { count: parseInt(result.rows[0].count) };
    } else if (sqliteQueries) {
      return sqliteQueries.getManualTotalCount.get();
    }
    return { count: 0 };
  },
};

export default db;
