# PWA Deployment Guide

## Overview

MorphEdit now supports Progressive Web App (PWA) functionality, allowing users to install and run the application offline in modern browsers like Firefox and Chrome.

## What's Included

The PWA implementation includes:

- **Web App Manifest**: Defines app metadata for installation
- **Service Worker**: Enables offline functionality and caching
- **Installable**: Can be installed as a standalone app on desktop and mobile
- **Offline Support**: Core functionality works without internet connection

## Deployment Options

### Option 1: Local File Server (Recommended for Offline Use)

Since browsers require HTTPS or localhost for PWA features, you can serve the built files locally:

1. Build the PWA version:
   ```bash
   npm run build
   ```

2. Serve locally using a simple HTTP server:
   ```bash
   # Using Node.js http-server (install with: npm install -g http-server)
   npx http-server dist -p 8080

   # Using Python 3
   cd dist && python -m http.server 8080

   # Using Python 2
   cd dist && python -m SimpleHTTPServer 8080
   ```

3. Open browser and navigate to `http://localhost:8080`

4. Install the app:
   - **Chrome**: Click the install icon in the address bar or use the "Install MorphEdit" option in the menu
   - **Firefox**: Look for the install prompt or use the "Add to Home Screen" option

### Option 2: GitHub Pages (Online with Offline Capability)

For sharing with others, deploy to GitHub Pages:

1. Enable GitHub Pages in your repository settings
2. Set source to "GitHub Actions" 
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy PWA to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run build
    - uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### Option 3: Static Hosting Services

Deploy the `dist` folder to any static hosting service:
- Netlify
- Vercel
- Surge.sh
- Firebase Hosting

## Browser Requirements

- **Chrome/Chromium**: Full PWA support including installation
- **Firefox**: Good PWA support, may need to manually enable PWA features
- **Safari**: Basic PWA support on iOS/macOS
- **Edge**: Full PWA support

## Offline Functionality

The PWA caches:
- All static assets (JS, CSS, fonts, images)
- Core application files
- WASM files for audio processing

**Note**: Audio file loading still requires the user to select files from their local system, but once loaded, all processing happens offline.

## Installation Process

### Desktop (Chrome/Edge)
1. Visit the PWA URL
2. Look for install icon in address bar
3. Click "Install MorphEdit"
4. App will appear in applications menu

### Desktop (Firefox)
1. Visit the PWA URL  
2. May need to enable PWA support in `about:config` (search for `browser.taskbarTabs.enabled`)
3. Close and reopen browser
4. Look for install prompt or use "Add to Taskbar" button

### Mobile
1. Visit the PWA URL in mobile browser
2. Use "Add to Home Screen" from browser menu
3. App icon will appear on home screen

## Development

To test PWA functionality during development:

```bash
# Build and serve locally
npm run build
npx http-server dist -p 8080
```

Then test in Chrome DevTools:
1. Open DevTools (F12)
2. Go to "Application" tab
3. Check "Service Worker", "Storage", and "Manifest" sections

## File Size Considerations

The current build includes:
- Core app: ~715 KB (gzipped: ~174 KB)
- MUI components: ~418 KB (gzipped: ~111 KB) 
- RubberBand WASM: ~265 KB (gzipped: ~116 KB)

Total cache size is reasonable for PWA deployment.

## Limitations

1. **File System Access**: Limited to user-selected files (Web File System Access API where supported)
2. **Audio Format Support**: Depends on browser codec support
3. **Performance**: May be slightly slower than native Electron app
4. **Platform Features**: Some Electron-specific features not available

## Future Enhancements

Potential PWA improvements:
- File System Access API integration for better file handling
- Web Share API for sharing audio exports
- Background sync for large file processing
- Push notifications for export completion
