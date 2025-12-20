import { describe, it, expect } from 'vitest';
import {
  GRID_SIZE,
  HALF_GRID,
  MAX_FRAMES,
  ALL_DIRECTIONS,
  wrapPosition,
  posEqual,
  posKey,
  distance,
  createCollisionSet,
  getNeighbors,
  findPathBFS,
  normalizeDirection,
  isValidDirection,
} from './utils';
import type { Position } from './types';

describe('Constants', () => {
  it('should have correct grid size', () => {
    expect(GRID_SIZE).toBe(16);
    expect(HALF_GRID).toBe(8);
  });

  it('should have reasonable max frames', () => {
    expect(MAX_FRAMES).toBe(25000);
  });

  it('should have 6 directions', () => {
    expect(ALL_DIRECTIONS).toHaveLength(6);
  });

  it('should have all axis directions', () => {
    const directions = ALL_DIRECTIONS;
    expect(directions).toContainEqual({ x: 1, y: 0, z: 0 });
    expect(directions).toContainEqual({ x: -1, y: 0, z: 0 });
    expect(directions).toContainEqual({ x: 0, y: 1, z: 0 });
    expect(directions).toContainEqual({ x: 0, y: -1, z: 0 });
    expect(directions).toContainEqual({ x: 0, y: 0, z: 1 });
    expect(directions).toContainEqual({ x: 0, y: 0, z: -1 });
  });
});

describe('wrapPosition', () => {
  it('should not change positions within bounds', () => {
    expect(wrapPosition({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
    expect(wrapPosition({ x: 5, y: -3, z: 7 })).toEqual({ x: 5, y: -3, z: 7 });
    expect(wrapPosition({ x: -8, y: -8, z: -8 })).toEqual({ x: -8, y: -8, z: -8 });
  });

  it('should wrap positive overflow', () => {
    expect(wrapPosition({ x: 8, y: 0, z: 0 })).toEqual({ x: -8, y: 0, z: 0 });
    expect(wrapPosition({ x: 9, y: 0, z: 0 })).toEqual({ x: -7, y: 0, z: 0 });
    expect(wrapPosition({ x: 16, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('should wrap negative overflow', () => {
    expect(wrapPosition({ x: -9, y: 0, z: 0 })).toEqual({ x: 7, y: 0, z: 0 });
    expect(wrapPosition({ x: -16, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('should wrap all axes independently', () => {
    expect(wrapPosition({ x: 10, y: -10, z: 20 })).toEqual({ x: -6, y: 6, z: 4 });
  });
});

describe('posEqual', () => {
  it('should return true for equal positions', () => {
    expect(posEqual({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(true);
    expect(posEqual({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 })).toBe(true);
  });

  it('should return false for different positions', () => {
    expect(posEqual({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 4 })).toBe(false);
    expect(posEqual({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(false);
  });
});

describe('posKey', () => {
  it('should generate unique keys for different positions', () => {
    expect(posKey({ x: 1, y: 2, z: 3 })).toBe('1,2,3');
    expect(posKey({ x: -5, y: 0, z: 7 })).toBe('-5,0,7');
  });

  it('should generate same key for same position', () => {
    const pos = { x: 3, y: 4, z: 5 };
    expect(posKey(pos)).toBe(posKey({ ...pos }));
  });
});

describe('distance', () => {
  it('should calculate Manhattan distance for adjacent positions', () => {
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBe(1);
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(1);
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 })).toBe(1);
  });

  it('should calculate correct distance for multi-axis', () => {
    expect(distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 5 })).toBe(12);
  });

  it('should account for wrapping (shortest path)', () => {
    // Distance from x=-7 to x=7 is 2 (wrap around), not 14
    expect(distance({ x: -7, y: 0, z: 0 }, { x: 7, y: 0, z: 0 })).toBe(2);
  });

  it('should be symmetric', () => {
    const a = { x: 3, y: -2, z: 5 };
    const b = { x: -4, y: 1, z: -3 };
    expect(distance(a, b)).toBe(distance(b, a));
  });
});

describe('createCollisionSet', () => {
  it('should create empty set for empty array', () => {
    const set = createCollisionSet([]);
    expect(set.size).toBe(0);
  });

  it('should create set with all positions', () => {
    const positions: Position[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
    ];
    const set = createCollisionSet(positions);
    expect(set.size).toBe(3);
    expect(set.has('0,0,0')).toBe(true);
    expect(set.has('1,0,0')).toBe(true);
    expect(set.has('2,0,0')).toBe(true);
    expect(set.has('3,0,0')).toBe(false);
  });
});

describe('getNeighbors', () => {
  it('should return 6 neighbors', () => {
    const neighbors = getNeighbors({ x: 0, y: 0, z: 0 });
    expect(neighbors).toHaveLength(6);
  });

  it('should return correct neighbors for origin', () => {
    const neighbors = getNeighbors({ x: 0, y: 0, z: 0 });
    expect(neighbors).toContainEqual({ x: 1, y: 0, z: 0 });
    expect(neighbors).toContainEqual({ x: -1, y: 0, z: 0 });
    expect(neighbors).toContainEqual({ x: 0, y: 1, z: 0 });
    expect(neighbors).toContainEqual({ x: 0, y: -1, z: 0 });
    expect(neighbors).toContainEqual({ x: 0, y: 0, z: 1 });
    expect(neighbors).toContainEqual({ x: 0, y: 0, z: -1 });
  });

  it('should wrap neighbors at grid edge', () => {
    const neighbors = getNeighbors({ x: 7, y: 0, z: 0 });
    // x+1 wraps to -8
    expect(neighbors).toContainEqual({ x: -8, y: 0, z: 0 });
  });
});

describe('findPathBFS', () => {
  it('should find path to adjacent cell', () => {
    const start = { x: 0, y: 0, z: 0 };
    const goal = { x: 1, y: 0, z: 0 };
    const obstacles = new Set<string>();

    const path = findPathBFS(start, goal, obstacles);
    expect(path).not.toBeNull();
    expect(path).toHaveLength(1);
    expect(path![0]).toEqual(goal);
  });

  it('should find path around obstacle', () => {
    const start = { x: 0, y: 0, z: 0 };
    const goal = { x: 2, y: 0, z: 0 };
    const obstacles = new Set(['1,0,0']); // Block direct path

    const path = findPathBFS(start, goal, obstacles);
    expect(path).not.toBeNull();
    // Path should go around: either through y or z axis
    expect(path!.length).toBeGreaterThanOrEqual(3);
    expect(path![path!.length - 1]).toEqual(goal);
  });

  it('should return null if no path exists', () => {
    const start = { x: 0, y: 0, z: 0 };
    const goal = { x: 2, y: 0, z: 0 };
    // Surround start with obstacles
    const obstacles = new Set(['1,0,0', '-1,0,0', '0,1,0', '0,-1,0', '0,0,1', '0,0,-1']);

    const path = findPathBFS(start, goal, obstacles);
    expect(path).toBeNull();
  });

  it('should return empty path if already at goal', () => {
    const pos = { x: 3, y: 3, z: 3 };
    const path = findPathBFS(pos, pos, new Set());
    expect(path).toEqual([]);
  });

  it('should respect maxDepth', () => {
    const start = { x: 0, y: 0, z: 0 };
    const goal = { x: 5, y: 5, z: 5 }; // 15 steps away minimum

    const path = findPathBFS(start, goal, new Set(), 10);
    // Should not find path within 10 steps
    expect(path).toBeNull();
  });
});

describe('normalizeDirection', () => {
  it('should return correct direction for adjacent positions', () => {
    expect(normalizeDirection({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toEqual({
      x: 1,
      y: 0,
      z: 0,
    });
    expect(normalizeDirection({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 })).toEqual({
      x: 0,
      y: -1,
      z: 0,
    });
  });

  it('should handle wrapping', () => {
    // Moving from x=7 to x=-8 is a +x direction (wrapped)
    const dir = normalizeDirection({ x: 7, y: 0, z: 0 }, { x: -8, y: 0, z: 0 });
    expect(dir.x).toBe(1); // Going forward wraps around
  });
});

describe('isValidDirection', () => {
  it('should return true for valid directions', () => {
    expect(isValidDirection({ x: 1, y: 0, z: 0 })).toBe(true);
    expect(isValidDirection({ x: -1, y: 0, z: 0 })).toBe(true);
    expect(isValidDirection({ x: 0, y: 1, z: 0 })).toBe(true);
    expect(isValidDirection({ x: 0, y: 0, z: -1 })).toBe(true);
  });

  it('should return false for zero direction', () => {
    expect(isValidDirection({ x: 0, y: 0, z: 0 })).toBe(false);
  });

  it('should return false for diagonal directions', () => {
    expect(isValidDirection({ x: 1, y: 1, z: 0 })).toBe(false);
    expect(isValidDirection({ x: 1, y: 0, z: 1 })).toBe(false);
    expect(isValidDirection({ x: 1, y: 1, z: 1 })).toBe(false);
  });
});
