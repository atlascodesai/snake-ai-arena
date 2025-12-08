import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

// Create mock database inline to avoid hoisting issues
const createMockDb = () => ({
  submissions: [] as any[],
  manualScores: [] as any[],
  nextId: 1,
  manualNextId: 1,

  async init() {},

  async getLeaderboard() {
    return [...this.submissions]
      .sort((a, b) => b.avg_score - a.avg_score)
      .slice(0, 50);
  },

  async getSubmission(id: number) {
    return this.submissions.find(s => s.id === id) || null;
  },

  async insertSubmission(
    name: string,
    code: string,
    linesOfCode: number,
    avgScore: number,
    maxScore: number,
    survivalRate: number,
    gamesPlayed: number
  ) {
    const submission = {
      id: this.nextId++,
      name,
      code,
      lines_of_code: linesOfCode,
      avg_score: avgScore,
      max_score: maxScore,
      survival_rate: survivalRate,
      games_played: gamesPlayed,
      created_at: new Date().toISOString(),
    };
    this.submissions.push(submission);
    return { lastInsertRowid: submission.id };
  },

  async getRank(avgScore: number) {
    const count = this.submissions.filter(s => s.avg_score > avgScore).length;
    return { rank: count + 1 };
  },

  async getTotalCount() {
    return { count: this.submissions.length };
  },

  async getManualLeaderboard() {
    return [...this.manualScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  },

  async insertManualScore(name: string, score: number, length: number, controlType: string, viewMode: string = 'orbit') {
    const entry = {
      id: this.manualNextId++,
      name,
      score,
      length,
      control_type: controlType,
      view_mode: viewMode,
      created_at: new Date().toISOString(),
    };
    this.manualScores.push(entry);
    return { lastInsertRowid: entry.id };
  },

  async getManualRank(score: number) {
    const count = this.manualScores.filter(s => s.score > score).length;
    return { rank: count + 1 };
  },

  async getManualTotalCount() {
    return { count: this.manualScores.length };
  },

  reset() {
    this.submissions = [];
    this.manualScores = [];
    this.nextId = 1;
    this.manualNextId = 1;
  },
});

// Create the mock instance
const mockDb = createMockDb();

// Mock the db module - factory must be inline and cannot reference variables
vi.mock('../db.js', () => {
  const mockInstance = {
    submissions: [] as any[],
    manualScores: [] as any[],
    nextId: 1,
    manualNextId: 1,

    async init() {},

    async getLeaderboard() {
      return [...this.submissions]
        .sort((a: any, b: any) => b.avg_score - a.avg_score)
        .slice(0, 50);
    },

    async getSubmission(id: number) {
      return this.submissions.find((s: any) => s.id === id) || null;
    },

    async insertSubmission(
      name: string,
      code: string,
      linesOfCode: number,
      avgScore: number,
      maxScore: number,
      survivalRate: number,
      gamesPlayed: number
    ) {
      const submission = {
        id: this.nextId++,
        name,
        code,
        lines_of_code: linesOfCode,
        avg_score: avgScore,
        max_score: maxScore,
        survival_rate: survivalRate,
        games_played: gamesPlayed,
        created_at: new Date().toISOString(),
      };
      this.submissions.push(submission);
      return { lastInsertRowid: submission.id };
    },

    async getRank(avgScore: number) {
      const count = this.submissions.filter((s: any) => s.avg_score > avgScore).length;
      return { rank: count + 1 };
    },

    async getTotalCount() {
      return { count: this.submissions.length };
    },

    async getManualLeaderboard() {
      return [...this.manualScores]
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 50);
    },

    async insertManualScore(name: string, score: number, length: number, controlType: string, viewMode: string = 'orbit') {
      const entry = {
        id: this.manualNextId++,
        name,
        score,
        length,
        control_type: controlType,
        view_mode: viewMode,
        created_at: new Date().toISOString(),
      };
      this.manualScores.push(entry);
      return { lastInsertRowid: entry.id };
    },

    async getManualRank(score: number) {
      const count = this.manualScores.filter((s: any) => s.score > score).length;
      return { rank: count + 1 };
    },

    async getManualTotalCount() {
      return { count: this.manualScores.length };
    },

    reset() {
      this.submissions = [];
      this.manualScores = [];
      this.nextId = 1;
      this.manualNextId = 1;
    },
  };

  // Store reference for test access
  (globalThis as any).__mockDb = mockInstance;

  return {
    db: mockInstance,
    default: mockInstance,
    CONTROL_TYPES: ['wasd-zx', 'wasd-qe', 'arrows-ws'] as const,
    VIEW_MODES: ['orbit', 'fpv'] as const,
    SubmissionRow: {},
    ManualScoreRow: {},
  };
});

// Import routes after mocking
import leaderboardRoutes from '../routes/leaderboard.js';
import manualRoutes from '../routes/manual.js';

// Get the mock instance
const getMockDb = () => (globalThis as any).__mockDb;

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/manual', manualRoutes);
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  return app;
}

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    getMockDb().reset();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/leaderboard', () => {
    beforeEach(() => {
      // Add some test submissions
      getMockDb().submissions = [
        { id: 1, name: 'Test1', code: 'code1', lines_of_code: 10, avg_score: 100, max_score: 150, survival_rate: 50, games_played: 10, created_at: '2024-01-01' },
        { id: 2, name: 'Test2', code: 'code2', lines_of_code: 20, avg_score: 200, max_score: 250, survival_rate: 75, games_played: 10, created_at: '2024-01-02' },
      ];
    });

    it('should return leaderboard with rankings', async () => {
      const response = await request(app).get('/api/leaderboard');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);

      // Should be sorted by avg_score DESC
      expect(response.body[0].avgScore).toBe(200);
      expect(response.body[0].rank).toBe(1);
      expect(response.body[1].avgScore).toBe(100);
      expect(response.body[1].rank).toBe(2);
    });

    it('should include correct fields in response', async () => {
      const response = await request(app).get('/api/leaderboard');

      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('linesOfCode');
      expect(response.body[0]).toHaveProperty('avgScore');
      expect(response.body[0]).toHaveProperty('maxScore');
      expect(response.body[0]).toHaveProperty('survivalRate');
      expect(response.body[0]).toHaveProperty('gamesPlayed');
      expect(response.body[0]).toHaveProperty('createdAt');
      expect(response.body[0]).toHaveProperty('rank');
    });
  });

  describe('GET /api/leaderboard/:id', () => {
    beforeEach(() => {
      getMockDb().submissions = [
        { id: 1, name: 'Test1', code: 'function test() {}', lines_of_code: 10, avg_score: 100, max_score: 150, survival_rate: 50, games_played: 10, created_at: '2024-01-01' },
      ];
    });

    it('should return single submission with code', async () => {
      const response = await request(app).get('/api/leaderboard/1');

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.name).toBe('Test1');
      expect(response.body.code).toBe('function test() {}');
      expect(response.body.rank).toBeDefined();
    });

    it('should return 404 for non-existent submission', async () => {
      const response = await request(app).get('/api/leaderboard/999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Submission not found');
    });
  });

  describe('POST /api/leaderboard', () => {
    it('should create new submission', async () => {
      const response = await request(app)
        .post('/api/leaderboard')
        .send({
          name: 'NewAlgorithm',
          code: 'function algorithm(ctx) {\n  return { x: 1, y: 0, z: 0 };\n}',
          avgScore: 500,
          maxScore: 750,
          survivalRate: 80,
          gamesPlayed: 10,
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('NewAlgorithm');
      expect(response.body.avgScore).toBe(500);
      expect(response.body.linesOfCode).toBe(3); // 3 non-empty lines
      expect(response.body.id).toBeDefined();
      expect(response.body.rank).toBeDefined();
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/api/leaderboard')
        .send({ name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should reject name over 50 characters', async () => {
      const response = await request(app)
        .post('/api/leaderboard')
        .send({
          name: 'A'.repeat(51),
          code: 'function test() {}',
          avgScore: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name must be 50 characters or less');
    });

    it('should reject invalid score', async () => {
      const response = await request(app)
        .post('/api/leaderboard')
        .send({
          name: 'Test',
          code: 'function test() {}',
          avgScore: -1,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid score');
    });

    it('should count lines of code correctly', async () => {
      const response = await request(app)
        .post('/api/leaderboard')
        .send({
          name: 'LineTest',
          code: `// This is a comment
function algorithm(ctx) {
  // Another comment
  const x = 1;
  return { x: x, y: 0, z: 0 };
}
/* Block comment */
`,
          avgScore: 100,
        });

      expect(response.status).toBe(201);
      // Should count: function, const, return, closing brace = 4 lines
      expect(response.body.linesOfCode).toBe(4);
    });
  });

  describe('GET /api/leaderboard/preview/:avgScore', () => {
    beforeEach(() => {
      getMockDb().submissions = [
        { id: 1, name: 'Top', code: 'code', lines_of_code: 10, avg_score: 1000, max_score: 1000, survival_rate: 100, games_played: 10, created_at: '2024-01-01' },
        { id: 2, name: 'Mid', code: 'code', lines_of_code: 10, avg_score: 500, max_score: 500, survival_rate: 50, games_played: 10, created_at: '2024-01-02' },
        { id: 3, name: 'Low', code: 'code', lines_of_code: 10, avg_score: 100, max_score: 100, survival_rate: 25, games_played: 10, created_at: '2024-01-03' },
      ];
    });

    it('should return projected placement', async () => {
      const response = await request(app).get('/api/leaderboard/preview/600');

      expect(response.status).toBe(200);
      expect(response.body.projectedRank).toBe(2); // Between Top (1000) and Mid (500)
      expect(response.body.totalSubmissions).toBe(3);
    });

    it('should return 400 for invalid score', async () => {
      const response = await request(app).get('/api/leaderboard/preview/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid score');
    });
  });

  describe('Manual Scores API', () => {
    describe('GET /api/manual', () => {
      beforeEach(() => {
        getMockDb().manualScores = [
          { id: 1, name: 'Player1', score: 500, length: 53, control_type: 'wasd-zx', view_mode: 'orbit', created_at: '2024-01-01' },
          { id: 2, name: 'Player2', score: 300, length: 33, control_type: 'arrows-ws', view_mode: 'fpv', created_at: '2024-01-02' },
        ];
      });

      it('should return manual scores leaderboard', async () => {
        const response = await request(app).get('/api/manual');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
        // Should be sorted by score DESC
        expect(response.body[0].score).toBe(500);
      });

      it('should include viewMode in response', async () => {
        const response = await request(app).get('/api/manual');

        expect(response.status).toBe(200);
        expect(response.body[0].viewMode).toBe('orbit');
        expect(response.body[1].viewMode).toBe('fpv');
      });
    });

    describe('POST /api/manual', () => {
      it('should create manual score entry', async () => {
        const response = await request(app)
          .post('/api/manual')
          .send({
            name: 'TestPlayer',
            score: 420,
            length: 45,
            controlType: 'wasd-zx',
          });

        expect(response.status).toBe(201);
        expect(response.body.name).toBe('TestPlayer');
        expect(response.body.score).toBe(420);
        expect(response.body.rank).toBeDefined();
      });

      it('should reject invalid score/length relationship', async () => {
        const response = await request(app)
          .post('/api/manual')
          .send({
            name: 'Cheater',
            score: 1000,
            length: 5, // Length doesn't match score
            controlType: 'wasd-zx',
          });

        expect(response.status).toBe(400);
      });

      it('should accept viewMode parameter', async () => {
        const response = await request(app)
          .post('/api/manual')
          .send({
            name: 'FPVPlayer',
            score: 100,
            length: 13,
            controlType: 'wasd-zx',
            viewMode: 'fpv',
          });

        expect(response.status).toBe(201);
        expect(response.body.viewMode).toBe('fpv');
      });

      it('should default viewMode to orbit when not provided', async () => {
        const response = await request(app)
          .post('/api/manual')
          .send({
            name: 'OrbitPlayer',
            score: 50,
            length: 8,
            controlType: 'wasd-zx',
          });

        expect(response.status).toBe(201);
        expect(response.body.viewMode).toBe('orbit');
      });

      it('should default invalid viewMode to orbit', async () => {
        const response = await request(app)
          .post('/api/manual')
          .send({
            name: 'InvalidView',
            score: 70,
            length: 10,
            controlType: 'wasd-zx',
            viewMode: 'invalid',
          });

        expect(response.status).toBe(201);
        expect(response.body.viewMode).toBe('orbit');
      });
    });
  });
});
