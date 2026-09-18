import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { loadBoardForSw } from './lib/board-store.js'
import { askAfterPassed, unansweredTonight } from './lib/recurrence.js'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

async function pingDue() {
  const book = await loadBoardForSw()
  if (!book) return
  const now = new Date()
  for (const row of unansweredTonight(book, now)) {
    if (!row.lamp.askAfter) continue
    if (!askAfterPassed(row.lamp, now, book.dayFoldHour)) continue
    await self.registration.showNotification('Did I', {
      body: row.lamp.question,
      tag: row.periodKey,
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
