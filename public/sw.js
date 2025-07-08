// Service Worker for MorphEdit PWA (Auto-generated)
const CACHE_NAME = 'morphedit-v1';
const urlsToCache = [
  '/',
  '/MorphEdit-Logo-Small.png',
  '/manual.html',
  '/MorphEdit-Logo.png',
  '/favicon.ico',
  '/icon.png',
  '/icon.ico',
  '/icon.icns',
  '/USER_MANUAL.md',
  '/img/fades-applied.png',
  '/img/replace-audio.png',
  '/img/splice.png',
  '/img/settings.png',
  '/img/slicedetect.png',
  '/img/cropregion.png',
  '/img/addmarker.png',
  '/img/exportformats.png',
  '/img/crossfade.png',
  '/img/infobar.png',
  '/img/region.png',
  '/img/fadecurves.png',
  '/img/waveform.png',
  '/img/autoslice.png',
  '/img/lockmarker.png',
  '/img/overview.png',
  '/img/fades.png',
  '/img/tempopitch.png',
  '/img/length.png',
  '/manifest.json',
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
