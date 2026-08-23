const CACHE_NAME = "hohaeng-shell-v3";
const SHELL_ASSETS = [
  "/",
  "/today",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        SHELL_ASSETS.map((url) =>
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

async function fastNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })
    .catch(() => null);

  if (!cached) {
    return (await networkPromise) || Response.error();
  }

  const fastCachedResponse = new Promise((resolve) => {
    setTimeout(() => resolve(cached), 450);
  });

  return Promise.race([
    networkPromise.then((response) => response || cached),
    fastCachedResponse,
  ]);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (url.pathname === "/" || url.pathname.startsWith("/today")) {
      event.respondWith(fastNavigation(request));
      return;
    }

    event.respondWith(fetch(request));
    return;
  }

  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      }),
    );
  }
});
