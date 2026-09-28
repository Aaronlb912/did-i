import { readShelf } from '../../src/lib/board-shelf.js'
import { clockWords } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { armLampPings, checkPings, requestPings } from '../../src/lib/notify.js'
import { publishSheet } from '../components/SheetHost.jsx'

const KEY = 'did-i-ping-primer'

function primerShown() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function markPrimerShown() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // ok
  }
}

// A question with a reminder time is the point of asking for pings at all.
// The first time one gets a time, while the phone has not been asked yet, a
// primer frames the OS prompt instead of firing it cold.
export async function offerPingPrimer(askAfter, colors) {
  if (!askAfter || primerShown()) return
  if ((await checkPings().catch(() => 'missing')) !== 'default') return
  markPrimerShown()
  publishSheet({
    kicker: t('notify.primerKicker'),
    title: t('notify.primerTitle', { time: clockWords(askAfter) }),
    body: t('notify.primerBody'),
    goLabel: t('notify.primerGo'),
    closeLabel: t('notify.primerSkip'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      requestPings()
        .then((state) => {
          if (state === 'granted') armLampPings(readShelf().boards)
        })
        .catch(() => {})
    },
  })
}
