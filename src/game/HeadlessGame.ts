/**
 * Headless Snake Game Engine
 * Pure game logic - no rendering
 */

import { Position, Direction, GameState, GameContext, AlgorithmFunction } from './types';
import { wrapPosition, posEqual, posKey, GRID_SIZE, HALF_GRID, MAX_FRAMES } from './utils';

// Seeded random number generator for deterministic games
// Pattern 4, pattern 4, pattern 4...
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

export class HeadlessGame {
  private snake: Position[];
  private food: Position;
  private score: number;
  private frame: number;
  private gameOver: boolean;
  private deathReason: string | null;
  private algorithm: AlgorithmFunction;
  private rng: SeededRandom;
  private maxFrames: number;

  constructor(algorithm: AlgorithmFunction, seed: number = Date.now(), maxFrames: number = MAX_FRAMES) {
    this.algorithm = algorithm;
    this.rng = new SeededRandom(seed);
    this.maxFrames = maxFrames;

    // Initialize snake at center
    this.snake = [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
    ];

    this.food = this.spawnFood();
    this.score = 0;
    this.frame = 0;
    this.gameOver = false;
    this.deathReason = null;
  }

  private spawnFood(): Position {
    const occupied = new Set(this.snake.map(p => posKey(p)));

    // If snake fills most of the grid, find any free position systematically
    const gridSize = HALF_GRID * 2; // 16
    const totalCells = gridSize * gridSize * gridSize; // 4096

    // Try random positions first (fast path)
    let pos: Position;
    let attempts = 0;
    do {
      pos = {
        x: this.rng.nextInt(-HALF_GRID, HALF_GRID - 1),
        y: this.rng.nextInt(-HALF_GRID, HALF_GRID - 1),
        z: this.rng.nextInt(-HALF_GRID, HALF_GRID - 1),
      };
      attempts++;
    } while (occupied.has(posKey(pos)) && attempts < 1000);

    // If random failed, scan systematically for any free cell
    if (occupied.has(posKey(pos))) {
      for (let x = -HALF_GRID; x < HALF_GRID; x++) {
        for (let y = -HALF_GRID; y < HALF_GRID; y++) {
          for (let z = -HALF_GRID; z < HALF_GRID; z++) {
            pos = { x, y, z };
            if (!occupied.has(posKey(pos))) {
              return pos;
            }
          }
        }
      }
      // Grid is completely full - this shouldn't happen in normal gameplay
      // Return last position anyway (game will likely end soon)
    }

    return pos;
  }

  /**
   * Run one frame of the game
   */
  tick(): GameState {
    if (this.gameOver) {
      return this.getState();
    }

    this.frame++;

    // Check max frames (timeout)
    if (this.frame >= this.maxFrames) {
      this.gameOver = true;
      this.deathReason = 'timeout';
      return this.getState();
    }

    // Get direction from algorithm
    const ctx: GameContext = {
      snake: [...this.snake.map(p => ({ ...p }))],
      food: { ...this.food },
      gridSize: GRID_SIZE,
      score: this.score,
      frame: this.frame,
    };

    let direction: Direction | null;
    try {
      // Track execution time to detect runaway algorithms
      const startTime = performance.now();
      direction = this.algorithm(ctx);
      const elapsed = performance.now() - startTime;

      // If a single frame takes > 100ms, the algorithm is too slow
      if (elapsed > 100) {
        this.gameOver = true;
        this.deathReason = `algorithm too slow (${Math.round(elapsed)}ms per frame)`;
        return this.getState();
      }
    } catch (error) {
      this.gameOver = true;
      this.deathReason = `algorithm error: ${error}`;
      return this.getState();
    }

    // No valid move
    if (!direction) {
      this.gameOver = true;
      this.deathReason = 'no valid move';
      return this.getState();
    }

    // Calculate new head position
    const head = this.snake[0];
    const newHead = wrapPosition({
      x: head.x + direction.x,
      y: head.y + direction.y,
      z: head.z + direction.z,
    });

    // Check self collision (excluding tail which will move)
    const willEat = posEqual(newHead, this.food);
    const bodyToCheck = willEat ? this.snake : this.snake.slice(0, -1);

    if (bodyToCheck.some(seg => posEqual(seg, newHead))) {
      this.gameOver = true;
      this.deathReason = 'self collision';
      return this.getState();
    }

    // Move snake
    this.snake.unshift(newHead);

    if (willEat) {
      // Grow and spawn new food
      this.score += 10;
      this.food = this.spawnFood();
    } else {
      // Remove tail
      this.snake.pop();
    }

    return this.getState();
  }

  /**
   * Run game to completion
   */
  runToCompletion(): GameState {
    while (!this.gameOver) {
      this.tick();
    }
    return this.getState();
  }

  /**
   * Get current game state
   */
  getState(): GameState {
    return {
      snake: this.snake.map(p => ({ ...p })),
      food: { ...this.food },
      score: this.score,
      frame: this.frame,
      gameOver: this.gameOver,
      deathReason: this.deathReason,
    };
  }

  /**
   * Check if game is over
   */
  isOver(): boolean {
    return this.gameOver;
  }

  /**
   * Get final score
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Reset game with new seed
   */
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.rng = new SeededRandom(seed);
    }

    this.snake = [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
    ];

    this.food = this.spawnFood();
    this.score = 0;
    this.frame = 0;
    this.gameOver = false;
    this.deathReason = null;
  }
}

/**
 * Run benchmark: Play N games and return statistics
 */
export function runBenchmark(
  algorithm: AlgorithmFunction,
  numGames: number = 10,
  startSeed: number = 1
): { scores: number[]; avgScore: number; maxScore: number; survivalRate: number } {
  const scores: number[] = [];
  let survivals = 0;

  for (let i = 0; i < numGames; i++) {
    const game = new HeadlessGame(algorithm, startSeed + i);
    const finalState = game.runToCompletion();
    scores.push(finalState.score);

    if (finalState.deathReason === 'timeout') {
      survivals++;
    }
  }

  return {
    scores,
    avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    maxScore: Math.max(...scores),
    survivalRate: (survivals / numGames) * 100,
  };
}
