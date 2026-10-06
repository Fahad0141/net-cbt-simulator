/*
 * Offline support for NET CBT Simulator.
 * - Page navigations: network first, falling back to the cached app shell.
 * - Hashed build assets (immutable): cache first.
 * - Everything else from this origin: stale-while-revalidate.
 * Pages and question-bank chunks are cached as they are used, so a paper type that
 * has been generated once can be generated again offline.
 */
const CACHE = 'net-cbt-v1';
const SHELL = './';
const MAX_ENTRIES = 250;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SHELL, './favicon.svg', './manifest.webmanifest']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) {
    await Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((k) => cache.delete(k)));
  }
}

async function put(request, response) {
  if (!response || !response.ok || response.type === 'opaque') return response;
  const cache = await caches.open(CACHE);
  await cache.put(request, response.clone());
  trim(cache);
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => put(SHELL, response))
        .catch(() => caches.match(SHELL)),
    );
    return;
  }

  if (/\/assets\/.+-[\w-]{8,}\.\w+$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((r) => put(request, r))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((r) => put(request, r))
        .catch(() => hit);
      return hit || network;
    }),
  );
});
