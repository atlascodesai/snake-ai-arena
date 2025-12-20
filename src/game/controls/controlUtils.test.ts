import { describe, it, expect } from 'vitest';
import {
  transformDirectionForCamera,
  getFirstPersonDirection,
  getNewUpVector,
  wouldCollide,
  getFirstPersonHUD,
} from './controlUtils';
import type { Direction, Position } from '../types';

describe('transformDirectionForCamera', () => {
  it('should not transform Y direction', () => {
    const dir: Direction = { x: 0, y: 1, z: 0 };
    const result = transformDirectionForCamera(dir, Math.PI / 2);
    expect(result).toEqual(dir);
  });

  it('should transform XZ direction based on camera angle', () => {
    const dir: Direction = { x: 1, y: 0, z: 0 };
    // 90 degree rotation
    const result = transformDirectionForCamera(dir, Math.PI / 2);
    // Should rotate the direction
    expect(result.y).toBe(0);
  });

  it('should return identity transform at 0 angle', () => {
    const dir: Direction = { x: 1, y: 0, z: 0 };
    const result = transformDirectionForCamera(dir, 0);
    expect(result.x).toBe(1);
    expect(result.z).toBe(0);
  });
});

describe('getFirstPersonDirection', () => {
  const forward: Direction = { x: 1, y: 0, z: 0 };
  const up: Direction = { x: 0, y: 1, z: 0 };

  it('should return up direction for up input', () => {
    const result = getFirstPersonDirection('up', forward, up);
    expect(result).toEqual(up);
  });

  it('should return negative up for down input', () => {
    const result = getFirstPersonDirection('down', forward, up);
    // Using toBeCloseTo to handle -0 vs 0
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBe(-1);
    expect(result.z).toBeCloseTo(0);
  });

  it('should return left direction for left input', () => {
    const result = getFirstPersonDirection('left', forward, up);
    // Cross product of forward and up, negated
    expect(result.x).toBeCloseTo(0);
    expect(result.z).not.toBeCloseTo(0);
  });

  it('should return right direction for right input', () => {
    const result = getFirstPersonDirection('right', forward, up);
    expect(result.x).toBe(0);
    expect(result.z).not.toBe(0);
  });
});

describe('getNewUpVector', () => {
  it('should return same up if direction unchanged', () => {
    const oldDir: Direction = { x: 1, y: 0, z: 0 };
    const newDir: Direction = { x: 1, y: 0, z: 0 };
    const oldUp: Direction = { x: 0, y: 1, z: 0 };

    const result = getNewUpVector(oldDir, newDir, oldUp);
    expect(result).toEqual(oldUp);
  });

  it('should update up when pitching up', () => {
    const oldDir: Direction = { x: 1, y: 0, z: 0 };
    const oldUp: Direction = { x: 0, y: 1, z: 0 };
    const newDir: Direction = { x: 0, y: 1, z: 0 }; // Pitched up

    const result = getNewUpVector(oldDir, newDir, oldUp);
    // Negative old forward - using toBeCloseTo to handle -0 vs 0
    expect(result.x).toBe(-1);
    expect(result.y).toBeCloseTo(0);
    expect(result.z).toBeCloseTo(0);
  });
});

describe('wouldCollide', () => {
  it('should return false for safe move', () => {
    const head: Position = { x: 0, y: 0, z: 0 };
    const direction: Direction = { x: 1, y: 0, z: 0 };
    const snake: Position[] = [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
    ];

    expect(wouldCollide(head, direction, snake)).toBe(false);
  });

  it('should return true for collision with body', () => {
    const head: Position = { x: 0, y: 0, z: 0 };
    const direction: Direction = { x: -1, y: 0, z: 0 };
    const snake: Position[] = [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
    ];

    expect(wouldCollide(head, direction, snake)).toBe(true);
  });
});

describe('getFirstPersonHUD', () => {
  it('should return food direction and collision warnings', () => {
    const snake: Position[] = [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -2, y: 0, z: 0 },
    ];
    const food: Position = { x: 5, y: 0, z: 0 };
    const direction: Direction = { x: 1, y: 0, z: 0 };
    const up: Direction = { x: 0, y: 1, z: 0 };

    const result = getFirstPersonHUD(snake, food, direction, up);

    expect(result.foodDirection).toBe('ahead');
    expect(result.collisionWarnings).toBeDefined();
  });

  it('should detect collision warnings', () => {
    const snake: Position[] = [
      { x: 0, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: -1, y: 1, z: 0 }, // Body segment above and behind
      { x: 0, y: 1, z: 0 }, // Body segment directly above
    ];
    const food: Position = { x: 5, y: 0, z: 0 };
    const direction: Direction = { x: 1, y: 0, z: 0 };
    const up: Direction = { x: 0, y: 1, z: 0 };

    const result = getFirstPersonHUD(snake, food, direction, up);

    expect(result.collisionWarnings.up).toBe(true);
  });
});
