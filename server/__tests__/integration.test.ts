/**
 * Integration Tests - Full Submission Flow
 *
 * These tests run against a real PostgreSQL database (via Docker).
 * Run with: npm run test:integration
 *
 * Prerequisites:
 *   docker compose -f docker-compose.test.yml up -d
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// Helper to make API requests
async function api(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await response.json();
  return { status: response.status, data };
}

// Wait for API to be ready
async function waitForApi(maxAttempts = 30, delay = 1000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (response.ok) {
        console.log('✅ API is ready');
        return true;
      }
    } catch {
      // API not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return false;
}

describe('Integration Tests - Algorithm Submission Flow', () => {
  beforeAll(async () => {
    const ready = await waitForApi();
    if (!ready) {
      throw new Error('API did not become ready in time. Make sure Docker containers are running.');
    }
  }, 60000);

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const { status, data } = await api('/api/health');

      expect(status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Full Algorithm Submission Flow', () => {
    const testAlgorithm = {
      name: `IntegrationTest_${Date.now()}`,
      code: `// Integration test algorithm
function algorithm(context) {
  const { snake, food, gridSize } = context;
  const head = snake[0];

  // Simple greedy algorithm
  const dx = Math.sign(food.x - head.x);
  const dy = Math.sign(food.y - head.y);
  const dz = Math.sign(food.z - head.z);

  if (dx !== 0) return { x: dx, y: 0, z: 0 };
  if (dy !== 0) return { x: 0, y: dy, z: 0 };
  if (dz !== 0) return { x: 0, y: 0, z: dz };

  return { x: 1, y: 0, z: 0 };
}`,
      avgScore: 150,
      maxScore: 250,
      survivalRate: 85,
      gamesPlayed: 10,
    };

    let submissionId: number;

    it('should submit a new algorithm', async () => {
      const { status, data } = await api('/api/leaderboard', {
        method: 'POST',
        body: JSON.stringify(testAlgorithm),
      });

      expect(status).toBe(201);
      expect(data.name).toBe(testAlgorithm.name);
      expect(data.avgScore).toBe(testAlgorithm.avgScore);
      expect(data.maxScore).toBe(testAlgorithm.maxScore);
      expect(data.linesOfCode).toBeGreaterThan(0);
      expect(data.id).toBeDefined();
      expect(data.rank).toBeDefined();

      submissionId = data.id;
    });

    it('should appear in the leaderboard', async () => {
      const { status, data } = await api('/api/leaderboard');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      const submission = data.find((s: any) => s.id === submissionId);
      expect(submission).toBeDefined();
      expect(submission.name).toBe(testAlgorithm.name);
      expect(submission.avgScore).toBe(testAlgorithm.avgScore);
      expect(submission.rank).toBeDefined();
    });

    it('should retrieve the full submission with code', async () => {
      const { status, data } = await api(`/api/leaderboard/${submissionId}`);

      expect(status).toBe(200);
      expect(data.id).toBe(submissionId);
      expect(data.name).toBe(testAlgorithm.name);
      expect(data.code).toBe(testAlgorithm.code);
      expect(data.avgScore).toBe(testAlgorithm.avgScore);
      expect(data.rank).toBeDefined();
    });

    it('should preview placement for a new score', async () => {
      const { status, data } = await api('/api/leaderboard/preview/100');

      expect(status).toBe(200);
      expect(data.projectedRank).toBeDefined();
      expect(data.totalSubmissions).toBeGreaterThan(0);
    });
  });

  describe('Full Manual Score Submission Flow', () => {
    const testScore = {
      name: `ManualTest_${Date.now()}`,
      score: 420, // (45 - 3) * 10 = 420
      length: 45,
      controlType: 'wasd-zx',
    };

    let scoreId: number;

    it('should submit a manual score', async () => {
      const { status, data } = await api('/api/manual', {
        method: 'POST',
        body: JSON.stringify(testScore),
      });

      expect(status).toBe(201);
      expect(data.name).toBe(testScore.name);
      expect(data.score).toBe(testScore.score);
      expect(data.length).toBe(testScore.length);
      expect(data.controlType).toBe(testScore.controlType);
      expect(data.id).toBeDefined();
      expect(data.rank).toBeDefined();

      scoreId = data.id;
    });

    it('should appear in the manual leaderboard', async () => {
      const { status, data } = await api('/api/manual');

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      const score = data.find((s: any) => s.id === scoreId);
      expect(score).toBeDefined();
      expect(score.name).toBe(testScore.name);
      expect(score.score).toBe(testScore.score);
    });
  });

  describe('Validation Tests', () => {
    it('should reject algorithm with missing fields', async () => {
      const { status, data } = await api('/api/leaderboard', {
        method: 'POST',
        body: JSON.stringify({ name: 'Incomplete' }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should reject algorithm with name over 50 chars', async () => {
      const { status, data } = await api('/api/leaderboard', {
        method: 'POST',
        body: JSON.stringify({
          name: 'A'.repeat(51),
          code: 'function test() {}',
          avgScore: 100,
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Name must be 50 characters or less');
    });

    it('should reject invalid score', async () => {
      const { status, data } = await api('/api/leaderboard', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test',
          code: 'function test() {}',
          avgScore: -1,
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Invalid score');
    });

    it('should reject manual score with mismatched score/length', async () => {
      const { status, data } = await api('/api/manual', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Cheater',
          score: 1000,
          length: 5, // Doesn't match: (5-3)*10 = 20, not 1000
          controlType: 'wasd-zx',
        }),
      });

      expect(status).toBe(400);
      expect(data.error).toBe('Score/length mismatch');
    });

    it('should return 404 for non-existent submission', async () => {
      const { status, data } = await api('/api/leaderboard/999999');

      expect(status).toBe(404);
      expect(data.error).toBe('Submission not found');
    });
  });

  describe('Concurrent Submissions', () => {
    it('should handle multiple simultaneous submissions', async () => {
      const submissions = Array.from({ length: 5 }, (_, i) => ({
        name: `Concurrent_${Date.now()}_${i}`,
        code: `function algo${i}() { return { x: 1, y: 0, z: 0 }; }`,
        avgScore: 100 + i * 10,
        maxScore: 150 + i * 10,
        survivalRate: 50 + i * 5,
        gamesPlayed: 10,
      }));

      const results = await Promise.all(
        submissions.map((sub) =>
          api('/api/leaderboard', {
            method: 'POST',
            body: JSON.stringify(sub),
          })
        )
      );

      // All should succeed
      results.forEach(({ status, data }, i) => {
        expect(status).toBe(201);
        expect(data.name).toBe(submissions[i].name);
        expect(data.id).toBeDefined();
      });

      // All IDs should be unique
      const ids = results.map((r) => r.data.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});
