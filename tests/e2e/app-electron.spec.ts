import { expect, test } from '@playwright/test';
import { _electron as electron } from 'playwright';

test.describe('MorphEdit Electron E2E Tests', () => {
  test('should launch electron app successfully', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const window = await electronApp.firstWindow();

    // Check if the main window opens
    await expect(window).toBeTruthy();

    // Check if the title is correct
    await expect(window).toHaveTitle(/MorphEdit/);

    // Verify main UI elements are present
    await expect(window.locator('text=MorphEdit')).toBeVisible();
    await expect(window.locator('button:has-text("Settings")')).toBeVisible();
    await expect(window.locator('button:has-text("Manual")')).toBeVisible();

    // Check for file input
    const fileInput = window.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    await electronApp.close();
  });

  test('should handle file input dialog', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const window = await electronApp.firstWindow();

    // Look for file input element
    const fileInput = window.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Verify file input accepts audio files
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toContain('audio/*');

    // Check if multiple files are supported
    const multiple = await fileInput.getAttribute('multiple');
    expect(multiple).toBeDefined();

    await electronApp.close();
  });

  test('should show keyboard shortcuts help', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const window = await electronApp.firstWindow();

    // Find and click the keyboard shortcuts button
    const shortcutsButton = window.locator('button:has-text("?")');
    await shortcutsButton.click();

    // Check if shortcuts dialog appears
    await expect(window.locator('text=Keyboard Shortcuts')).toBeVisible();

    // Check for common shortcuts
    await expect(window.locator('text=Space')).toBeVisible();
    await expect(window.locator('text=Play/Pause')).toBeVisible();
    await expect(window.locator('text=Ctrl+O')).toBeVisible();
    await expect(window.locator('text=Open File')).toBeVisible();

    // Close dialog
    await window.keyboard.press('Escape');
    await expect(window.locator('text=Keyboard Shortcuts')).not.toBeVisible();

    await electronApp.close();
  });

  test('should open settings dialog', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const window = await electronApp.firstWindow();

    // Click settings button
    const settingsButton = window.locator('button:has-text("Settings")');
    await settingsButton.click();

    // Check if settings dialog opens
    await expect(window.locator('text=Settings')).toBeVisible();

    // Check for settings options
    await expect(window.locator('text=Fade In Curve')).toBeVisible();
    await expect(window.locator('text=Fade Out Curve')).toBeVisible();
    await expect(window.locator('text=Crossfade Duration')).toBeVisible();
    await expect(window.locator('text=Truncate Length')).toBeVisible();

    // Check for dropdown options
    await expect(window.locator('text=linear')).toBeVisible();
    await expect(window.locator('text=exponential')).toBeVisible();
    await expect(window.locator('text=logarithmic')).toBeVisible();

    // Close dialog
    await window.keyboard.press('Escape');
    await expect(window.locator('text=Settings')).not.toBeVisible();

    await electronApp.close();
  });

  test('should handle keyboard shortcuts', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const window = await electronApp.firstWindow();

    // Test opening settings with Ctrl+Comma
    await window.keyboard.press('Control+Comma');
    await expect(window.locator('text=Settings')).toBeVisible();

    // Close with Escape
    await window.keyboard.press('Escape');
    await expect(window.locator('text=Settings')).not.toBeVisible();

    // Test help shortcut (F1)
    await window.keyboard.press('F1');
    await expect(window.locator('text=Keyboard Shortcuts')).toBeVisible();

    // Close help
    await window.keyboard.press('Escape');
    await expect(window.locator('text=Keyboard Shortcuts')).not.toBeVisible();

    await electronApp.close();
  });

  test('should display application info', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const window = await electronApp.firstWindow();

    // Check for version information
    await expect(window.locator('text=v5.6.1')).toBeVisible();

    // Check for author information
    await expect(window.locator('text=Carlos Eduardo de Paula')).toBeVisible();

    // Check for drag and drop area
    await expect(
      window.locator('text=Drag & Drop audio files here or click to select')
    ).toBeVisible();

    // Check for supported formats
    await expect(window.locator('text=Supported formats')).toBeVisible();
    await expect(window.locator('text=MP3, WAV, FLAC, M4A, OGG')).toBeVisible();

    await electronApp.close();
  });

  test('should handle window operations', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const window = await electronApp.firstWindow();

    // Test window is visible and has correct size
    await expect(window).toBeTruthy();

    // Get window viewport size
    const viewportSize = window.viewportSize();
    expect(viewportSize?.width).toBeGreaterThan(0);
    expect(viewportSize?.height).toBeGreaterThan(0);

    await electronApp.close();
  });

  test('should handle menu operations', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const window = await electronApp.firstWindow();

    // Test that main menu exists (this depends on the actual implementation)
    // In Electron, menus are typically handled at the app level

    // Test keyboard shortcut for file operations
    await window.keyboard.press('Control+O');
    // This should trigger file open dialog in the actual app

    await electronApp.close();
  });

  test('should handle multiple windows if supported', async () => {
    const electronApp = await electron.launch({
      args: ['electron-main.cjs'],
    });

    const windows = await electronApp.windows();
    expect(windows.length).toBeGreaterThan(0);

    // Close all windows
    for (const window of windows) {
      await window.close();
    }

    await electronApp.close();
  });
});
