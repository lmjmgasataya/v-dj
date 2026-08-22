const CACHE_NAME = "dj-shell-v1";
const STATIC_PREFIXES = ["/_next/static/"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

// Falls back to any cached response for the same pathname, ignoring query
// string — a stale/missing exact-URL match (e.g. a different ?session= than
// whatever was cached) shouldn't leave the offline shell with nothing to serve.
async function matchByPathname(pathname) {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const match = keys.find((key) => new URL(key.url).pathname === pathname);
  return match ? cache.match(match) : undefined;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const exact = await caches.match(request);
          if (exact) return exact;
          const samePath = await matchByPathname(url.pathname);
          if (samePath) return samePath;
          return matchByPathname("/admin");
        })
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});
