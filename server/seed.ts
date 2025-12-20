/**
 * Seed database with initial algorithms
 */

import { queries } from './db.js';

const seedData = [
  {
    name: 'Smart AI v4',
    code: `/**
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
}`,
    avgScore: 8010,
    maxScore: 8140,
    survivalRate: 100,
  },
  {
    name: 'Greedy Snake',
    code: `/**
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
}`,
    avgScore: 6500,
    maxScore: 7570,
    survivalRate: 70,
  },
  {
    name: 'Random Walker',
    code: `/**
 * Random Algorithm
 * Picks a random valid direction each frame
 * Baseline for comparison - can you beat random?
 *
 * Average Score: ~30 pts
 */
function algorithm(ctx) {
  const { snake } = ctx;
  const head = snake[0];

  const directions = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
  ];

  // Filter out moves that hit body
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

  // Pick random valid direction
  const randomIndex = Math.floor(Math.random() * validDirs.length);
  return validDirs[randomIndex];
}`,
    avgScore: 27,
    maxScore: 40,
    survivalRate: 100,
  },
];

console.log('🌱 Seeding database...');

for (const algo of seedData) {
  const linesOfCode = algo.code.split('\n').filter((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*');
  }).length;

  queries.insertSubmission.run(
    algo.name,
    algo.code,
    linesOfCode,
    algo.avgScore,
    algo.maxScore,
    algo.survivalRate,
    10
  );

  console.log(`   ✓ Added: ${algo.name} (${algo.avgScore} avg)`);
}

console.log('✅ Database seeded successfully!');
