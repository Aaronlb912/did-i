import { addUserInteractionListener } from 'expo-widgets'
import { recordWidgetAnswer, WIDGET_NAME } from '../src/lib/widget-tonight.js'
import { readShelf } from '../src/lib/board-shelf.js'
import { onPrefs } from '../src/lib/prefs.js'
import { goHash } from './navigation/hash.js'
import { syncTogetherWidget, syncTonightWidget } from './widget-sync.js'
import { onTogetherSaved } from '../src/lib/together-widget.js'

let widgetSetupInstalled = false

export function installWidgetSetup() {
  if (widgetSetupInstalled) return
  widgetSetupInstalled = true
  addUserInteractionListener((event) => {
    if (event.source !== WIDGET_NAME) return
    const target = String(event.target || '')
    if (target === 'open:tonight') {
      goHash('/tonight')
      return
    }
    const did = /^did:(.+)$/.exec(target)
    const nope = /^nope:(.+)$/.exec(target)
    // Targets are <lampId> or, from newer cards, <lampId>|<periodKey>.
    const [tapLamp, tapNight = ''] = String((did || nope)?.[1] || '').split('|')
    if (did) {
      const next = recordWidgetAnswer(tapLamp, 'did', new Date(), tapNight)
      if (next) syncTonightWidget(next)
      return
    }
    if (nope) {
      const next = recordWidgetAnswer(tapLamp, 'nope', new Date(), tapNight)
      if (next) syncTonightWidget(next)
    }
  })

  onPrefs(() => {
    syncTonightWidget(readShelf()).catch(() => {})
    syncTogetherWidget().catch(() => {})
  })
  onTogetherSaved(() => {
    syncTogetherWidget().catch(() => {})
  })
  // Tonight's checks age out at midnight; redraw from the saved list.
  syncTogetherWidget().catch(() => {})
}

