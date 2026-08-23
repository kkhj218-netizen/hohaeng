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

async function warmToday() {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch("/today", {
      headers: { "x-hohaeng-warmup": "1" },
    });
    if (response.ok) {
      await cache.put("/today", response.clone());
    }
  } catch {
    // warmup 실패는 실제 탐색에 영향을 주지 않는다.
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "WARM_TODAY") {
    event.waitUntil(warmToday());
  }
});

async function staleWhileRevalidateNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) {
        return cache
          .put(request, response.clone())
          .catch(() => undefined)
          .then(() => response);
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // PWA 재실행에서는 네트워크를 기다리지 않고 즉시 이전 화면을 보여준다.
    return { response: cached, refresh };
  }

  const network = await refresh;
  return { response: network || Response.error(), refresh: Promise.resolve(null) };
}

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
      event.respondWith(
        staleWhileRevalidateNavigation(request).then(({ response, refresh }) => {
          event.waitUntil(refresh);
          return response;
        }),
      );
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
