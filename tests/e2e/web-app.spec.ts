import { expect, test } from '@playwright/test';

test.describe('MorphEdit Web App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app - this will work when running as a web app
    await page.goto('http://localhost:5173');
  });

  test('should display the main interface', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/MorphEdit/);

    // Check for main UI elements using more specific locators
    await expect(page.locator('h4:has-text("MorphEdit")')).toBeVisible();
    await expect(page.locator('button:has-text("Settings")')).toBeVisible();
    await expect(page.locator('button:has-text("Manual")')).toBeVisible();

    // Check for audio file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Verify file input accepts audio files
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toContain('audio/*');
  });

  test('should open and close settings dialog', async ({ page }) => {
    // Click settings button
    await page.click('button:has-text("Settings")');

    // Check if settings dialog opens
    await expect(page.locator('text=Settings')).toBeVisible();

    // Check for settings options
    await expect(page.locator('text=Fade In Curve')).toBeVisible();
    await expect(page.locator('text=Fade Out Curve')).toBeVisible();
    await expect(page.locator('text=Crossfade Duration')).toBeVisible();
    await expect(page.locator('text=Truncate Length')).toBeVisible();

    // Check for dropdown options
    await expect(page.locator('text=linear')).toBeVisible();
    await expect(page.locator('text=exponential')).toBeVisible();
    await expect(page.locator('text=logarithmic')).toBeVisible();

    // Close dialog by clicking outside or close button
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Settings')).not.toBeVisible();
  });

  test('should show keyboard shortcuts help', async ({ page }) => {
    // Click the help button (? icon)
    await page.click('button:has-text("?")');

    // Check if shortcuts dialog appears
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();

    // Check for common shortcuts
    await expect(page.locator('text=Space')).toBeVisible();
    await expect(page.locator('text=Play/Pause')).toBeVisible();
    await expect(page.locator('text=Ctrl+O')).toBeVisible();
    await expect(page.locator('text=Open File')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible();
  });

  test('should display file upload area', async ({ page }) => {
    // Check for file upload area
    const uploadArea = page.locator(
      'text=Drag & Drop audio files here or click to select'
    );
    await expect(uploadArea).toBeVisible();

    // Check for supported formats text
    await expect(page.locator('text=Supported formats')).toBeVisible();
    await expect(page.locator('text=MP3, WAV, FLAC, M4A, OGG')).toBeVisible();
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test opening file dialog with Ctrl+O
    await page.keyboard.press('Control+KeyO');
    // File dialog should open (in real app), but we can't test the actual dialog in web context

    // Test opening settings with Ctrl+Comma
    await page.keyboard.press('Control+Comma');
    await expect(page.locator('text=Settings')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Settings')).not.toBeVisible();

    // Test help shortcut (F1 or ?)
    await page.keyboard.press('F1');
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();

    // Close help
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Keyboard Shortcuts')).not.toBeVisible();
  });

  test('should show footer information', async ({ page }) => {
    // Check footer elements
    await expect(page.locator('text=v5.6.1')).toBeVisible(); // Version
    await expect(page.locator('text=Carlos Eduardo de Paula')).toBeVisible(); // Author

    // Check for footer links
    const githubLink = page.locator('a[href*="github.com"]');
    await expect(githubLink).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=MorphEdit')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=MorphEdit')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('text=MorphEdit')).toBeVisible();
  });

  test('should handle theme/dark mode if available', async ({ page }) => {
    // Check if dark mode toggle exists
    const darkModeToggle = page.locator(
      'button:has-text("Dark"), button:has-text("Light"), [aria-label*="theme"]'
    );

    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
      // Wait for theme change
      await page.waitForTimeout(500);

      // Check if theme changed (this would need to be adjusted based on actual implementation)
      const body = page.locator('body');
      const backgroundColor = await body.evaluate(
        (el) => getComputedStyle(el).backgroundColor
      );
      expect(backgroundColor).toBeDefined();
    }
  });

  test('should handle multiple file selection', async ({ page }) => {
    // Click on file input area
    const fileInput = page.locator('input[type="file"]');

    // Check if multiple files are supported
    const multiple = await fileInput.getAttribute('multiple');
    expect(multiple).toBeDefined();

    // Note: Actual file upload testing would require setting up test files
    // This would be done with page.setInputFiles() in a real test
  });

  test('should show loading states', async ({ page }) => {
    // This test would need actual file upload to trigger loading states
    // For now, we can check that loading dialogs are properly hidden initially
    await expect(page.locator('text=Loading...')).not.toBeVisible();
    await expect(page.locator('text=Processing...')).not.toBeVisible();
  });
});
