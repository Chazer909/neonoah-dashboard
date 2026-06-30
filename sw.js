// sw.js — service worker for NeoNoah Dashboard.
//
// The whole app (runtime + fonts) is embedded in index.html, so offline
// support just means caching the app shell. Sync to Supabase always goes to
// the network; when offline the app falls back to its localStorage cache.
//
// Strategy:
//   - Navigations (the HTML page): network-first, fall back to cached shell.
//     This way a redeploy shows up immediately when online, but the app still
//     opens with no connection.
//   - Same-origin static assets (icons, manifest): cache-first.
//   - Cross-origin (Supabase REST): never intercepted — passes straight through.
//
// Bump CACHE on every redeploy so old shells are evicted.
const CACHE = "neonoah-v3";
// Base is the directory this SW is served from (its scope). This makes the
// worker correct at the domain root (Netlify) AND under a project subpath
// (GitHub Pages, e.g. /neonoah-dashboard/) with no other changes.
const BASE = self.registration.scope; // ends with "/"
const INDEX = BASE + "index.html";
const SHELL = [
  BASE,
  INDEX,
  BASE + "manifest.webmanifest",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png",
  BASE + "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle our own origin; let Supabase and other hosts go to network.
  if (url.origin !== self.location.origin) return;

  // Page navigations: network-first with cached-shell fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(INDEX, copy));
          return res;
        })
        .catch(() => caches.match(INDEX).then((r) => r || caches.match(BASE)))
    );
    return;
  }

  // Static same-origin assets: cache-first, fill cache on miss.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
    )
  );
});
