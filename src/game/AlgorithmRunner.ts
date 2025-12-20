/**
 * Algorithm Runner
 * Manages game execution with user algorithms
 */

import { GameState, AlgorithmFunction } from './types';
import { HeadlessGame } from './HeadlessGame';
import {
  wrapPosition,
  posEqual,
  distance,
  createCollisionSet,
  findPathBFS,
  normalizeDirection,
  posKey,
  ALL_DIRECTIONS,
  GRID_SIZE,
} from './utils';

// Utilities available to user code
const utils = {
  wrapPosition,
  posEqual,
  distance,
  createCollisionSet,
  findPathBFS,
  normalizeDirection,
  posKey,
  ALL_DIRECTIONS,
  GRID_SIZE,
};

/**
 * Compile user code string into an algorithm function
 */
export function compileAlgorithm(code: string): AlgorithmFunction {
  const wrappedCode = `
    ${code}
    return typeof algorithm === 'function' ? algorithm : null;
  `;

  try {
    const factory = new Function('utils', wrappedCode);
    const fn = factory(utils);

    if (typeof fn !== 'function') {
      throw new Error('Code must define an "algorithm" function');
    }

    return fn as AlgorithmFunction;
  } catch (error) {
    throw new Error(
      `Compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Run a benchmark with the given algorithm code
 */
export function runBenchmark(
  code: string,
  numGames: number = 10,
  onProgress?: (current: number, total: number) => void
): { scores: number[]; avgScore: number; maxScore: number; survivalRate: number } {
  const algorithm = compileAlgorithm(code);
  const scores: number[] = [];
  let survivals = 0;

  for (let i = 0; i < numGames; i++) {
    const game = new HeadlessGame(algorithm, i + 1);
    const finalState = game.runToCompletion();
    scores.push(finalState.score);

    if (finalState.deathReason === 'timeout') {
      survivals++;
    }

    onProgress?.(i + 1, numGames);
  }

  return {
    scores,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    maxScore: Math.max(...scores),
    survivalRate: Math.round((survivals / numGames) * 100),
  };
}

/**
 * Game controller for visual playback
 */
export class GameController {
  private game: HeadlessGame;
  private algorithm: AlgorithmFunction;
  private tickInterval: number | null = null;
  private onStateChange: (state: GameState) => void;
  private onGameEnd: (score: number) => void;
  private seed: number;
  private speed: number;

  constructor(
    code: string,
    onStateChange: (state: GameState) => void,
    onGameEnd: (score: number) => void,
    seed: number = Date.now(),
    speed: number = 150
  ) {
    this.algorithm = compileAlgorithm(code);
    this.onStateChange = onStateChange;
    this.onGameEnd = onGameEnd;
    this.seed = seed;
    this.speed = speed;
    this.game = new HeadlessGame(this.algorithm, seed);
  }

  start(): void {
    if (this.tickInterval) return;

    this.tickInterval = window.setInterval(() => {
      const state = this.game.tick();
      this.onStateChange(state);

      if (state.gameOver) {
        this.stop();
        this.onGameEnd(state.score);
      }
    }, this.speed);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  reset(newSeed?: number): void {
    this.stop();
    this.seed = newSeed ?? Date.now();
    this.game = new HeadlessGame(this.algorithm, this.seed);
    this.onStateChange(this.game.getState());
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.tickInterval) {
      this.stop();
      this.start();
    }
  }

  getState(): GameState {
    return this.game.getState();
  }

  isRunning(): boolean {
    return this.tickInterval !== null;
  }

  destroy(): void {
    this.stop();
  }
}
