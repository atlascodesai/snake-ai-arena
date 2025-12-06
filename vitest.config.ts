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
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
      thresholds: {
        // Start with achievable thresholds and increase over time
        // Current: 11% overall, but game logic is 73-100%
        lines: 10,
        functions: 10,
        branches: 10,
        statements: 10,
      },
    },
  },
});
