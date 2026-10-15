import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'
import { loadBoardForSw, loadPrefsForSw } from './lib/board-store.js'
import { swMayPing } from './lib/quiet.js'
import { askAfterPassed, unansweredTonight } from './lib/recurrence.js'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
// Every page is the one app (public/_redirects), so a start with no network
// opens it from the cache. Direct file links (an image) are left alone.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), { denylist: [/\/[^/?]+\.[^/?]+$/] }))

async function pingDue() {
  const book = await loadBoardForSw()
  if (!book) return
  const now = new Date()
  if (!swMayPing(await loadPrefsForSw(), now)) return
  for (const row of unansweredTonight(book, now)) {
    if (row.lamp.notify === false) continue
    if (!row.lamp.askAfter) continue
    if (!askAfterPassed(row.lamp, now, book.dayFoldHour)) continue
    await self.registration.showNotification('Did I', {
      body: row.lamp.question,
      tag: `${row.lamp.id}:${row.periodKey}`,
      icon: './icon-192.png',
      data: { url: `./#/?face=${encodeURIComponent(row.lamp.id)}`, lampId: row.lamp.id },
    })
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'did-i-lamps') event.waitUntil(pingDue())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const dest = event.notification.data?.url || './#/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          client.postMessage({
            type: 'did-i-open',
            lampId: event.notification.data?.lampId || '',
          })
          return
        }
      }
      await self.clients.openWindow(dest)
    })(),
  )
})
