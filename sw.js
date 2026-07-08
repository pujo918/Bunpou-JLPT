var CACHE_NAME = "bunpou-v1";
var ASSETS = [
  "./",
  "index.html",
  "n4.html",
  "n3.html",
  "grammar-detail.html",
  "bookmark.html",
  "history.html",
  "review.html",
  "stats.html",
  "setsuzokushi.html",
  "onomatope.html",
  "flashcards.html",
  "setsuzoku-flashcards.html",
  "css/style.css",
  "js/nav.js",
  "js/storage.js",
  "js/data.js",
  "js/quiz.js",
  "js/flashcards.js",
  "js/setsuzoku-flashcards.js",
  "js/list.js",
  "js/detail.js",
  "data/grammar.js",
  "data/grammar-n4.js",
  "data/grammar-n4b.js",
  "data/grammar-n4c.js",
  "data/grammar-n3.js",
  "data/grammar-n3b.js",
  "data/grammar-n3c.js",
  "data/n4-full.js",
  "data/n4-extra.js",
  "data/n3-full.js",
  "data/setsuzokushi-data.js",
  "icon-192.png",
  "icon-512.png",
  "manifest.json"
];

// Install: Cache all static assets
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Serve from cache, fallback to network and update cache
self.addEventListener("fetch", function (e) {
  // Only handle GET requests and local assets
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (cachedResponse) {
      if (cachedResponse) {
        // Fetch background update to keep cache fresh
        fetch(e.request).then(function (networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(e.request, networkResponse);
            });
          }
        }).catch(function () {});
        return cachedResponse;
      }

      return fetch(e.request).then(function (networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
