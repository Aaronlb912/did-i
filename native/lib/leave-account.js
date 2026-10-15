import { saveBeforeSignOut, signedOutSync } from '../../src/lib/cloud-sync.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { confirmDone, confirmMiss } from './confirm.js'

// Leaving the account: say it worked, or say what went wrong.
// Account and the first Settings page both sign out through this.
// Returns 'unsaved' when answers did not reach the account; the caller asks
// and calls again with force to sign out anyway.
export async function leaveAccount(kind, run, force = false) {
  if (kind !== 'delete' && !force && !(await saveBeforeSignOut())) return 'unsaved'
  try {
    const out = await run()
    if (out?.miss) {
      confirmMiss(tMiss(out.miss))
      return false
    }
    confirmDone(t(kind === 'delete' ? 'confirm.deleted' : 'confirm.signedOut'))
    signedOutSync()
    return true
  } catch {
    confirmMiss(t('confirm.miss'))
    return false
  }
}
