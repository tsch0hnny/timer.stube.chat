// Spike service worker: precache everything on install, serve cache-first (like the real app's
// precache + navigateFallback), so the page must open in airplane mode after the first load.
// Bump VERSION on every spike deploy so phones pick up the new page.
const VERSION = 'spike-1'
const CACHE = `spike-${VERSION}`
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icons/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return
  if (url.pathname === '/ping.txt') return // network only: this is the online probe
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.match('/index.html').then((r) => r || fetch(event.request)))
    return
  }
  event.respondWith(caches.match(event.request, { ignoreSearch: true }).then((r) => r || fetch(event.request)))
})

self.addEventListener('message', (event) => {
  if (event.data === 'version' && event.source) event.source.postMessage({ type: 'sw-version', version: VERSION })
})
