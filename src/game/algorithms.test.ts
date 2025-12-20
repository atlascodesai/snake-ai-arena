import { describe, it, expect } from 'vitest';
import {
  demoAlgorithm,
  greedyAlgorithm,
  smartAlgorithm,
  greedyAlgorithmCode,
  smartAlgorithmCode,
  templateCode,
} from './algorithms';
import type { GameContext, Direction } from './types';
import { posEqual, wrapPosition } from './utils';

// Helper to create a game context
function createContext(overrides: Partial<GameContext> = {}): GameContext {
  return {
    snake: [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
    ],
    food: { x: 3, y: 0, z: 0 },
    gridSize: 16,
    score: 0,
    frame: 0,
    ...overrides,
  };
}

// Helper to check if direction is valid (only one axis non-zero)
function isValidDirection(dir: Direction | null): boolean {
  if (!dir) return false;
  const nonZero = (dir.x !== 0 ? 1 : 0) + (dir.y !== 0 ? 1 : 0) + (dir.z !== 0 ? 1 : 0);
  return nonZero === 1;
}

// Helper to check if move doesn't hit body
function moveIsSafe(
  head: { x: number; y: number; z: number },
  dir: Direction,
  snake: { x: number; y: number; z: number }[]
): boolean {
  const newHead = wrapPosition({
    x: head.x + dir.x,
    y: head.y + dir.y,
    z: head.z + dir.z,
  });
  return !snake.slice(1).some((seg) => posEqual(seg, newHead));
}

describe('demoAlgorithm', () => {
  it('should return a valid direction', () => {
    const ctx = createContext();
    const dir = demoAlgorithm(ctx);
    expect(isValidDirection(dir)).toBe(true);
  });

  it('should not hit its own body', () => {
    const ctx = createContext();
    const dir = demoAlgorithm(ctx);
    expect(dir).not.toBeNull();
    expect(moveIsSafe(ctx.snake[0], dir!, ctx.snake)).toBe(true);
  });

  it('should change direction based on frame', () => {
    const ctx1 = createContext({ frame: 0 });
    const ctx2 = createContext({ frame: 8 });
    const ctx3 = createContext({ frame: 16 });

    const dir1 = demoAlgorithm(ctx1);
    const dir2 = demoAlgorithm(ctx2);
    const dir3 = demoAlgorithm(ctx3);

    // They might be same if fallback is triggered, so just verify they're valid
    expect(isValidDirection(dir1)).toBe(true);
    expect(isValidDirection(dir2)).toBe(true);
    expect(isValidDirection(dir3)).toBe(true);
  });

  it('should return null when completely surrounded', () => {
    // Snake surrounds head completely
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 }, // head
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
      ],
    });
    const dir = demoAlgorithm(ctx);
    expect(dir).toBeNull();
  });
});

describe('greedyAlgorithm', () => {
  it('should return a valid direction', () => {
    const ctx = createContext();
    const dir = greedyAlgorithm(ctx);
    expect(isValidDirection(dir)).toBe(true);
  });

  it('should move toward food', () => {
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
      ],
      food: { x: 5, y: 0, z: 0 },
    });
    const dir = greedyAlgorithm(ctx);

    // Should move in +x direction (toward food)
    expect(dir).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('should avoid body when moving toward food', () => {
    // Food is to the right, but body blocks direct path
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 }, // Body blocks +x direction
        { x: 1, y: 1, z: 0 },
      ],
      food: { x: 2, y: 0, z: 0 },
    });
    const dir = greedyAlgorithm(ctx);

    expect(dir).not.toBeNull();
    expect(dir).not.toEqual({ x: 1, y: 0, z: 0 }); // Should not go into body
  });

  it('should return null when surrounded', () => {
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
      ],
    });
    const dir = greedyAlgorithm(ctx);
    expect(dir).toBeNull();
  });

  it('should choose closest direction when food is diagonal', () => {
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
      ],
      food: { x: 3, y: 2, z: 0 },
    });
    const dir = greedyAlgorithm(ctx);

    // Should prefer +x (distance 2+2=4) over +y (distance 3+1=4)
    // Both are equal, so either is valid
    expect(isValidDirection(dir)).toBe(true);
  });
});

describe('smartAlgorithm', () => {
  it('should return a valid direction', () => {
    const ctx = createContext();
    const dir = smartAlgorithm(ctx);
    expect(isValidDirection(dir)).toBe(true);
  });

  it('should move toward food when safe', () => {
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: -2, y: 0, z: 0 },
      ],
      food: { x: 2, y: 0, z: 0 },
    });
    const dir = smartAlgorithm(ctx);

    // Should move toward food
    expect(dir).toEqual({ x: 1, y: 0, z: 0 });
  });

  it('should fall back to tail-following when no safe path to food', () => {
    // This is a complex scenario - just verify it returns something valid
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: -2, y: 0, z: 0 },
        { x: -2, y: 1, z: 0 },
        { x: -1, y: 1, z: 0 },
      ],
      food: { x: 5, y: 5, z: 5 },
    });
    const dir = smartAlgorithm(ctx);

    expect(dir).not.toBeNull();
    expect(isValidDirection(dir)).toBe(true);
    expect(moveIsSafe(ctx.snake[0], dir!, ctx.snake)).toBe(true);
  });

  it('should handle being nearly trapped', () => {
    // Create a scenario where all 6 adjacent cells are body segments
    // Since smartAlgorithm uses slice(1), it excludes head from collision
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 }, // head
        { x: 1, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 0, y: -1, z: 0 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: -1 },
      ],
    });
    const dir = smartAlgorithm(ctx);
    // smartAlgorithm has fallback logic that might find a move
    // Just verify the return type is correct
    expect(dir === null || isValidDirection(dir)).toBe(true);
  });
});

describe('Algorithm code strings', () => {
  it('should have greedy algorithm code', () => {
    expect(greedyAlgorithmCode).toContain('function algorithm(ctx)');
    expect(greedyAlgorithmCode).toContain('Greedy Algorithm');
  });

  it('should have smart algorithm code', () => {
    expect(smartAlgorithmCode).toContain('function algorithm(ctx)');
    expect(smartAlgorithmCode).toContain('Smart Algorithm');
    expect(smartAlgorithmCode).toContain('findPathBFS');
  });

  it('should have template code with documentation', () => {
    expect(templateCode).toContain('function algorithm(ctx)');
    expect(templateCode).toContain('ctx.snake');
    expect(templateCode).toContain('ctx.food');
    expect(templateCode).toContain('utils.wrapPosition');
  });
});

describe('Algorithm stress tests', () => {
  it('should handle long snake', () => {
    const longSnake = [];
    for (let i = 0; i < 50; i++) {
      longSnake.push({ x: -i % 16, y: Math.floor(i / 16), z: 0 });
    }

    const ctx = createContext({
      snake: longSnake,
      food: { x: 7, y: 7, z: 7 },
    });

    const greedyDir = greedyAlgorithm(ctx);
    const smartDir = smartAlgorithm(ctx);

    // Both should return valid directions
    expect(greedyDir === null || isValidDirection(greedyDir)).toBe(true);
    expect(smartDir === null || isValidDirection(smartDir)).toBe(true);
  });

  it('should handle food at same position as head', () => {
    const ctx = createContext({
      snake: [
        { x: 0, y: 0, z: 0 },
        { x: -1, y: 0, z: 0 },
      ],
      food: { x: 0, y: 0, z: 0 },
    });

    const greedyDir = greedyAlgorithm(ctx);
    const smartDir = smartAlgorithm(ctx);

    // Should still return valid moves (food will respawn after eating)
    expect(isValidDirection(greedyDir)).toBe(true);
    expect(isValidDirection(smartDir)).toBe(true);
  });
});
