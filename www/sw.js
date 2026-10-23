/* ScriptDesk service worker: lets the installed app open and work fully offline. */
const VERSION = 'scriptdesk-4138e87';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(CORE);
    // Bundled libraries (Excel, PDF, Word readers) so exports and imports work offline.
    try {
      const list = await (await fetch('./vendor/manifest.json', { cache: 'no-store' })).json();
      await c.addAll(list.map(f => './vendor/' + f));
    } catch (err) { /* not bundled: libraries are cached the first time they are used */ }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Only the app's own files, its libraries and fonts are cached. AI services (cloud or Ollama on this computer) always go straight to the network.
  const CACHEABLE = url.origin === self.location.origin || /^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (!CACHEABLE) return;
  if (req.mode === 'navigate') {
    // App page: try the network for the newest version, fall back to the saved copy offline.
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // Everything else (libraries, fonts, icons): saved copy first, then network.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  })));
});
