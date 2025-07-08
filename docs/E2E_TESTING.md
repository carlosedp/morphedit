# E2E Testing Implementation

## Overview

The MorphEdit project now includes comprehensive End-to-End (E2E) testing using **Playwright**. The tests are designed to verify the application works correctly in both web and Electron environments.

## Test Structure

### 1. Web Application Tests (`tests/e2e/web-app.spec.ts`)

Tests the web version of MorphEdit running in a browser:

- **Main Interface**: Verifies UI elements are present and visible
- **Settings Dialog**: Tests opening, content, and closing of settings
- **Keyboard Shortcuts**: Tests keyboard shortcuts and help dialog
- **File Upload**: Tests file input functionality
- **Responsiveness**: Tests different viewport sizes
- **Footer Information**: Verifies version and author information
- **Theme Support**: Tests dark/light mode switching if available
- **Multiple File Selection**: Tests multiple file handling

### 2. Electron Application Tests (`tests/e2e/app.spec.ts`)

Tests the Electron desktop version of MorphEdit:

- **App Launch**: Verifies Electron app launches successfully
- **File Input Dialog**: Tests native file dialog integration
- **Window Operations**: Tests window management and sizing
- **Menu Operations**: Tests application menu functionality
- **Keyboard Shortcuts**: Tests native keyboard shortcuts
- **Application Info**: Tests version and author display
- **Multiple Windows**: Tests multiple window support

## Configuration

### Playwright Configuration (`playwright.config.ts`)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  projects: [
    {
      name: 'electron',
      testMatch: 'app.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'web',
      testMatch: 'web-app.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173',
      },
    },
  ],
  webServer: {
    command: 'bun run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

## Running E2E Tests

### Commands

```bash
# List all available tests
bunx playwright test --list

# Run all E2E tests
bun test:e2e

# Run specific project tests
bunx playwright test --project=web
bunx playwright test --project=electron

# Run with interactive UI
bunx playwright test --ui

# Run specific test
bunx playwright test --grep "should display the main interface"

# Run with different reporters
bunx playwright test --reporter=html
bunx playwright test --reporter=json
```

### Test Scripts

A helper script is available at `scripts/test-e2e.sh`:

```bash
# Run the E2E test verification script
./scripts/test-e2e.sh
```

## Test Examples

### Web Application Test Example

```typescript
test('should display the main interface', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:5173');
  
  // Check page title
  await expect(page).toHaveTitle(/MorphEdit/);
  
  // Verify UI elements
  await expect(page.locator('h4:has-text("MorphEdit")')).toBeVisible();
  await expect(page.locator('button:has-text("Settings")')).toBeVisible();
  
  // Check file input
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeAttached();
  
  const accept = await fileInput.getAttribute('accept');
  expect(accept).toContain('audio/*');
});
```

### Electron Application Test Example

```typescript
test('should launch electron app successfully', async () => {
  const electronApp = await electron.launch({
    args: ['electron-main.cjs'],
  });
  
  const window = await electronApp.firstWindow();
  
  // Check window and title
  await expect(window).toBeTruthy();
  await expect(window).toHaveTitle(/MorphEdit/);
  
  // Verify UI elements
  await expect(window.locator('button:has-text("Settings")')).toBeVisible();
  
  await electronApp.close();
});
```

## CI/CD Integration

### GitHub Actions

The CI workflow includes E2E tests:

```yaml
- name: Install Playwright browsers
  run: bunx playwright install --with-deps
  if: matrix.os == 'ubuntu-latest'

- name: Run e2e tests
  run: bun test:e2e
  if: matrix.os == 'ubuntu-latest'
  env:
    CI: true
```

### Test Artifacts

- **HTML Reports**: Generated for test results
- **Screenshots**: Captured on test failures
- **Videos**: Recorded for failing tests
- **Traces**: Available for debugging

## Test Coverage

### Current Test Count

- **Web Tests**: 9 comprehensive test scenarios
- **Electron Tests**: 9 comprehensive test scenarios
- **Total**: 18 E2E test cases

### Areas Covered

1. **UI Functionality**: All major UI components
2. **User Interactions**: Clicks, keyboard shortcuts, dialogs
3. **File Operations**: File input, drag & drop areas
4. **Settings Management**: Settings dialog and preferences
5. **Responsive Design**: Multiple viewport sizes
6. **Cross-Platform**: Web and Electron environments

## Development Workflow

### Running Tests During Development

1. **Start Dev Server**: `bun dev` (for web tests)
2. **Run Web Tests**: `bunx playwright test --project=web`
3. **Build App**: `bun run build` (for Electron tests)
4. **Run Electron Tests**: `bunx playwright test --project=electron`

### Debugging Tests

```bash
# Run tests with debug mode
bunx playwright test --debug

# Run tests with headed browser
bunx playwright test --headed

# Generate and view HTML report
bunx playwright test --reporter=html
bunx playwright show-report
```

## Best Practices

### Test Organization

- **Separate Projects**: Web and Electron tests in different projects
- **Descriptive Names**: Clear test descriptions
- **Proper Cleanup**: Always close apps/browsers after tests
- **Timeout Management**: Appropriate timeouts for CI

### Locator Strategy

- **Specific Locators**: Use specific selectors to avoid ambiguity
- **Accessibility**: Prefer role-based selectors when possible
- **Stable Selectors**: Use data attributes for test stability
- **Avoid Brittle Selectors**: Don't rely on implementation details

### Error Handling

- **Graceful Failures**: Tests handle missing elements gracefully
- **Retry Logic**: Configured retries for flaky tests
- **Detailed Reporting**: Clear error messages and context

## Future Enhancements

### Potential Improvements

1. **Visual Regression Testing**: Add screenshot comparison tests
2. **Performance Testing**: Add performance benchmarks
3. **Accessibility Testing**: Add a11y testing with axe-core
4. **API Testing**: Add backend API testing if applicable
5. **Mobile Testing**: Add mobile device testing
6. **Real File Testing**: Add tests with actual audio files

### Test Expansion

- **Audio Processing**: Test audio file loading and processing
- **Waveform Interaction**: Test waveform visualization
- **Export Functionality**: Test audio export features
- **Advanced Settings**: Test complex configuration scenarios

## Conclusion

The E2E testing infrastructure provides comprehensive coverage of both web and Electron versions of MorphEdit. The tests ensure that critical user workflows function correctly across different environments and help maintain application quality during development.
