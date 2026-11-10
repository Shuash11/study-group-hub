/* Study Group Hub service worker.
   Exists so the installed app can show notifications (required on phones)
   and so tapping a notification focuses or opens the app. It intentionally
   does NOT cache app assets — GitHub Pages CDN handles caching, and a cache
   here would risk stale bundles. */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus()
        }
        return self.clients.openWindow('/study-group-hub/')
      }),
  )
})
