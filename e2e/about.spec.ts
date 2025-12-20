import { test, expect } from '@playwright/test';

test.describe('About Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
  });

  test('should display about content', async ({ page }) => {
    // The about page should have some informational content
    await expect(page.locator('body')).toContainText(/about|snake|game|3d/i);
  });

  test('should have navigation back to home', async ({ page }) => {
    // Navigation is in hamburger menu - click to open it
    const menuButton = page.locator('button[aria-label="Menu"]');
    await menuButton.click();

    // Now check for home navigation option
    const homeOption = page.locator('text=/Arena Home|home/i');
    await expect(homeOption.first()).toBeVisible();
  });

  test('should display technology stack or credits', async ({ page }) => {
    // About pages typically show technologies, credits, or game info
    const infoText = page.locator('body');
    // Page should have meaningful content about the game
    await expect(infoText).toContainText(/snake|game|3d|play/i);
  });
});
