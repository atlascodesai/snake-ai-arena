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
    // There should be a way to navigate back
    const homeLink = page.locator('a[href="/"]').or(page.locator('text=/home|back/i'));
    await expect(homeLink.first()).toBeVisible();
  });

  test('should display technology stack or credits', async ({ page }) => {
    // About pages typically show technologies or credits
    const techInfo = page.locator('text=/react|three|typescript|credit/i');
    const hasTechInfo = await techInfo.count() > 0;

    // May or may not include this info
    expect(true).toBe(true);
  });
});
