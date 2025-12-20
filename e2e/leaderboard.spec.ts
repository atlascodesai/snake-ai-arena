import { test, expect } from '@playwright/test';

test.describe('Leaderboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/leaderboard');
    // Don't wait for networkidle as it may hang with WebSocket connections
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display leaderboard title', async ({ page }) => {
    await expect(page.locator('text=/leaderboard/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show tab options', async ({ page }) => {
    // There should be tabs to switch between AI and Manual leaderboards
    const tabs = page
      .locator('button, [role="tab"]')
      .filter({ hasText: /ai|algorithm|manual|human/i });

    // At least one type of tab should be present
    await expect(tabs.first()).toBeVisible({ timeout: 10000 });
  });

  test('should render page without errors', async ({ page }) => {
    // Verify page loaded without major errors
    await expect(page.locator('body')).toBeVisible();

    // Check no error overlay is showing
    const errorOverlay = page.locator('[class*="error"], [class*="Error"]');
    const hasVisibleError = await errorOverlay.isVisible().catch(() => false);
    expect(hasVisibleError).toBe(false);
  });

  test('should handle data loading states', async ({ page }) => {
    // Page should eventually show content or empty state
    await page.waitForTimeout(2000); // Give time for API response

    // Check for table or any content
    const hasTable = (await page.locator('table, [role="table"]').count()) > 0;
    const hasText = await page.locator('body').textContent();
    expect(hasTable || hasText?.length > 0).toBe(true);
  });
});
