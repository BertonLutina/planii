// Imported by the generated service worker (see vite.config.ts `importScripts`).
// Earlier releases cached authenticated API responses in `planii-api`; delete it (and any
// other runtime cache) on activation. Only Workbox's precache of static assets is kept.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !name.startsWith('workbox-precache'))
          .map((name) => caches.delete(name)),
      ),
    ),
  )
})
