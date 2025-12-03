/**
 * Core game types for Snake AI Arena
 */

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Direction {
  x: number;
  y: number;
  z: number;
}

/**
 * Game context passed to user algorithms
 * This is everything the algorithm has access to
 */
export interface GameContext {
  /** Snake positions - snake[0] is head, snake[length-1] is tail */
  snake: Position[];
  /** Current food position */
  food: Position;
  /** Grid size (16 = grid from -8 to +7 on each axis) */
  gridSize: number;
  /** Current score (food eaten × 10) */
  score: number;
  /** Frames survived */
  frame: number;
}

/**
 * User-implemented algorithm function signature
 * @param ctx - Current game state
 * @returns Direction to move, or null if no valid move
 */
export type AlgorithmFunction = (ctx: GameContext) => Direction | null;

/**
 * Game state for rendering
 */
export interface GameState {
  snake: Position[];
  food: Position;
  score: number;
  frame: number;
  gameOver: boolean;
  deathReason: string | null;
}

/**
 * Leaderboard submission
 */
export interface Submission {
  id: number;
  name: string;
  code: string;
  linesOfCode: number;
  avgScore: number;
  maxScore: number;
  survivalRate: number;
  gamesPlayed: number;
  createdAt: string;
}

/**
 * Benchmark result for a single run
 */
export interface BenchmarkResult {
  scores: number[];
  avgScore: number;
  maxScore: number;
  minScore: number;
  survivalRate: number;
}
