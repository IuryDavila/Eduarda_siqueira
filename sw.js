// Cache do app para funcionar offline. Aumente VERSION ao publicar mudanças.
const VERSION = "eduarda-v6";
const FILES = ["./", "index.html", "pele.html", "base.html", "looks.html", "produtos.html", "marcas.html", "favoritos.html", "espaco.html", "css/style.css", "js/app.js", "js/catalog.js", "js/recommendations.js", "js/looks.js", "js/config.js", "js/db.js", "manifest.webmanifest", "assets/icons/icon-192.png", "assets/icons/icon-512.png"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== VERSION).map((x) => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match("index.html"))));
});
