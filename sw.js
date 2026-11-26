const STATIC_CACHE = 'godik-static-v1';
const API_CACHE = 'godik-api-v1';

const APP_SHELL = [
  './',
  './index.html',
  './places-hk.js',
  './manifest.json',
  './apple-touch-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first with offline cache fallback for HK CSDI (map.gov.hk / hkmapservice), GovHK ALS & OSRM
  if (
    url.hostname.includes('map.gov.hk') ||
    url.hostname.includes('hkmapservice.gov.hk') ||
    url.hostname.includes('geodata.gov.hk') ||
    url.hostname.includes('als.gov.hk') ||
    url.hostname.includes('project-osrm.org') ||
    url.hostname.includes('jsdelivr.net')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for app shell
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
