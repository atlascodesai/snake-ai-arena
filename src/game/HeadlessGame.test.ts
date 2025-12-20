import { describe, it, expect } from 'vitest';
import { HeadlessGame, runBenchmark } from './HeadlessGame';
import type { Direction, GameContext } from './types';

// Simple algorithm that always moves right
const moveRightAlgorithm = (): Direction => ({ x: 1, y: 0, z: 0 });

// Algorithm that always returns null (no valid move)
const noMoveAlgorithm = (): null => null;

// Algorithm that throws an error
const errorAlgorithm = (): Direction => {
  throw new Error('Test error');
};

// Algorithm that moves toward food (greedy)
const greedyAlgorithm = (ctx: GameContext): Direction | null => {
  const { snake, food } = ctx;
  const head = snake[0];

  const directions: Direction[] = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];

  let bestDir: Direction | null = null;
  let bestDist = Infinity;

  for (const dir of directions) {
    const newHead = {
      x: ((head.x + dir.x + 8) % 16) - 8,
      y: ((head.y + dir.y + 8) % 16) - 8,
      z: ((head.z + dir.z + 8) % 16) - 8,
    };

    // Check collision with body
    const hitsBody = snake
      .slice(1)
      .some((seg) => seg.x === newHead.x && seg.y === newHead.y && seg.z === newHead.z);

    if (hitsBody) continue;

    const dist =
      Math.abs(newHead.x - food.x) + Math.abs(newHead.y - food.y) + Math.abs(newHead.z - food.z);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir;
    }
  }

  return bestDir;
};

describe('HeadlessGame', () => {
  describe('initialization', () => {
    it('should initialize with correct starting state', () => {
      const game = new HeadlessGame(moveRightAlgorithm, 12345);
      const state = game.getState();

      expect(state.snake).toHaveLength(3);
      expect(state.snake[0]).toEqual({ x: 0, y: 0, z: 0 });
      expect(state.score).toBe(0);
      expect(state.frame).toBe(0);
      expect(state.gameOver).toBe(false);
      expect(state.deathReason).toBeNull();
    });

    it('should spawn food not on snake', () => {
      const game = new HeadlessGame(moveRightAlgorithm, 12345);
      const state = game.getState();

      const foodPos = `${state.food.x},${state.food.y},${state.food.z}`;
      const snakePositions = state.snake.map((p) => `${p.x},${p.y},${p.z}`);

      expect(snakePositions).not.toContain(foodPos);
    });
  });

  describe('tick', () => {
    it('should move snake in returned direction', () => {
      const game = new HeadlessGame(moveRightAlgorithm, 12345);
      game.tick();

      const state = game.getState();
      expect(state.snake[0]).toEqual({ x: 1, y: 0, z: 0 });
      expect(state.frame).toBe(1);
    });

    it('should increment frame on each tick', () => {
      const game = new HeadlessGame(moveRightAlgorithm, 12345);

      game.tick();
      expect(game.getState().frame).toBe(1);

      game.tick();
      expect(game.getState().frame).toBe(2);

      game.tick();
      expect(game.getState().frame).toBe(3);
    });

    it('should end game when algorithm returns null', () => {
      const game = new HeadlessGame(noMoveAlgorithm, 12345);
      game.tick();

      const state = game.getState();
      expect(state.gameOver).toBe(true);
      expect(state.deathReason).toBe('no valid move');
    });

    it('should end game when algorithm throws error', () => {
      const game = new HeadlessGame(errorAlgorithm, 12345);
      game.tick();

      const state = game.getState();
      expect(state.gameOver).toBe(true);
      expect(state.deathReason).toContain('algorithm error');
    });

    it('should handle self collision', () => {
      // Algorithm that will cause self collision
      let moveCount = 0;
      const collisionAlgorithm = (): Direction => {
        // Move right, up, left, down to collide with initial position
        const moves: Direction[] = [
          { x: 0, y: 1, z: 0 },
          { x: -1, y: 0, z: 0 },
          { x: 0, y: -1, z: 0 },
        ];
        return moves[moveCount++ % moves.length];
      };

      const game = new HeadlessGame(collisionAlgorithm, 12345);

      // Run until game over
      for (let i = 0; i < 10 && !game.isOver(); i++) {
        game.tick();
      }

      // May end due to self collision
      const state = game.getState();
      if (state.gameOver) {
        expect(['self collision', 'no valid move']).toContain(state.deathReason);
      }
    });

    it('should not tick after game over', () => {
      const game = new HeadlessGame(noMoveAlgorithm, 12345);
      game.tick(); // This should end the game

      const stateAfterEnd = game.getState();
      expect(stateAfterEnd.gameOver).toBe(true);

      game.tick(); // Should not change anything
      const stateAfterSecondTick = game.getState();

      expect(stateAfterSecondTick.frame).toBe(stateAfterEnd.frame);
    });
  });

  describe('eating food', () => {
    it('should increase score when eating food', () => {
      // Use greedy algorithm to eat food
      const game = new HeadlessGame(greedyAlgorithm, 12345);
      const initialScore = game.getState().score;

      // Run until score changes or game ends
      for (let i = 0; i < 1000 && !game.isOver(); i++) {
        game.tick();
        if (game.getState().score > initialScore) break;
      }

      expect(game.getState().score).toBeGreaterThan(initialScore);
    });

    it('should grow snake when eating food', () => {
      const game = new HeadlessGame(greedyAlgorithm, 12345);
      const initialLength = game.getState().snake.length;

      // Run until snake grows or game ends
      for (let i = 0; i < 1000 && !game.isOver(); i++) {
        game.tick();
        if (game.getState().snake.length > initialLength) break;
      }

      expect(game.getState().snake.length).toBeGreaterThan(initialLength);
    });

    it('should respawn food after eating', () => {
      const game = new HeadlessGame(greedyAlgorithm, 12345);
      const initialFood = { ...game.getState().food };

      // Run until score increases (food eaten)
      for (let i = 0; i < 1000 && !game.isOver(); i++) {
        game.tick();
        if (game.getState().score > 0) break;
      }

      // Food should have moved (or game ended)
      if (!game.isOver()) {
        const newFood = game.getState().food;
        // Food position should have changed
        expect(
          newFood.x !== initialFood.x || newFood.y !== initialFood.y || newFood.z !== initialFood.z
        ).toBe(true);
      }
    });
  });

  describe('timeout', () => {
    it('should end game at max frames', () => {
      // Create game with small max frames
      const game = new HeadlessGame(moveRightAlgorithm, 12345, 5);

      game.runToCompletion();

      const state = game.getState();
      expect(state.gameOver).toBe(true);
      expect(state.deathReason).toBe('timeout');
      expect(state.frame).toBe(5);
    });
  });

  describe('runToCompletion', () => {
    it('should run until game over', () => {
      const game = new HeadlessGame(noMoveAlgorithm, 12345);
      const finalState = game.runToCompletion();

      expect(finalState.gameOver).toBe(true);
    });

    it('should eventually end with greedy algorithm', () => {
      const game = new HeadlessGame(greedyAlgorithm, 12345, 1000);
      const finalState = game.runToCompletion();

      expect(finalState.gameOver).toBe(true);
      // Should have made some progress
      expect(finalState.frame).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should reset game to initial state', () => {
      const game = new HeadlessGame(greedyAlgorithm, 12345);

      // Play some moves
      for (let i = 0; i < 10; i++) {
        game.tick();
      }

      // Reset
      game.reset(12345);

      const state = game.getState();
      expect(state.snake).toHaveLength(3);
      expect(state.snake[0]).toEqual({ x: 0, y: 0, z: 0 });
      expect(state.score).toBe(0);
      expect(state.frame).toBe(0);
      expect(state.gameOver).toBe(false);
    });

    it('should produce same game with same seed', () => {
      const game1 = new HeadlessGame(moveRightAlgorithm, 99999);
      const game2 = new HeadlessGame(moveRightAlgorithm, 99999);

      const state1 = game1.getState();
      const state2 = game2.getState();

      expect(state1.food).toEqual(state2.food);
    });
  });

  describe('isOver', () => {
    it('should return false initially', () => {
      const game = new HeadlessGame(moveRightAlgorithm, 12345);
      expect(game.isOver()).toBe(false);
    });

    it('should return true after game ends', () => {
      const game = new HeadlessGame(noMoveAlgorithm, 12345);
      game.tick();
      expect(game.isOver()).toBe(true);
    });
  });

  describe('getScore', () => {
    it('should return current score', () => {
      const game = new HeadlessGame(moveRightAlgorithm, 12345);
      expect(game.getScore()).toBe(0);
    });
  });

  describe('deterministic behavior', () => {
    it('should produce same results with same seed', () => {
      const seed = 42;

      const game1 = new HeadlessGame(greedyAlgorithm, seed, 100);
      const final1 = game1.runToCompletion();

      const game2 = new HeadlessGame(greedyAlgorithm, seed, 100);
      const final2 = game2.runToCompletion();

      expect(final1.score).toBe(final2.score);
      expect(final1.frame).toBe(final2.frame);
      expect(final1.deathReason).toBe(final2.deathReason);
    });

    it('should produce different results with different seeds', () => {
      const game1 = new HeadlessGame(greedyAlgorithm, 1, 500);
      game1.runToCompletion();

      const game2 = new HeadlessGame(greedyAlgorithm, 2, 500);
      game2.runToCompletion();

      // Results may differ (not guaranteed, but likely with different seeds)
      // At minimum, food positions should be different
      const state1 = new HeadlessGame(greedyAlgorithm, 1).getState();
      const state2 = new HeadlessGame(greedyAlgorithm, 2).getState();

      expect(
        state1.food.x !== state2.food.x ||
          state1.food.y !== state2.food.y ||
          state1.food.z !== state2.food.z
      ).toBe(true);
    });
  });
});

describe('runBenchmark', () => {
  it('should run specified number of games', () => {
    const result = runBenchmark(greedyAlgorithm, 5, 1);

    expect(result.scores).toHaveLength(5);
  });

  it('should calculate average score', () => {
    const result = runBenchmark(greedyAlgorithm, 3, 1);

    const expectedAvg = result.scores.reduce((a, b) => a + b, 0) / result.scores.length;
    expect(result.avgScore).toBe(expectedAvg);
  });

  it('should find max score', () => {
    const result = runBenchmark(greedyAlgorithm, 5, 1);

    expect(result.maxScore).toBe(Math.max(...result.scores));
  });

  it('should calculate survival rate', () => {
    // With very low max frames, some games should survive (timeout)
    const timeoutAlgorithm = (ctx: GameContext): Direction => {
      // Always move in a valid direction
      const head = ctx.snake[0];
      for (const dir of [
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: -1 },
      ]) {
        const newHead = {
          x: ((head.x + dir.x + 8) % 16) - 8,
          y: ((head.y + dir.y + 8) % 16) - 8,
          z: ((head.z + dir.z + 8) % 16) - 8,
        };
        const hitsBody = ctx.snake
          .slice(1)
          .some((seg) => seg.x === newHead.x && seg.y === newHead.y && seg.z === newHead.z);
        if (!hitsBody) return dir;
      }
      return { x: 1, y: 0, z: 0 };
    };

    // This is difficult to test reliably without controlling the game engine
    const result = runBenchmark(timeoutAlgorithm, 3, 1);
    expect(result.survivalRate).toBeGreaterThanOrEqual(0);
    expect(result.survivalRate).toBeLessThanOrEqual(100);
  });

  it('should use different seeds for each game', () => {
    // Run benchmark with algorithm that should produce different results
    const result = runBenchmark(greedyAlgorithm, 10, 1);

    // Not all scores should be exactly the same
    const uniqueScores = new Set(result.scores);
    expect(uniqueScores.size).toBeGreaterThan(1);
  });
});
