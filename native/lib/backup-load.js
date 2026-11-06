import * as DocumentPicker from 'expo-document-picker'
import { readShelf } from '../../src/lib/board-shelf.js'
import { t } from '../../src/lib/i18n.js'
import { planBackupLoad } from '../../src/lib/shelf-merge.js'
import { confirmDone, confirmMiss } from './confirm.js'

// Load a copy, from the Account page or Settings > Your data: pick the file,
// say what it adds, and merge only after a yes. ask: the screen's sure sheet.
export async function loadBackupFile({ ask, onImport }) {
  try {
    const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] })
    if (picked.canceled || !picked.assets?.[0]?.uri) return
    const response = await fetch(picked.assets[0].uri)
    const parsed = JSON.parse(await response.text())
    const plan = planBackupLoad(readShelf(), parsed)
    if (plan.miss === 'cap') return confirmMiss(t('hang.cap'))
    if (plan.miss) return confirmMiss(t('settings.loadMiss'))
    if (!plan.q && !plan.a) return confirmDone(t('settings.loadSame'))
    const body = t('account.loadSureBody', { q: plan.q, a: plan.a })
    ask({
      title: t('account.loadSureTitle'),
      body: plan.back ? `${body}\n\n${t('account.loadSureBack', { d: plan.back })}` : body,
      yes: t('account.loadSureYes'),
      go: () => {
        const now = planBackupLoad(readShelf(), parsed)
        if (now.miss === 'cap') return confirmMiss(t('hang.cap'))
        if (now.miss) return confirmMiss(t('settings.loadMiss'))
        onImport?.(now.merged)
        confirmDone(t('settings.loadOkBoth', { q: now.q, a: now.a }))
      },
    })
  } catch {
    confirmMiss(t('settings.loadMiss'))
  }
}
