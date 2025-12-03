/**
 * Built-in algorithms for Snake AI Arena
 * These serve as examples and seed the leaderboard
 */

import { GameContext, Direction } from './types';
import {
  wrapPosition,
  posEqual,
  distance,
  createCollisionSet,
  findPathBFS,
  normalizeDirection,
  posKey,
  ALL_DIRECTIONS,
} from './utils';

// ============================================================================
// DEMO ALGORITHM - Draws circles to spell "DEMO" (used for new submissions)
// ============================================================================

/**
 * Demo Algorithm - Moves in a spiral pattern
 * This is the default for new submissions - shows the snake moving
 * in an interesting pattern without any actual intelligence
 */
export const demoAlgorithm = (ctx: GameContext): Direction | null => {
  const { snake, frame } = ctx;
  const head = snake[0];

  // Create collision set for body
  const bodySet = createCollisionSet(snake.slice(1));

  // Spiral pattern: alternate between axes based on frame
  // Creates a 3D spiral effect
  const phase = Math.floor(frame / 8) % 6;
  const directions: Direction[] = [
    { x: 1, y: 0, z: 0 },   // +X
    { x: 0, y: 1, z: 0 },   // +Y
    { x: -1, y: 0, z: 0 },  // -X
    { x: 0, y: -1, z: 0 },  // -Y
    { x: 0, y: 0, z: 1 },   // +Z
    { x: 0, y: 0, z: -1 },  // -Z
  ];

  // Try preferred direction first
  const preferred = directions[phase];
  const newHead = wrapPosition({
    x: head.x + preferred.x,
    y: head.y + preferred.y,
    z: head.z + preferred.z,
  });

  if (!bodySet.has(posKey(newHead))) {
    return preferred;
  }

  // Fallback: any valid direction
  for (const dir of ALL_DIRECTIONS) {
    const testHead = wrapPosition({
      x: head.x + dir.x,
      y: head.y + dir.y,
      z: head.z + dir.z,
    });
    if (!bodySet.has(posKey(testHead))) {
      return dir;
    }
  }

  return null;
};

// ============================================================================
// GREEDY ALGORITHM - Simple but effective
// ============================================================================

export const greedyAlgorithmCode = `/**
 * Greedy Algorithm
 * Always moves toward food using shortest Manhattan distance
 * Simple but surprisingly effective!
 *
 * Average Score: ~6,500 pts
 */
function algorithm(ctx) {
  const { snake, food } = ctx;
  const head = snake[0];

  let bestDir = null;
  let bestDist = Infinity;

  // Try all 6 directions
  const directions = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];

  for (const dir of directions) {
    const newHead = utils.wrapPosition({
      x: head.x + dir.x,
      y: head.y + dir.y,
      z: head.z + dir.z,
    });

    // Don't hit our own body
    const hitsBody = snake.slice(1).some(seg =>
      utils.posEqual(seg, newHead)
    );

    if (hitsBody) continue;

    // Pick direction closest to food
    const dist = utils.distance(newHead, food);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir;
    }
  }

  return bestDir;
}`;

export const greedyAlgorithm = (ctx: GameContext): Direction | null => {
  const { snake, food } = ctx;
  const head = snake[0];

  let bestDir: Direction | null = null;
  let bestDist = Infinity;

  for (const dir of ALL_DIRECTIONS) {
    const newHead = wrapPosition({
      x: head.x + dir.x,
      y: head.y + dir.y,
      z: head.z + dir.z,
    });

    // Don't hit body
    if (snake.slice(1).some(seg => posEqual(seg, newHead))) {
      continue;
    }

    const dist = distance(newHead, food);
    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir;
    }
  }

  return bestDir;
};

// ============================================================================
// SMART ALGORITHM - BFS with safety checks
// ============================================================================

export const smartAlgorithmCode = `/**
 * Smart Algorithm (v4)
 * Uses BFS pathfinding with safety verification
 * Checks if we can still reach our tail after eating
 *
 * Average Score: ~8,000 pts
 * Survival Rate: ~100%
 */
function algorithm(ctx) {
  const { snake, food } = ctx;
  const head = snake[0];

  // Create collision set (include tail for pathfinding to food)
  const bodySet = utils.createCollisionSet(snake.slice(1));

  // Try to find path to food
  const pathToFood = utils.findPathBFS(head, food, bodySet, 30);

  if (pathToFood && pathToFood.length > 0) {
    const nextPos = pathToFood[0];

    // Safety check: Can we reach our tail after this move?
    const willEat = utils.posEqual(nextPos, food);
    const futureSnake = [nextPos, ...snake];

    if (!willEat) {
      futureSnake.pop(); // Tail moves if not eating
    }

    const futureTail = futureSnake[futureSnake.length - 1];

    // Exclude tail from obstacles (it's our target)
    const futureBodySet = utils.createCollisionSet(
      futureSnake.slice(1, -1)
    );

    const canReachTail = utils.findPathBFS(
      nextPos, futureTail, futureBodySet, 20
    );

    if (canReachTail && canReachTail.length > 0) {
      // Safe to move toward food!
      return utils.normalizeDirection(head, nextPos);
    }
  }

  // Fallback: Follow our tail (survival mode)
  const tail = snake[snake.length - 1];
  const bodySetNoTail = utils.createCollisionSet(snake.slice(1, -1));
  const pathToTail = utils.findPathBFS(head, tail, bodySetNoTail, 20);

  if (pathToTail && pathToTail.length > 0) {
    return utils.normalizeDirection(head, pathToTail[0]);
  }

  // Last resort: Any valid move
  const directions = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];

  for (const dir of directions) {
    const newHead = utils.wrapPosition({
      x: head.x + dir.x,
      y: head.y + dir.y,
      z: head.z + dir.z,
    });

    const key = \`\${newHead.x},\${newHead.y},\${newHead.z}\`;
    if (!bodySet.has(key)) {
      return dir;
    }
  }

  return null;
}`;

export const smartAlgorithm = (ctx: GameContext): Direction | null => {
  const { snake, food } = ctx;
  const head = snake[0];

  // Include tail in obstacles for pathfinding to food
  const bodySet = createCollisionSet(snake.slice(1));

  // BFS to find path to food
  const pathToFood = findPathBFS(head, food, bodySet, 30);

  if (pathToFood && pathToFood.length > 0) {
    const nextPosToFood = pathToFood[0];

    // Safety check: simulate move and verify we can still reach tail
    const willEat = posEqual(nextPosToFood, food);
    const futureSnake = [nextPosToFood, ...snake];

    if (!willEat) {
      futureSnake.pop();
    }

    const futureTail = futureSnake[futureSnake.length - 1];

    // Exclude tail from collision set when pathfinding TO the tail
    const futureBodySet = createCollisionSet(futureSnake.slice(1, -1));

    const canReachTail = findPathBFS(nextPosToFood, futureTail, futureBodySet, 20);

    if (canReachTail && canReachTail.length > 0) {
      return normalizeDirection(head, nextPosToFood);
    }
  }

  // Fallback: follow tail
  const tail = snake[snake.length - 1];
  const bodySetNoTail = createCollisionSet(snake.slice(1, -1));
  const pathToTail = findPathBFS(head, tail, bodySetNoTail, 20);

  if (pathToTail && pathToTail.length > 0) {
    return normalizeDirection(head, pathToTail[0]);
  }

  // Last resort: any valid move
  for (const dir of ALL_DIRECTIONS) {
    const newHead = wrapPosition({
      x: head.x + dir.x,
      y: head.y + dir.y,
      z: head.z + dir.z,
    });
    if (!bodySet.has(posKey(newHead))) {
      return dir;
    }
  }

  return null;
};

// ============================================================================
// TEMPLATE CODE - Shown to users in editor
// ============================================================================

export const templateCode = `/**
 * Your Snake AI Algorithm
 *
 * Make the snake eat food and survive as long as possible!
 *
 * RULES:
 *   - Grid: 16×16×16 (4,096 cells) with wrapping boundaries
 *   - Max frames: 25,000 per game (timeout = game over)
 *   - Benchmark: 10 games, best average score wins
 *
 * Available in ctx:
 *   - ctx.snake: Position[]  (snake[0] is head)
 *   - ctx.food: Position     (current food location)
 *   - ctx.score: number      (current score)
 *   - ctx.frame: number      (frames survived)
 *   - ctx.gridSize: number   (16 - grid is -8 to +7)
 *
 * Available utilities (via utils.):
 *   - utils.wrapPosition(pos)     - Handle grid wrapping
 *   - utils.distance(a, b)        - Manhattan distance
 *   - utils.posEqual(a, b)        - Compare positions
 *   - utils.posKey(pos)           - Position to string key
 *   - utils.createCollisionSet()  - Fast collision detection
 *   - utils.findPathBFS()         - BFS pathfinding
 *   - utils.normalizeDirection()  - Get direction between positions
 *   - utils.ALL_DIRECTIONS        - Array of 6 directions
 *   - utils.GRID_SIZE             - Grid size constant (16)
 *
 * Return: { x, y, z } direction or null if no valid move
 */
function algorithm(ctx) {
  const { snake, food } = ctx;
  const head = snake[0];

  // Your code here!
  // Example: Move toward food

  const directions = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];

  // Filter out moves that hit our body
  const validDirs = directions.filter(dir => {
    const newHead = utils.wrapPosition({
      x: head.x + dir.x,
      y: head.y + dir.y,
      z: head.z + dir.z,
    });

    return !snake.slice(1).some(seg =>
      utils.posEqual(seg, newHead)
    );
  });

  if (validDirs.length === 0) return null;

  // Pick direction closest to food
  let best = validDirs[0];
  let bestDist = utils.distance(
    utils.wrapPosition({
      x: head.x + best.x,
      y: head.y + best.y,
      z: head.z + best.z,
    }),
    food
  );

  for (const dir of validDirs) {
    const newPos = utils.wrapPosition({
      x: head.x + dir.x,
      y: head.y + dir.y,
      z: head.z + dir.z,
    });
    const dist = utils.distance(newPos, food);
    if (dist < bestDist) {
      bestDist = dist;
      best = dir;
    }
  }

  return best;
}`;
