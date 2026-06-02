const CACHE = 'boss-slayer-v11';
const FILES = ['/', '/index.html', '/style.css', '/game.js', '/manifest.json', '/icon-192.png', '/icon-512.png', '/bgm.mp3', '/overworld.mp3', '/defeat.mp3', '/dodge.mp3', '/block.mp3', '/hit.mp3'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
});

self.addEventListener('activate', e => {
  // Smazat staré cache (boss-boj-v1 atd.)
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
