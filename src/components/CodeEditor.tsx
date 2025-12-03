/**
 * Monaco Code Editor Component
 * Shows live ctx values during test runs with hidable panel
 * Includes utils reference viewer
 */

import { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

// Utils reference code that users can view/copy
const UTILS_REFERENCE = `/**
 * ═══════════════════════════════════════════════════════════════
 * UTILS REFERENCE - Available functions via utils.*
 * ═══════════════════════════════════════════════════════════════
 *
 * Copy any of these into your algorithm code!
 */

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/**
 * Grid size (16x16x16 from -8 to +7 on each axis)
 */
const GRID_SIZE = 16;  // utils.GRID_SIZE

/**
 * All 6 possible movement directions in 3D space
 */
const ALL_DIRECTIONS = [
  { x: 1, y: 0, z: 0 },   // +X (right)
  { x: -1, y: 0, z: 0 },  // -X (left)
  { x: 0, y: 1, z: 0 },   // +Y (up)
  { x: 0, y: -1, z: 0 },  // -Y (down)
  { x: 0, y: 0, z: 1 },   // +Z (forward)
  { x: 0, y: 0, z: -1 },  // -Z (backward)
];  // utils.ALL_DIRECTIONS

// ─────────────────────────────────────────────────────────────────
// POSITION UTILITIES
// ─────────────────────────────────────────────────────────────────

/**
 * Wrap position around grid boundaries
 * Grid is 16x16x16 from (-8,-8,-8) to (7,7,7)
 *
 * @param pos - Position to wrap
 * @returns Wrapped position within grid bounds
 *
 * @example
 * utils.wrapPosition({ x: 8, y: 0, z: 0 })  // returns { x: -8, y: 0, z: 0 }
 * utils.wrapPosition({ x: -9, y: 0, z: 0 }) // returns { x: 7, y: 0, z: 0 }
 */
function wrapPosition(pos) {
  // Implementation handles grid wrapping automatically
  return utils.wrapPosition(pos);
}

/**
 * Check if two positions are equal
 *
 * @param a - First position
 * @param b - Second position
 * @returns true if positions match exactly
 *
 * @example
 * utils.posEqual({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })  // true
 * utils.posEqual({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 4 })  // false
 */
function posEqual(a, b) {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

/**
 * Convert position to unique string key (for Sets/Maps)
 *
 * @param pos - Position to convert
 * @returns String like "1,2,3"
 *
 * @example
 * utils.posKey({ x: 1, y: -2, z: 3 })  // "1,-2,3"
 */
function posKey(pos) {
  return \`\${pos.x},\${pos.y},\${pos.z}\`;
}

// ─────────────────────────────────────────────────────────────────
// DISTANCE & PATHFINDING
// ─────────────────────────────────────────────────────────────────

/**
 * Calculate Manhattan distance between two positions
 * Accounts for grid wrapping (finds shortest path)
 *
 * @param a - First position
 * @param b - Second position
 * @returns Manhattan distance (minimum moves needed)
 *
 * @example
 * utils.distance({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 })  // 7
 * utils.distance({ x: -7, y: 0, z: 0 }, { x: 7, y: 0, z: 0 }) // 2 (wraps!)
 */
function distance(a, b) {
  // Automatically accounts for grid wrapping
  return utils.distance(a, b);
}

/**
 * BFS Pathfinding - Find shortest path from start to goal
 *
 * @param start - Starting position
 * @param goal - Target position
 * @param obstacles - Set of position keys to avoid (use createCollisionSet)
 * @param maxDepth - Maximum search depth (default: 30)
 * @returns Array of positions forming path, or null if no path exists
 *
 * ⚠️ PERFORMANCE LIMITS:
 *   - Hard capped at 500 nodes explored to prevent browser freeze
 *   - Keep maxDepth <= 50 for best performance
 *   - Avoid calling BFS multiple times per frame in loops
 *   - Writing your own BFS without limits WILL crash the browser!
 *
 * @example
 * const obstacles = utils.createCollisionSet(ctx.snake.slice(1));
 * const path = utils.findPathBFS(head, ctx.food, obstacles);
 * if (path && path.length > 0) {
 *   return utils.normalizeDirection(head, path[0]);
 * }
 */
function findPathBFS(start, goal, obstacles, maxDepth = 30) {
  return utils.findPathBFS(start, goal, obstacles, maxDepth);
}

// ─────────────────────────────────────────────────────────────────
// COLLISION DETECTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create Set of position keys for fast collision detection
 *
 * @param positions - Array of positions
 * @returns Set containing position keys
 *
 * @example
 * // Create collision set from snake body (excluding head)
 * const bodySet = utils.createCollisionSet(ctx.snake.slice(1));
 *
 * // Check if a position would collide
 * const newPos = utils.wrapPosition({ x: head.x + 1, y: head.y, z: head.z });
 * if (bodySet.has(utils.posKey(newPos))) {
 *   // Would hit body!
 * }
 */
function createCollisionSet(positions) {
  return utils.createCollisionSet(positions);
}

// ─────────────────────────────────────────────────────────────────
// DIRECTION UTILITIES
// ─────────────────────────────────────────────────────────────────

/**
 * Convert direction between two adjacent positions to normalized form
 * Handles grid wrapping automatically
 *
 * @param from - Source position
 * @param to - Target position (should be adjacent)
 * @returns Direction object { x, y, z } with values -1, 0, or 1
 *
 * @example
 * // Get direction to first step in a BFS path
 * const path = utils.findPathBFS(head, food, obstacles);
 * if (path && path.length > 0) {
 *   return utils.normalizeDirection(head, path[0]);
 * }
 */
function normalizeDirection(from, to) {
  return utils.normalizeDirection(from, to);
}

// ─────────────────────────────────────────────────────────────────
// EXAMPLE: COMPLETE SMART ALGORITHM
// ─────────────────────────────────────────────────────────────────

/**
 * Example of a complete smart algorithm using these utilities
 */
function exampleSmartAlgorithm(ctx) {
  const { snake, food } = ctx;
  const head = snake[0];

  // Create collision set from snake body
  const obstacles = utils.createCollisionSet(snake.slice(1));

  // Try to find path to food
  const path = utils.findPathBFS(head, food, obstacles, 50);

  if (path && path.length > 0) {
    // Path found! Return direction to first step
    return utils.normalizeDirection(head, path[0]);
  }

  // No path to food - find any safe move
  for (const dir of utils.ALL_DIRECTIONS) {
    const newPos = utils.wrapPosition({
      x: head.x + dir.x,
      y: head.y + dir.y,
      z: head.z + dir.z,
    });

    if (!obstacles.has(utils.posKey(newPos))) {
      return dir;  // Found a safe direction
    }
  }

  return null;  // No safe moves (game over)
}
`;

interface LiveContext {
  snake: { x: number; y: number; z: number }[];
  food: { x: number; y: number; z: number };
  score: number;
  frame: number;
  gridSize: number;
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  liveContext?: LiveContext | null;
  isRunning?: boolean;
}

export default function CodeEditor({
  value,
  onChange,
  readOnly = false,
  liveContext,
  isRunning = false,
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [showLiveCtx, setShowLiveCtx] = useState(true);
  const [showUtils, setShowUtils] = useState(false);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // Format position for display
  const formatPos = (p: { x: number; y: number; z: number }) =>
    `{${p.x},${p.y},${p.z}}`;

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar for switching between code and utils */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-dark-800 border-b border-dark-700">
        <button
          onClick={() => setShowUtils(false)}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            !showUtils
              ? 'bg-dark-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-700'
          }`}
        >
          algorithm.js
        </button>
        <button
          onClick={() => setShowUtils(true)}
          className={`px-3 py-1 text-xs rounded transition-colors ${
            showUtils
              ? 'bg-dark-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-dark-700'
          }`}
        >
          📚 utils reference
        </button>

        {/* Live ctx toggle - show when context available */}
        {liveContext && (
          <button
            onClick={() => setShowLiveCtx(!showLiveCtx)}
            className={`ml-auto px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              showLiveCtx
                ? 'bg-red-900/50 text-red-400 border border-red-800'
                : 'bg-dark-700 text-gray-400 hover:text-white'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${showLiveCtx ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`} />
            {showLiveCtx ? 'LIVE' : 'ctx'}
          </button>
        )}
      </div>

      {/* Editor area */}
      <div className="flex-1 min-h-0 relative">
        {/* Live Values Panel - always show when context available */}
        {liveContext && showLiveCtx && (
          <div className="absolute top-1 right-1 z-10 bg-dark-900/95 border border-neon-green/30 rounded p-2 text-[10px] font-mono shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-dark-600">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 font-semibold">LIVE ctx</span>
              </div>
              <button
                onClick={() => setShowLiveCtx(false)}
                className="text-gray-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-0.5">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">head</span>
                <span className="text-neon-green">{formatPos(liveContext.snake[0])}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">len</span>
                <span className="text-neon-green">{liveContext.snake.length}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">food</span>
                <span className="text-neon-blue">{formatPos(liveContext.food)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">score</span>
                <span className="text-yellow-400">{liveContext.score}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">frame</span>
                <span className="text-gray-300">{liveContext.frame}</span>
              </div>
              <div className="flex justify-between gap-3 pt-1 border-t border-dark-600">
                <span className="text-gray-500">dist</span>
                <span className="text-neon-pink">
                  {Math.abs(liveContext.snake[0].x - liveContext.food.x) +
                    Math.abs(liveContext.snake[0].y - liveContext.food.y) +
                    Math.abs(liveContext.snake[0].z - liveContext.food.z)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Algorithm code editor */}
        <div className={showUtils ? 'hidden' : 'h-full'}>
          <Editor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={value}
            onChange={(val) => onChange(val || '')}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              readOnly,
              padding: { top: 8, bottom: 8 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        </div>

        {/* Utils reference editor (read-only) */}
        <div className={showUtils ? 'h-full' : 'hidden'}>
          <Editor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={UTILS_REFERENCE}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              readOnly: true,
              padding: { top: 8, bottom: 8 },
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
