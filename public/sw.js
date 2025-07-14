// Service Worker for MorphEdit PWA (Auto-generated)
const CACHE_NAME = 'morphedit-v1';
const urlsToCache = [
  '/',
  '/icon.png',
  '/favicon.ico',
  '/icon.icns',
  '/MorphEdit-Logo-Small.png',
  '/USER_MANUAL.md',
  '/icon.ico',
  '/img/slicedetect.png',
  '/img/region.png',
  '/img/splice.png',
  '/img/infobar.png',
  '/img/settings.png',
  '/img/waveform.png',
  '/img/overview.png',
  '/img/exportformats.png',
  '/img/tempopitch.png',
  '/img/crossfade.png',
  '/img/lockmarker.png',
  '/img/autoslice.png',
  '/img/fadecurves.png',
  '/img/cropregion.png',
  '/img/replace-audio.png',
  '/img/length.png',
  '/img/fades-applied.png',
  '/img/fades.png',
  '/img/addmarker.png',
  '/manifest.json',
  '/MorphEdit-Logo.png',
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
