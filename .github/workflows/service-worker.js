// service-worker.js
const CACHE_NAME = 'tryit-cache-v1';
const CORE_ASSETS = [
  'index.html',
  'about.html',
  'contact.html',
  '404.html',
  'style.css',
  'app.js',
  'manifest.webmanifest',
  'logo_resized2.jpg'
];

// Install: cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// • HTML: network-first, fallback to cache → 404.html if missing
// • Assets: cache-first, then network (and cache the new response)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const accept = req.headers.get('accept') || '';
  const isHTML = accept.includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(req).then(res => {
        caches.open(CACHE_NAME).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() =>
        caches.match(req).then(hit => hit || caches.match('404.html'))
      )
    );
  } else {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
