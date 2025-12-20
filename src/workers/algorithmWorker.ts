/**
 * Web Worker for sandboxed algorithm execution
 * Runs user code in isolation with timeout protection
 */

import type { GameContext, Direction } from '../game/types';
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
} from '../game/utils';

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

// Type for messages to worker
interface WorkerMessage {
  type: 'init' | 'tick';
  code?: string;
  ctx?: GameContext;
}

// Type for messages from worker
interface WorkerResponse {
  type: 'ready' | 'direction' | 'error';
  direction?: Direction | null;
  error?: string;
}

let userAlgorithm: ((ctx: GameContext) => Direction | null) | null = null;

// Compile user code into a function
function compileCode(code: string): (ctx: GameContext) => Direction | null {
  // Wrap code in a function that returns the algorithm function
  const wrappedCode = `
    ${code}
    return typeof algorithm === 'function' ? algorithm : null;
  `;

  try {
    // Create function with utils in scope
    const factory = new Function('utils', wrappedCode);
    const fn = factory(utils);

    if (typeof fn !== 'function') {
      throw new Error('Code must define an "algorithm" function');
    }

    return fn;
  } catch (error) {
    throw new Error(
      `Compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Handle messages
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, code, ctx } = event.data;

  try {
    switch (type) {
      case 'init':
        if (!code) {
          throw new Error('No code provided');
        }
        userAlgorithm = compileCode(code);
        self.postMessage({ type: 'ready' } as WorkerResponse);
        break;

      case 'tick': {
        if (!userAlgorithm) {
          throw new Error('Algorithm not initialized');
        }
        if (!ctx) {
          throw new Error('No game context provided');
        }

        // Run algorithm with timeout (100ms max)
        const startTime = performance.now();
        const direction = userAlgorithm(ctx);
        const elapsed = performance.now() - startTime;

        if (elapsed > 100) {
          console.warn(`Algorithm took ${elapsed.toFixed(2)}ms (>100ms warning)`);
        }

        self.postMessage({ type: 'direction', direction } as WorkerResponse);
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse);
  }
};

// Export types for the main thread
export type { WorkerMessage, WorkerResponse };
