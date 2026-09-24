const CACHE = 'still-water-shell-v0.2.2';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './src/app.js',
  './src/core/protocol.js', './src/core/state-machine.js', './src/core/timing-engine.js', './src/core/progression-engine.js',
  './src/data/schema.js', './src/data/export.js', './src/data/import.js', './src/data/migrations.js', './src/data/db.js', './src/data/checkpoint.js',
  './src/audio/audio-engine.js', './src/app/protocol-ui.js', './src/ui/render.js', './src/util/platform.js', './src/util/format.js',
  './src/styles/tokens.css', './src/styles/base.css', './src/styles/session.css',
  './assets/icons/icon.svg', './assets/icons/icon-180.png', './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/audio/cue.mp3', './assets/audio/train-timeline.mp3', './assets/audio/transition-test.mp3',
  './assets/kuji/01-rin.jpg', './assets/kuji/02-pyo.jpg', './assets/kuji/03-to.jpg', './assets/kuji/04-sha.jpg', './assets/kuji/05-kai.jpg',
  './assets/kuji/06-jin.jpg', './assets/kuji/07-retsu.jpg', './assets/kuji/08-zai.jpg', './assets/kuji/09-zen.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('still-water-shell-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
