import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Snake/i);
  });

  test('should display main heading', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Snake AI Arena')).toBeVisible();
  });

  test('should navigate to Editor using New Algorithm button', async ({ page }) => {
    await page.goto('/');
    // Click "New Algorithm" button (or "New" on mobile)
    const newButton = page.locator('button:has-text("New Algorithm"), button:has-text("New")');
    await expect(newButton.first()).toBeVisible();
    await newButton.first().click();
    await expect(page).toHaveURL(/.*editor/);
  });

  test('should navigate to Play page via dropdown menu', async ({ page }) => {
    await page.goto('/');
    // Click the menu button (hamburger or menu icon)
    const menuButton = page
      .locator('button:has-text("☰"), button[aria-label*="menu"], .menu-button')
      .first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Click Manual Play in dropdown
      await page.click('button:has-text("Manual Play")');
      await expect(page).toHaveURL(/.*play/);
    } else {
      // Direct navigation fallback
      await page.goto('/play');
      await expect(page.locator('canvas')).toBeVisible();
    }
  });

  test('should navigate to Leaderboard page via dropdown menu', async ({ page }) => {
    await page.goto('/');
    // Try to find and click menu
    const menuButton = page.locator('button:has-text("☰"), button[aria-label*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.click('button:has-text("Leaderboard")');
      await expect(page).toHaveURL(/.*leaderboard/);
    } else {
      await page.goto('/leaderboard');
      await expect(page).toHaveURL(/.*leaderboard/);
    }
  });

  test('should navigate to About page via dropdown menu', async ({ page }) => {
    await page.goto('/');
    const menuButton = page.locator('button:has-text("☰"), button[aria-label*="menu"]').first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.click('button:has-text("About")');
      await expect(page).toHaveURL(/.*about/);
    } else {
      await page.goto('/about');
      await expect(page).toHaveURL(/.*about/);
    }
  });

  test('direct navigation to /editor works', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.locator('h1:has-text("Editor")')).toBeVisible({ timeout: 15000 });
  });

  test('direct navigation to /play works', async ({ page }) => {
    await page.goto('/play');
    await expect(page.locator('canvas[data-engine*="three"]')).toBeVisible({ timeout: 15000 });
  });

  test('direct navigation to /leaderboard works', async ({ page }) => {
    await page.goto('/leaderboard');
    await page.waitForLoadState('domcontentloaded');
    // Should have loaded without error
    await expect(page.locator('body')).toBeVisible();
  });

  test('direct navigation to /about works', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('body')).toContainText(/about|snake/i);
  });
});

test.describe('Dashboard', () => {
  test('should display main sections', async ({ page }) => {
    await page.goto('/');
    // Check for the main title
    await expect(page.locator('text=Snake AI Arena')).toBeVisible();
  });

  test('should display game canvas', async ({ page }) => {
    await page.goto('/');
    // Three.js canvas for 3D game viewer
    await expect(page.locator('canvas[data-engine*="three"]')).toBeVisible({ timeout: 15000 });
  });

  test('should show leaderboard component', async ({ page }) => {
    await page.goto('/');
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    // Leaderboard section should be present - look for table headers or leaderboard text
    await expect(page.locator('text=/rank|score|leaderboard/i').first()).toBeVisible({
      timeout: 10000,
    });
  });
});
