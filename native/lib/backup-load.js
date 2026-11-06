import * as DocumentPicker from 'expo-document-picker'
import { readShelf } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { planBackupLoad } from '../../src/lib/shelf-merge.js'
import { markAddedStreak } from './back-fill.js'
import { confirmDone, confirmMiss } from './confirm.js'

const FILE_TYPES = ['application/json', 'text/plain', 'text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel']

function missText(plan) {
  if (plan.miss === 'cap') return t('hang.cap')
  return plan.miss === 'big' ? t('settings.loadBig') : t('settings.loadMissSheet')
}

// The server refuses a shelf over 2 MB, and a bigger file would stall the phone while it reads.
const FILE_MAX = 2_000_000

// Load a copy, from the Account page or Settings > Your data: pick the file
// (a Did I copy, or a CSV with question and date columns), say what it adds,
// and merge only after a yes. ask: the screen's sure sheet.
export async function loadBackupFile({ ask, onImport }) {
  try {
    const picked = await DocumentPicker.getDocumentAsync({ type: FILE_TYPES })
    if (picked.canceled || !picked.assets?.[0]?.uri) return
    const response = await fetch(picked.assets[0].uri)
    const text = await response.text()
    if (text.length > FILE_MAX) return confirmMiss(t('settings.loadBig'))
    let parsed
    let csv = false
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
      csv = true
    }
    const plan = planBackupLoad(readShelf(), parsed)
    if (plan.miss) return confirmMiss(missText(plan))
    const older = [plan.old > 0 ? t('account.loadSureOld', { n: plan.old }) : '', plan.bad > 0 ? t('account.loadSureBad', { n: plan.bad }) : ''].filter(Boolean).join('\n\n')
    if (!plan.q && !plan.a) return confirmDone(older || t('settings.loadSame'))
    const body = t('account.loadSureBody', { q: plan.q, a: plan.a })
    ask({
      title: t('account.loadSureTitle'),
      body: [body, plan.back ? t('account.loadSureBack', { d: plan.back }) : '', older].filter(Boolean).join('\n\n'),
      yes: t('account.loadSureYes'),
      go: () => {
        const now = planBackupLoad(readShelf(), parsed)
        if (now.miss) return confirmMiss(missText(now))
        if (csv) markAddedStreak(now.merged.boards)
        onImport?.(now.merged)
        confirmDone(t('settings.loadOkBoth', { q: now.q, a: now.a }))
      },
    })
  } catch {
    confirmMiss(t('settings.loadMissSheet'))
  }
}
