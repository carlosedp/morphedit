# Auto-Update Setup for MorphEdit

This document explains the auto-update functionality that has been added to MorphEdit.

## Overview

The auto-update system allows your Electron app to automatically check for updates, download them, and install them without user intervention. It uses GitHub Releases as the update server.

## What's Been Added

### 1. **Dependencies**

- `electron-updater@^6.3.9` - Handles auto-updates in Electron apps

### 2. **Electron Builder Configuration** (`package.json`)

```json
"publish": {
  "provider": "github",
  "owner": "carlosedp",
  "repo": "morphedit"
}
```

### 3. **Main Process Updates** (`electron-main.cjs`)

- Auto-updater initialization and event handlers
- IPC handlers for communicating with the renderer process
- Automatic update checks on app startup (production only)

### 4. **Preload Script Updates** (`preload.js`)

- Auto-updater APIs exposed to the renderer process

### 5. **Renderer Process** (`src/components/AutoUpdater.tsx`)

- React component for update notifications
- Progress tracking during downloads
- User-friendly update dialogs

### 6. **GitHub Actions Updates** (`.github/workflows/electron-release.yml`)

- Includes update manifest files (`latest.yml`, `latest-mac.yml`, `latest-linux.yml`)
- Proper release creation with all necessary files

## How It Works

### 1. **Update Check**

- App checks for updates 3 seconds after startup (production only)
- Uses GitHub API to compare current version with latest release

### 2. **Update Available**

- Shows a dialog asking user if they want to download the update
- Displays version information and release notes

### 3. **Download Process**

- Downloads update in the background
- Shows progress bar with download speed and percentage
- Uses incremental updates when possible

### 4. **Installation**

- When download completes, shows "Install & Restart" dialog
- User can choose to install immediately or later
- App restarts automatically to complete installation

## File Structure

```
src/
├── components/
│   └── AutoUpdater.tsx          # Update UI component
├── ElectronApp.ts              # Updated types for auto-updater
└── App.tsx                     # Includes AutoUpdater component

electron-main.cjs               # Auto-updater logic
preload.js                      # Auto-updater APIs
package.json                    # Dependencies and publish config
```

## Release Process

1. **Bump package version for release**: `npm version minor && git push origin v1.0.0` (adjust version bump as needed)
2. **GitHub Actions builds**: Creates binaries for all platforms
3. **Release created**: With update manifests included
4. **Apps auto-update**: Existing installations will detect and offer the update

## Update Manifests

The following files are automatically generated and included in releases:

- `latest.yml` (Windows)
- `latest-mac.yml` (macOS)  
- `latest-linux.yml` (Linux)

These files contain version information and download URLs that the auto-updater uses.

## Testing

### Development

- Auto-updater is disabled in development mode
- Check console for "Development mode - skipping auto-updater" message

### Production

- Build and distribute a version
- Create a new release with a higher version number
- The distributed app should detect and offer the update

## Security

- Updates are only downloaded from GitHub Releases
- Code signing (when configured) ensures update authenticity
- HTTPS is used for all communications

## Configuration Options

You can customize the auto-updater behavior in `electron-main.cjs`:

```javascript
// Check for updates every hour
setInterval(() => {
  autoUpdater.checkForUpdatesAndNotify();
}, 60 * 60 * 1000);

// Silent updates (auto-install without user interaction)
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall(true, true);
});
```

## Troubleshooting

### Common Issues

1. **No updates detected**: Ensure version in `package.json` is lower than the latest release
2. **Download fails**: Check internet connection and GitHub release accessibility
3. **Installation fails**: Verify app has write permissions to its directory

### Debugging

Enable debug logging:

```javascript
// In electron-main.cjs
process.env.DEBUG = 'electron-updater:*';
```

## Next Steps

- Consider adding code signing for better security
- Add rollback functionality for failed updates
- Implement delta updates for smaller download sizes
- Add update scheduling options
