const CACHE_NAME = "fermafrik-v5";
const STATIC_ASSETS = [
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorer les erreurs d'installation du cache
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin !== self.location.origin) return;
  if (requestUrl.pathname.startsWith("/api/auth")) return;
  if (requestUrl.pathname.startsWith("/_next/")) return;
  if (requestUrl.pathname === "/manifest.json") return;
  if (requestUrl.pathname === "/logo.png") return;

  if (requestUrl.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) return response;

          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;

          return new Response(
            JSON.stringify({
              offline: true,
              message: "Donnees indisponibles hors connexion",
            }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        })
    );
    return;
  }

  if (event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(async () => {
          return caches.match("/offline");
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response.ok) return response;

        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
