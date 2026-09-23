import { addUserInteractionListener } from 'expo-widgets'
import { recordWidgetAnswer, WIDGET_NAME } from '../src/lib/widget-tonight.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { widgetBook } from '../src/lib/widget-config.js'
import { onPrefs } from '../src/lib/prefs.js'
import { goHash } from './navigation/hash.js'
import { syncTonightWidget } from './widget-sync.js'

export function installWidgetSetup() {
  addUserInteractionListener((event) => {
    if (event.source !== WIDGET_NAME) return
    const target = String(event.target || '')
    if (target === 'open:tonight') {
      const book = widgetBook(readShelf())
      goHash('/tonight', { tag: book.id })
      return
    }
    const did = /^did:(.+)$/.exec(target)
    const nope = /^nope:(.+)$/.exec(target)
    if (did) {
      const next = recordWidgetAnswer(did[1], 'did')
      if (next) syncTonightWidget(next)
      return
    }
    if (nope) {
      const next = recordWidgetAnswer(nope[1], 'nope')
      if (next) syncTonightWidget(next)
    }
  })

  onPrefs(() => {
    syncTonightWidget(readShelf()).catch(() => {})
  })
}

