import { test, expect } from '@playwright/test';

test.describe('Play Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/play');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display the game canvas', async ({ page }) => {
    // Three.js canvas has data-engine attribute
    await expect(page.locator('canvas[data-engine*="three"]')).toBeVisible({ timeout: 20000 });
  });

  test('should have control scheme options', async ({ page }) => {
    // Look for control type selector/buttons
    const controlSchemeSelector = page.locator('text=/WASD|Arrow|Control/i');
    await expect(controlSchemeSelector.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show score display', async ({ page }) => {
    // Score should be displayed
    const scoreText = page.locator('text=/score/i');
    await expect(scoreText.first()).toBeVisible({ timeout: 10000 });
  });

  test('should respond to keyboard input without crashing', async ({ page }) => {
    // Wait for canvas to be ready
    await page.waitForSelector('canvas[data-engine*="three"]', { timeout: 20000 });

    // Focus the page and press keys
    await page.keyboard.press('w');
    await page.keyboard.press('a');
    await page.keyboard.press('s');
    await page.keyboard.press('d');

    // Game should still be running (no crash)
    await expect(page.locator('canvas[data-engine*="three"]')).toBeVisible();
  });

  test('should have navigation menu', async ({ page }) => {
    // Play page uses a hamburger menu for navigation
    // The header contains a button with hamburger menu and snake emoji
    const header = page.locator('text=Manual Play');
    await expect(header).toBeVisible({ timeout: 10000 });
  });
});
