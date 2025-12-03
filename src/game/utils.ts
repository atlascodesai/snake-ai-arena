/**
 * Utility functions available to all algorithms
 * These are passed to user code in the sandbox
 */

import { Position, Direction } from './types';

export const GRID_SIZE = 16;
export const HALF_GRID = GRID_SIZE / 2;

/**
 * Maximum frames per game before timeout
 * At ~10 frames/sec visual speed, 25k frames = ~40 min theoretical max
 * Good algorithms typically finish or die well before this limit
 */
export const MAX_FRAMES = 25000;

/**
 * All 6 possible movement directions in 3D
 */
export const ALL_DIRECTIONS: Direction[] = [
  { x: 1, y: 0, z: 0 },   // +X
  { x: -1, y: 0, z: 0 },  // -X
  { x: 0, y: 1, z: 0 },   // +Y
  { x: 0, y: -1, z: 0 },  // -Y
  { x: 0, y: 0, z: 1 },   // +Z
  { x: 0, y: 0, z: -1 },  // -Z
];

/**
 * Wrap position around grid boundaries
 * Grid is 16x16x16 from (-8,-8,-8) to (7,7,7)
 */
export function wrapPosition(pos: Position): Position {
  const wrap = (val: number): number => {
    while (val < -HALF_GRID) val += GRID_SIZE;
    while (val >= HALF_GRID) val -= GRID_SIZE;
    return val;
  };

  return {
    x: wrap(pos.x),
    y: wrap(pos.y),
    z: wrap(pos.z),
  };
}

/**
 * Check if two positions are equal
 */
export function posEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/**
 * Convert position to unique string key (for Sets/Maps)
 */
export function posKey(pos: Position): string {
  return `${pos.x},${pos.y},${pos.z}`;
}

/**
 * Calculate Manhattan distance between two positions (accounting for wrapping)
 */
export function distance(a: Position, b: Position): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const dz = Math.abs(a.z - b.z);

  // Account for wrapping (shortest path might go around)
  const wrapDx = Math.min(dx, GRID_SIZE - dx);
  const wrapDy = Math.min(dy, GRID_SIZE - dy);
  const wrapDz = Math.min(dz, GRID_SIZE - dz);

  return wrapDx + wrapDy + wrapDz;
}

/**
 * Create Set of position keys for fast collision detection
 */
export function createCollisionSet(positions: Position[]): Set<string> {
  const set = new Set<string>();
  for (const pos of positions) {
    set.add(posKey(pos));
  }
  return set;
}

/**
 * Get all 6 neighboring positions (wrapped)
 */
export function getNeighbors(pos: Position): Position[] {
  return ALL_DIRECTIONS.map(dir => wrapPosition({
    x: pos.x + dir.x,
    y: pos.y + dir.y,
    z: pos.z + dir.z,
  }));
}

/**
 * BFS Pathfinding - Returns path from start to goal
 * Returns null if no path exists within maxDepth
 * Hard capped at 500 nodes to prevent browser freeze
 */
export function findPathBFS(
  start: Position,
  goal: Position,
  obstacles: Set<string>,
  maxDepth: number = 30
): Position[] | null {
  // Hard cap on nodes to prevent browser freeze (16^3 = 4096 max possible)
  const MAX_NODES = 500;

  const queue: Array<{ pos: Position; path: Position[] }> = [
    { pos: start, path: [] }
  ];
  const visited = new Set<string>([posKey(start)]);

  while (queue.length > 0) {
    // Safety: stop if we've explored too many nodes
    if (visited.size > MAX_NODES) break;

    const current = queue.shift()!;

    if (current.path.length > maxDepth) break;

    if (posEqual(current.pos, goal)) {
      return current.path;
    }

    for (const neighbor of getNeighbors(current.pos)) {
      const key = posKey(neighbor);

      if (visited.has(key) || obstacles.has(key)) continue;

      visited.add(key);
      queue.push({
        pos: neighbor,
        path: [...current.path, neighbor]
      });
    }
  }

  return null;
}

/**
 * Convert direction to normalized form (handles wrapping)
 */
export function normalizeDirection(from: Position, to: Position): Direction {
  let dx = to.x - from.x;
  let dy = to.y - from.y;
  let dz = to.z - from.z;

  // Handle wrapping (if distance > half grid, it wrapped)
  if (Math.abs(dx) > 1) dx = -Math.sign(dx);
  if (Math.abs(dy) > 1) dy = -Math.sign(dy);
  if (Math.abs(dz) > 1) dz = -Math.sign(dz);

  return { x: dx, y: dy, z: dz };
}

/**
 * Check if a direction is valid (only one axis non-zero)
 */
export function isValidDirection(dir: Direction): boolean {
  const nonZero = (dir.x !== 0 ? 1 : 0) + (dir.y !== 0 ? 1 : 0) + (dir.z !== 0 ? 1 : 0);
  return nonZero === 1;
}
