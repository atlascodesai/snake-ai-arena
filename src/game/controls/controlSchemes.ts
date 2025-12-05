/**
 * Control scheme definitions for the Play page
 * Extracted from Play.tsx for better organization
 */

import type { ControlType } from '../../api/client';

export interface ControlScheme {
  name: string;
  description: string;
  xzKeys: { up: string[]; down: string[]; left: string[]; right: string[] };
  yKeys: { up: string[]; down: string[] };
  hint: string;
}

export const CONTROL_SCHEMES: Record<ControlType, ControlScheme> = {
  'wasd-zx': {
    name: 'WASD + ZX',
    description: 'Classic layout',
    xzKeys: {
      up: ['w', 'W'],
      down: ['s', 'S'],
      left: ['a', 'A'],
      right: ['d', 'D'],
    },
    yKeys: {
      up: ['z', 'Z'],
      down: ['x', 'X'],
    },
    hint: 'WASD + Z/X',
  },
  'wasd-qe': {
    name: 'WASD + QE',
    description: 'Ergonomic',
    xzKeys: {
      up: ['w', 'W'],
      down: ['s', 'S'],
      left: ['a', 'A'],
      right: ['d', 'D'],
    },
    yKeys: {
      up: ['q', 'Q'],
      down: ['e', 'E'],
    },
    hint: 'WASD + Q/E',
  },
  'arrows-ws': {
    name: 'Arrows + WS',
    description: 'Two hands',
    xzKeys: {
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
    },
    yKeys: {
      up: ['w', 'W'],
      down: ['s', 'S'],
    },
    hint: 'Arrows + W/S',
  },
};
