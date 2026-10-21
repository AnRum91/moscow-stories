// Оболочка приложения + раздача скачанных файлов тура (фото/аудио/тайлы) из Cache API.
const C = 'shell-v3';
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(['./', './index.html']))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  e.respondWith((async () => {
    for (const n of ['tour-assets', 'tour-tiles']) { const m = await (await caches.open(n)).match(e.request); if (m) return m; }
    if (u.origin !== location.origin) return fetch(e.request);
    try { const r = await fetch(e.request); if (r.status === 200) { const c = r.clone(); caches.open(C).then(x => x.put(e.request, c)).catch(() => {}); } return r; }
    catch { return (await caches.match(e.request)) || (await caches.match('./index.html')) || Response.error(); }
  })());
});
