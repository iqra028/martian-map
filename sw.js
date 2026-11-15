/**
 * Offline support: the app shell and site data are precached; same-origin requests are
 * network-first (fresh when online, cached when not); orbital map tiles are cache-first.
 */
const APP = 'mm-app-v4';
const TILES = 'mm-tiles-v1';
const MAX_TILES = 1500; // shortcut: FIFO cap (~30 MB), switch to LRU if users pan widely offline

const SHELL = [
  './', './index.html', './src/ui/app.css', './src/app.js',
  './src/config/mission.js', './src/core/eva-plan.js', './src/core/mission-state.js', './src/core/resource-model.js',
  './src/data/dtm-loader.js', './src/data/elevation-service.js', './src/data/terrain-analysis.js', './src/data/space-weather.js',
  './src/data/rems.js', './src/geo/coordinates.js', './vendor/leaflet/leaflet.min.css', './vendor/leaflet/leaflet.min.js',
  './data/rems-recent.json', './data/terrain/sakarya-10m.json', './data/terrain/sakarya-10m.bin',
  './data/terrain/sakarya-10m-rough.bin', './data/terrain/rough.png',
  './data/terrain/hillshade.png', './data/terrain/slope.png', './data/terrain/hirise-ortho-5m.jpg',
  './img/PIA19818.jpg', './img/PIA19912.jpg', './img/PIA19839.jpg', './img/PIA21716.jpg'
];
const TILE_HOSTS = ['trek.nasa.gov', 'astro.arcgis.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== APP && k !== TILES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) { const copy = resp.clone(); caches.open(APP).then((c) => c.put(req, copy)); }
          return resp;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }

  if (TILE_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(TILES).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const resp = await fetch(req);
        if (resp.ok || resp.type === 'opaque') {
          await cache.put(req, resp.clone());
          const keys = await cache.keys();
          for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TILES))) await cache.delete(k);
        }
        return resp;
      })
    );
  }
});
