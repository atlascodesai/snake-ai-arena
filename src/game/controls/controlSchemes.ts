/**
 * Control scheme definitions for the Play page
 * Simplified to a single fixed control scheme:
 * - WASD or Arrow keys for XZ movement
 * - O (up) / K (down) for Y-axis in external view
 * - In FPV mode, all 4 directions (WASD/arrows) control pitch/yaw
 */

import type { ControlType } from '../../api/client';

export interface ControlScheme {
  name: string;
  description: string;
  xzKeys: { up: string[]; down: string[]; left: string[]; right: string[] };
  yKeys: { up: string[]; down: string[] };
  hint: string;
}

// Single unified control scheme
export const DEFAULT_CONTROL_SCHEME: ControlScheme = {
  name: 'Default',
  description: 'WASD/Arrows + O/K',
  xzKeys: {
    up: ['w', 'W', 'ArrowUp'],
    down: ['s', 'S', 'ArrowDown'],
    left: ['a', 'A', 'ArrowLeft'],
    right: ['d', 'D', 'ArrowRight'],
  },
  yKeys: {
    up: ['o', 'O'],
    down: ['k', 'K'],
  },
  hint: 'WASD/Arrows + O/K',
};

// Legacy control schemes (kept for backwards compatibility with stored scores)
export const CONTROL_SCHEMES: Record<ControlType, ControlScheme> = {
  'wasd-zx': DEFAULT_CONTROL_SCHEME,
  'wasd-qe': DEFAULT_CONTROL_SCHEME,
  'arrows-ws': DEFAULT_CONTROL_SCHEME,
};
