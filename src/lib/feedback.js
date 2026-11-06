import { legalEmail } from './legal.js'

// lines: plain text the person sees in the email body and can edit (the phone
// passes app version and OS version). The web passes none.
export function feedbackMailto(lines = []) {
  const email = legalEmail()
  if (!email) return ''
  const subject = encodeURIComponent('Did I feedback')
  const body = lines.length ? `&body=${encodeURIComponent(`\n\n${lines.join('\n')}`)}` : ''
  return `mailto:${email}?subject=${subject}${body}`
}

export function openFeedback() {
  const url = feedbackMailto()
  if (!url || typeof window === 'undefined') return false
  window.location.href = url
  return true
}
