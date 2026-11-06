import { legalEmail } from './legal.js'
import { t } from './i18n.js'

// lines: plain text the person sees in the email body and can edit (the phone
// passes app version and OS version). The web passes none.
export function feedbackMailto(lines = []) {
  const email = legalEmail()
  if (!email) return ''
  const subject = encodeURIComponent('Did I feedback')
  const body = lines.length ? `&body=${encodeURIComponent(`\n\n${lines.join('\n')}`)}` : ''
  return `mailto:${email}?subject=${subject}${body}`
}

// How this phone signs in, from the session user: apple, google, email, or none.
// Never the address or the id.
export function signInKind(user) {
  if (!user) return 'none'
  const provider = String(user.app_metadata?.provider || '')
  return provider === 'apple' || provider === 'google' ? provider : 'email'
}

// Plain lines for the body, so a report about sync or money can be matched:
// how the person signs in, the first 8 characters of the account id (so
// support can find an account behind Apple's hidden email), and the last sync
// (its time, or the code of the error). The person sees and sends the mail.
// No email address, no names, no answers.
export function feedbackStateLines(user, sync) {
  const how = sync?.how || 'off'
  let state = 'not yet'
  if (how === 'miss') state = `error ${String(sync.miss || 'unknown').slice(0, 60)}${sync.at ? ` (last ok ${sync.at})` : ''}`
  else if (how === 'busy') state = sync.at ? `syncing (last ok ${sync.at})` : 'syncing'
  else if (sync?.at) state = `last ok ${sync.at}`
  const id = String(user?.id || '').slice(0, 8)
  return [t('feedback.account', { kind: signInKind(user) }), ...(id ? [t('feedback.accountId', { id })] : []), t('feedback.sync', { state })]
}

export function openFeedback() {
  const url = feedbackMailto()
  if (!url || typeof window === 'undefined') return false
  window.location.href = url
  return true
}
