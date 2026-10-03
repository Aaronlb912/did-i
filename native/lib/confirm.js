import { showToast } from './toast-queue.js'
import { t } from '../../src/lib/i18n.js'

// Every action that changes something says so. confirmDone after it worked,
// confirmMiss when it did not (with what to do next in the text). Toasts live
// above every screen, so call these before navigating and the message is
// still there on the screen you land on.
let n = 0

export function confirmDone(text, ms = 2800) {
  n += 1
  showToast({ id: `done:${n}`, kind: 'done', text: String(text || '').trim() || t('confirm.done'), ms })
}

export function confirmMiss(text, ms = 5200) {
  n += 1
  showToast({ id: `miss:${n}`, kind: 'error', text: String(text || '').trim() || t('confirm.miss'), ms })
}
