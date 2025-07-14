#!/usr/bin/env bun
/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

// Function to recursively get all files from a directory
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      // Convert to web path (relative to public directory)
      const relativePath = path.relative('public', fullPath);
      const webPath = '/' + relativePath.replace(/\\/g, '/');
      arrayOfFiles.push(webPath);
    }
  });

  return arrayOfFiles;
}

// Get all files from public directory
const publicDir = path.join(process.cwd(), 'public');
const allFiles = getAllFiles(publicDir);

// Filter out files we don't want to cache
const filesToCache = allFiles.filter((file) => {
  // Skip the service worker itself and other files that shouldn't be cached
  return (
    !file.includes('sw.js') &&
    !file.includes('.DS_Store') &&
    !file.includes('Thumbs.db')
  );
});

// Add root path
const urlsToCache = ['/', ...filesToCache];

// Generate service worker content
const swContent = `// Service Worker for MorphEdit PWA (Auto-generated)
const CACHE_NAME = 'morphedit-v1';
const urlsToCache = ${JSON.stringify(urlsToCache, null, 2)};

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
`;

// Write the generated service worker
fs.writeFileSync(path.join(publicDir, 'sw.js'), swContent);
console.log(
  'Service worker generated with',
  urlsToCache.length,
  'files to cache'
);
console.log('Files to cache:', urlsToCache);
