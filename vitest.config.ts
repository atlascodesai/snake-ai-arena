import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,ts,tsx}',
      'server/**/*.{test,spec}.{js,ts}',
    ],
    exclude: ['node_modules', 'dist', '**/integration.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'src/private/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.ts',
        '**/*.spec.ts',
        'dist/',
        'e2e/',
      ],
      thresholds: {
        // Overall thresholds (low because UI is tested via E2E, not unit tests)
        lines: 10,
        functions: 10,
        branches: 10,
        statements: 10,
        // Per-directory thresholds for critical game logic
        'src/game/HeadlessGame.ts': {
          lines: 85,
          functions: 80,
          branches: 80,
          statements: 85,
        },
        'src/game/algorithms.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        'src/game/utils.ts': {
          lines: 95,
          functions: 95,
          branches: 85,
          statements: 95,
        },
        'src/game/controls/': {
          lines: 80,
          functions: 75,
          branches: 70,
          statements: 80,
        },
        'server/routes/': {
          lines: 75,
          functions: 80,
          branches: 60,
          statements: 75,
        },
      },
    },
  },
});
