// Offline: the whole app is cached on install; fonts are cached the first time they load.
// Bump VERSION whenever any file changes, so phones pick up the new build.
const VERSION = 'bpt-1';
const FONT_CACHE = 'bpt-fonts-1';
const DEV = ['localhost', '127.0.0.1'].includes(location.hostname);
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Big+Shoulders:opsz,wght@10..72,600..900&family=Saira+Stencil+One&family=Public+Sans:ital,wght@0,400..700;1,400&display=swap';
const APP = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css',
  'js/app.js', 'js/nav.js', 'js/views.js', 'js/session.js', 'js/data.js', 'js/plan.js', 'js/store.js', 'js/ui.js', 'js/feedback.js', 'js/calendar.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(APP.map((u) => new Request(u, { cache: 'reload' })));
    // Fonts too, so the first offline launch still looks right. Best effort.
    try {
      const fc = await caches.open(FONT_CACHE);
      const res = await fetch(FONT_CSS, { mode: 'cors' });
      if (res.ok) {
        const css = await res.clone().text();
        await fc.put(FONT_CSS, res);
        const urls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]);
        // latin subsets only: those are the ones the page uses
        const latin = css.split('/* ').filter((b) => b.startsWith('latin */')).flatMap((b) => [...b.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]));
        await Promise.all((latin.length ? latin : urls).map((u) => fetch(u, { mode: 'cors' }).then((r) => r.ok && fc.put(u, r)).catch(() => {})));
      }
    } catch (err) { /* offline install: fonts get cached on first use instead */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION && k !== FONT_CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      // The page: cached copy at once (fast, offline), refreshed in the background.
      e.respondWith((async () => {
        const c = await caches.open(VERSION);
        const hit = await c.match('index.html');
        const net = fetch(req).then((r) => { if (r.ok) c.put('index.html', r.clone()); return r; }).catch(() => null);
        if (DEV) return (await net) || hit || new Response('Offline', { status: 503 });
        return hit || (await net) || new Response('Offline', { status: 503 });
      })());
      return;
    }
    e.respondWith((async () => {
      // On localhost the network wins (edits show at once); the cache still covers offline.
      if (DEV) { try { const r = await fetch(req); if (r.ok) return r; } catch (err) { /* offline: use the cache */ } }
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r.ok && url.pathname.match(/\.(png|js|css|webmanifest)$/)) (await caches.open(VERSION)).put(req, r.clone());
        return r;
      } catch (err) { return new Response('', { status: 504 }); }
    })());
    return;
  }
  if (url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const fc = await caches.open(FONT_CACHE);
      const hit = await fc.match(req, { ignoreVary: true });
      if (hit) return hit;
      try { const r = await fetch(req); if (r.ok) fc.put(req, r.clone()); return r; }
      catch (err) { return new Response('', { status: 504 }); }
    })());
  }
});
