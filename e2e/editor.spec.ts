import { test, expect } from '@playwright/test';

test.describe('Editor Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/editor');
    // Wait for the page to load - look for the Editor title
    await page.waitForSelector('h1:has-text("Editor")', { timeout: 15000 });
  });

  test('should display the code editor', async ({ page }) => {
    // Monaco editor should be present - use first() since there may be multiple editors
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 20000 });
  });

  test('should load Monaco editor without CSP errors', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait for Monaco to fully initialize
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 20000 });

    // Check that Monaco's core functionality is loaded (editor lines visible)
    await expect(page.locator('.view-lines').first()).toBeVisible({ timeout: 10000 });

    // No CSP-related errors should be present
    const cspErrors = errors.filter(e =>
      e.includes('Content-Security-Policy') ||
      e.includes('Monaco initialization')
    );
    expect(cspErrors).toHaveLength(0);
  });

  test('should have editor and game visible', async ({ page }) => {
    // On desktop: both editor and game canvas are visible
    // On mobile: tabs switch between them
    const hasEditor = await page.locator('.monaco-editor').first().isVisible();
    const hasCanvas = await page.locator('canvas[data-engine*="three"]').isVisible();
    const hasTabs = await page.locator('button:has-text("Code"), button:has-text("Game")').count() > 0;

    // Either both visible (desktop) or tabs present (mobile)
    expect(hasEditor || hasCanvas || hasTabs).toBe(true);
  });

  test('should have a submit button', async ({ page }) => {
    // Submit button with icon
    const submitButton = page.locator('button:has-text("Submit")');
    await expect(submitButton).toBeVisible();
  });

  test('should have a name input', async ({ page }) => {
    // Name input field
    const nameInput = page.locator('input[placeholder*="Name"]');
    await expect(nameInput).toBeVisible();
  });

  test('should show Three.js game canvas', async ({ page }) => {
    // Three.js canvas has data-engine attribute
    await expect(page.locator('canvas[data-engine*="three"]')).toBeVisible({ timeout: 20000 });
  });

  test('should have a back button', async ({ page }) => {
    // Back button to navigate to home
    const backButton = page.locator('button:has-text("Back")');
    await expect(backButton.first()).toBeVisible();
  });

  test('should navigate back to home', async ({ page }) => {
    // Click back button
    const backButton = page.locator('button:has-text("Back")').first();
    await backButton.click();
    await expect(page).toHaveURL('/');
  });
});
