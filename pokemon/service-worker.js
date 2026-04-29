// ---------------------------------------------------------------------------
// Caches base de la PWA
// ---------------------------------------------------------------------------

const SHELL_CACHE = 'pokedex-shell-v1';
const API_CACHE = 'pokedex-api-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.webmanifest',
  './icon-app.svg',
  './icon-maskable.svg'
];

// ---------------------------------------------------------------------------
// Instalacion y activacion
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![SHELL_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Estrategias de red
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  // El shell local se sirve con cache-first para abrir rapido la app.
  if (url.origin === location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // La API intenta red primero y usa cache como respaldo offline.
  if (url.origin === 'https://pokeapi.co') {
    event.respondWith(networkThenCache(request));
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(SHELL_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function networkThenCache(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    return new Response(
      JSON.stringify({ error: 'Sin conexion y sin datos en cache.' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
