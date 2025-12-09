import { defineConfig, devices } from '@playwright/test';

/**
 * Production E2E tests - runs against the built Express server
 * This tests with real CSP headers and production configuration
 *
 * Prerequisites:
 * 1. Docker running with PostgreSQL: npm run docker:dev
 * 2. Build the client: npm run build
 * 3. Start server in production mode with local access:
 *    NODE_ENV=production ALLOW_LOCALHOST=true \
 *    DATABASE_URL="postgresql://snake:snakepass@localhost:5432/snake_dev?sslmode=disable" \
 *    npm start
 * 4. Run tests: npm run test:e2e:prod
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Local testing: Start server manually (see file header for commands)
  // CI: Would use webServer config if needed
  webServer: undefined,
});
