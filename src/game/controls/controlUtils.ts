/**
 * Control utilities for the Play page
 * Extracted from Play.tsx for better organization
 */

import { Position, Direction } from '../types';
import { wrapPosition, posEqual } from '../utils';

/**
 * Transform XZ direction based on camera angle for view-relative controls
 * This rotates the direction so "forward" is always away from the camera
 */
export function transformDirectionForCamera(dir: Direction, cameraAngle: number): Direction {
  // Only transform XZ plane movement, Y stays the same
  if (dir.y !== 0) return dir;

  // Round camera angle to nearest 90 degrees for discrete movement
  // This snaps to 4 cardinal directions relative to view
  // Negate angle so controls rotate WITH the camera view
  const snappedAngle = -Math.round(cameraAngle / (Math.PI / 2)) * (Math.PI / 2);

  const cos = Math.round(Math.cos(snappedAngle));
  const sin = Math.round(Math.sin(snappedAngle));

  // Rotate the XZ direction by the camera angle
  const newX = dir.x * cos - dir.z * sin;
  const newZ = dir.x * sin + dir.z * cos;

  return { x: newX, y: 0, z: newZ };
}

/**
 * First-person controls: pitch and yaw relative to snake's orientation
 * We track the snake's "up" vector to maintain consistent orientation
 * - Pitch up/down: rotate in the plane containing forward and up
 * - Yaw left/right: rotate in the plane perpendicular to up (horizontal turn)
 */
export function getFirstPersonDirection(
  input: 'up' | 'down' | 'left' | 'right',
  snakeDirection: Direction,
  snakeUp: Direction
): Direction {
  const forward = snakeDirection;
  const up = snakeUp;

  // Calculate right vector (cross product of forward and up)
  const right: Direction = {
    x: forward.y * up.z - forward.z * up.y,
    y: forward.z * up.x - forward.x * up.z,
    z: forward.x * up.y - forward.y * up.x,
  };

  switch (input) {
    case 'up':
      // Pitch up: move in the "up" direction relative to snake
      return up;
    case 'down':
      // Pitch down: move in the "down" direction relative to snake
      return { x: -up.x, y: -up.y, z: -up.z };
    case 'left':
      // Yaw left: turn left (negative right direction)
      return { x: -right.x, y: -right.y, z: -right.z };
    case 'right':
      // Yaw right: turn right
      return right;
  }
}

/**
 * Calculate new "up" vector after a direction change
 * This maintains consistent orientation for the camera and controls
 */
export function getNewUpVector(
  oldDirection: Direction,
  newDirection: Direction,
  oldUp: Direction
): Direction {
  // If direction didn't change, up stays the same
  if (
    oldDirection.x === newDirection.x &&
    oldDirection.y === newDirection.y &&
    oldDirection.z === newDirection.z
  ) {
    return oldUp;
  }

  // If we pitched (up/down changed), the old forward becomes the new up (or negative)
  if (newDirection.x === oldUp.x && newDirection.y === oldUp.y && newDirection.z === oldUp.z) {
    // Pitched up: old forward direction becomes down, so new up is negative old forward
    return { x: -oldDirection.x, y: -oldDirection.y, z: -oldDirection.z };
  }
  if (newDirection.x === -oldUp.x && newDirection.y === -oldUp.y && newDirection.z === -oldUp.z) {
    // Pitched down: old forward direction becomes up
    return oldDirection;
  }

  // If we yawed (left/right), up stays the same
  return oldUp;
}

/**
 * Check if moving in a direction would cause collision with snake body
 */
export function wouldCollide(head: Position, direction: Direction, snake: Position[]): boolean {
  const newHead = wrapPosition({
    x: head.x + direction.x,
    y: head.y + direction.y,
    z: head.z + direction.z,
  });
  return snake.slice(1).some((seg) => posEqual(seg, newHead));
}

export interface FirstPersonHUDInfo {
  foodDirection: 'ahead' | 'left' | 'right' | 'up' | 'down' | 'behind' | null;
  collisionWarnings: { up: boolean; down: boolean; left: boolean; right: boolean };
}

/**
 * Get relative direction info for first-person HUD
 * Returns which directions (relative to snake's facing) have: food, collision risk
 */
export function getFirstPersonHUD(
  snake: Position[],
  food: Position,
  snakeDirection: Direction,
  snakeUp: Direction
): FirstPersonHUDInfo {
  const head = snake[0];
  const forward = snakeDirection;
  const up = snakeUp;

  // Calculate right vector
  const right: Direction = {
    x: forward.y * up.z - forward.z * up.y,
    y: forward.z * up.x - forward.x * up.z,
    z: forward.x * up.y - forward.y * up.x,
  };

  // Check collision for each relative direction
  const collisionWarnings = {
    up: wouldCollide(head, up, snake),
    down: wouldCollide(head, { x: -up.x, y: -up.y, z: -up.z }, snake),
    left: wouldCollide(head, { x: -right.x, y: -right.y, z: -right.z }, snake),
    right: wouldCollide(head, right, snake),
  };

  // Calculate food direction relative to snake
  const toFood = {
    x: food.x - head.x,
    y: food.y - head.y,
    z: food.z - head.z,
  };

  // Project food direction onto snake's coordinate system
  const dotForward = toFood.x * forward.x + toFood.y * forward.y + toFood.z * forward.z;
  const dotUp = toFood.x * up.x + toFood.y * up.y + toFood.z * up.z;
  const dotRight = toFood.x * right.x + toFood.y * right.y + toFood.z * right.z;

  // Determine primary direction to food
  const absForward = Math.abs(dotForward);
  const absUp = Math.abs(dotUp);
  const absRight = Math.abs(dotRight);

  let foodDirection: 'ahead' | 'left' | 'right' | 'up' | 'down' | 'behind' | null = null;

  if (absForward >= absUp && absForward >= absRight) {
    foodDirection = dotForward > 0 ? 'ahead' : 'behind';
  } else if (absUp >= absForward && absUp >= absRight) {
    foodDirection = dotUp > 0 ? 'up' : 'down';
  } else {
    foodDirection = dotRight > 0 ? 'right' : 'left';
  }

  return { foodDirection, collisionWarnings };
}
