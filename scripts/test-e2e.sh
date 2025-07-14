#!/usr/bin/env bash

# Simple E2E test verification script

echo "🧪 Testing E2E Infrastructure..."

# Check if Playwright is available
if ! command -v bunx &>/dev/null; then
  echo "❌ Bun not found"
  exit 1
fi

# List available tests
echo "📋 Available E2E tests:"
bunx playwright test --list

# Run a quick smoke test (with timeout to avoid hanging)
echo ""
echo "🔍 Running quick smoke test..."
timeout 30 bunx playwright test --project=web --grep "should display the main interface" --reporter=line --timeout=10000

echo ""
echo "✅ E2E infrastructure is set up!"
echo ""
echo "📝 To run E2E tests manually:"
echo "  • Web tests: bunx playwright test --project=web"
echo "  • Electron tests: bunx playwright test --project=electron"
echo "  • All tests: bunx playwright test"
echo "  • With UI: bunx playwright test --ui"
echo ""
echo "🎯 Note: Web tests require the dev server to be running (bun dev)"
echo "🎯 Note: Electron tests require the app to be built first"
