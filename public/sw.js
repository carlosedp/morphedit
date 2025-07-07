// Service Worker for MorphEdit PWA (Auto-generated)
const CACHE_NAME = 'morphedit-v1';
const urlsToCache = [
  '/',
  '/MorphEdit-Logo-Small.png',
  '/MorphEdit-Logo.png',
  '/USER_MANUAL.md',
  '/favicon.ico',
  '/icon.icns',
  '/icon.ico',
  '/icon.png',
  '/img/addmarker.png',
  '/img/autoslice.png',
  '/img/cropregion.png',
  '/img/crossfade.png',
  '/img/exportformats.png',
  '/img/fadecurves.png',
  '/img/fades-applied.png',
  '/img/fades.png',
  '/img/infobar.png',
  '/img/length.png',
  '/img/lockmarker.png',
  '/img/overview.png',
  '/img/region.png',
  '/img/replace-audio.png',
  '/img/settings.png',
  '/img/slicedetect.png',
  '/img/splice.png',
  '/img/tempopitch.png',
  '/img/waveform.png',
  '/manifest.json',
  '/manual.html',
];

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
