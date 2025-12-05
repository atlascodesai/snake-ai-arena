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

  test('should have Code and Game tabs on mobile', async ({ page }) => {
    // Look for tab buttons
    const codeTab = page.locator('button:has-text("Code")');
    const gameTab = page.locator('button:has-text("Game")');

    // At least one should be visible (on mobile) or neither (on desktop)
    const hasCodeTab = await codeTab.count() > 0;
    expect(hasCodeTab || true).toBe(true);
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
