/**
 * Leaderboard API Routes
 */

import { Router, Request, Response } from 'express';
import { db, SubmissionRow } from '../db.js';

const router = Router();

// GET /api/leaderboard - Get top 50 submissions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const submissions = await db.getLeaderboard();

    // Add rank to each submission
    const ranked = submissions.map((sub, index) => ({
      id: sub.id,
      name: sub.name,
      linesOfCode: sub.lines_of_code,
      avgScore: sub.avg_score,
      maxScore: sub.max_score,
      survivalRate: sub.survival_rate,
      gamesPlayed: sub.games_played,
      createdAt: sub.created_at,
      rank: index + 1,
    }));

    res.json(ranked);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/leaderboard/:id - Get single submission with code
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submission = await db.getSubmission(parseInt(id));

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Get rank
    const rankResult = await db.getRank(submission.avg_score);

    res.json({
      id: submission.id,
      name: submission.name,
      code: submission.code,
      linesOfCode: submission.lines_of_code,
      avgScore: submission.avg_score,
      maxScore: submission.max_score,
      survivalRate: submission.survival_rate,
      gamesPlayed: submission.games_played,
      createdAt: submission.created_at,
      rank: rankResult.rank,
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// GET /api/leaderboard/preview/:avgScore - Preview placement without submitting
router.get('/preview/:avgScore', async (req: Request, res: Response) => {
  try {
    const avgScore = parseInt(req.params.avgScore);

    if (isNaN(avgScore)) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    // Get what rank this score would be
    const rankResult = await db.getRank(avgScore);
    const totalResult = await db.getTotalCount();

    // Get nearby competitors (submissions around this rank)
    const submissions = await db.getLeaderboard();
    const projectedRank = rankResult.rank;

    // Find submissions just above and below
    // Submissions are sorted by avg_score DESC, so higher scores come first
    const above = submissions
      .filter(s => s.avg_score > avgScore)
      .slice(-2) // Get the 2 closest scores above (at the end of filtered list)
      .reverse() // Reverse so highest is first
      .map((s, i, arr) => ({
        name: s.name,
        avgScore: s.avg_score,
        rank: projectedRank - (arr.length - i),
      }));

    const below = submissions
      .filter(s => s.avg_score <= avgScore)
      .slice(0, 2)
      .map((s, i) => ({
        name: s.name,
        avgScore: s.avg_score,
        rank: projectedRank + i + 1,
      }));

    res.json({
      projectedRank,
      totalSubmissions: totalResult.count,
      above,
      below,
    });
  } catch (error) {
    console.error('Error previewing placement:', error);
    res.status(500).json({ error: 'Failed to preview placement' });
  }
});

// POST /api/leaderboard - Create new submission
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, code, avgScore, maxScore, survivalRate, gamesPlayed } = req.body;

    // Validate required fields
    if (!name || !code || avgScore === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Input validation
    if (typeof name !== 'string' || name.length > 50) {
      return res.status(400).json({ error: 'Name must be 50 characters or less' });
    }

    if (typeof code !== 'string' || code.length > 100000) {
      return res.status(400).json({ error: 'Code must be 100KB or less' });
    }

    if (typeof avgScore !== 'number' || avgScore < 0 || avgScore > 1000000) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    // Count lines of code (non-empty, non-comment lines)
    const linesOfCode = code
      .split('\n')
      .filter((line: string) => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
      })
      .length;

    // Insert submission
    const result = await db.insertSubmission(
      name,
      code,
      linesOfCode,
      avgScore,
      maxScore || avgScore,
      survivalRate || 0,
      gamesPlayed || 10
    );

    // Get rank
    const rankResult = await db.getRank(avgScore);
    const totalResult = await db.getTotalCount();

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      linesOfCode,
      avgScore,
      maxScore: maxScore || avgScore,
      survivalRate: survivalRate || 0,
      rank: rankResult.rank,
      totalSubmissions: totalResult.count,
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

export default router;
