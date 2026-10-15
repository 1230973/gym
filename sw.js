const CACHE_NAME = "life-os-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./css/style.css",
  "./js/app.js",
  "./js/data.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/modules/hoje.js",
  "./js/modules/treino.js",
  "./js/modules/nutricao.js",
  "./js/modules/def.js"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        ASSETS.map(url =>
          fetch(url, { cache: "reload" }).then(res => {
            if (res && res.ok) return cache.put(url, res);
          })
        )
      );
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});