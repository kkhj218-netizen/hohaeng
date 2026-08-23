const CACHE_NAME = "hohaeng-shell-v4";
const STATIC_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        STATIC_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== CACHE_NAME)
              .map((key) => caches.delete(key)),
          ),
        ),
    ]),
  );
});

async function updateNavigationCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return null;
  }
}

async function cachedNavigation(request, networkPromise) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  // PWA 재실행에서는 캐시가 있으면 네트워크를 전혀 기다리지 않는다.
  if (cached) return cached;

  const network = await networkPromise;
  return network || Response.error();
}

async function warmToday() {
  const request = new Request("/today", { cache: "reload" });
  await updateNavigationCache(request);
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "WARM_TODAY") {
    event.waitUntil(warmToday());
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone()).catch(() => undefined);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (url.pathname === "/" || url.pathname.startsWith("/today")) {
      const refresh = updateNavigationCache(request);
      event.waitUntil(refresh.then(() => undefined));
      event.respondWith(cachedNavigation(request, refresh));
      return;
    }

    event.respondWith(fetch(request));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(request));
  }
});
