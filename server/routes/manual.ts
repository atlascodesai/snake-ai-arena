/**
 * Manual Play Score API Routes
 */

import { Router, Request, Response } from 'express';
import { db, CONTROL_TYPES, VIEW_MODES } from '../db.js';

const router = Router();

// GET /api/manual - Get top 50 manual scores
router.get('/', async (_req: Request, res: Response) => {
  try {
    const scores = await db.getManualLeaderboard();

    // Add rank to each score
    const ranked = scores.map((score, index) => ({
      id: score.id,
      name: score.name,
      score: score.score,
      length: score.length,
      controlType: score.control_type || 'wasd-zx',
      viewMode: score.view_mode || 'orbit',
      createdAt: score.created_at,
      rank: index + 1,
    }));

    res.json(ranked);
  } catch (error) {
    console.error('Error fetching manual leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch manual leaderboard' });
  }
});

// POST /api/manual - Submit a new manual score
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, score, length, controlType, viewMode } = req.body;

    // Validate required fields
    if (!name || score === undefined || length === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate name (1-20 characters)
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 20) {
      return res.status(400).json({ error: 'Name must be 1-20 characters' });
    }

    // Validate score (must be finite number within range)
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1000000) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    // Validate length (must be finite integer within range)
    if (
      typeof length !== 'number' ||
      !Number.isFinite(length) ||
      !Number.isInteger(length) ||
      length < 3 ||
      length > 4096
    ) {
      return res.status(400).json({ error: 'Invalid length' });
    }

    // Basic score/length sanity check
    // Each food gives 10 points and increases length by 1
    // Snake starts with length 3, so: expectedScore = (length - 3) * 10
    const expectedScore = (length - 3) * 10;
    if (score !== expectedScore) {
      return res.status(400).json({ error: 'Score/length mismatch' });
    }

    // Validate control type (default to 'wasd-zx' for backwards compatibility)
    const validControlType = CONTROL_TYPES.includes(controlType) ? controlType : 'wasd-zx';

    // Validate view mode (default to 'orbit' for backwards compatibility)
    const validViewMode = VIEW_MODES.includes(viewMode) ? viewMode : 'orbit';

    // Insert score with trimmed name
    const trimmedName = name.trim();
    const result = await db.insertManualScore(
      trimmedName,
      score,
      length,
      validControlType,
      validViewMode
    );

    // Get rank
    const rankResult = await db.getManualRank(score);
    const totalResult = await db.getManualTotalCount();

    res.status(201).json({
      id: result.lastInsertRowid,
      name: trimmedName,
      score,
      length,
      controlType: validControlType,
      viewMode: validViewMode,
      rank: rankResult.rank,
      totalScores: totalResult.count,
    });
  } catch (error) {
    console.error('Error submitting manual score:', error);
    res.status(500).json({ error: 'Failed to submit score' });
  }
});

export default router;
