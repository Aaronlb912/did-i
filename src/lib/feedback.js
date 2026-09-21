import { legalEmail } from './legal.js'

export function feedbackMailto() {
  const email = legalEmail()
  if (!email) return ''
  const subject = encodeURIComponent('Did I feedback')
  return `mailto:${email}?subject=${subject}`
}

export function openFeedback() {
  const url = feedbackMailto()
  if (!url || typeof window === 'undefined') return false
  window.location.href = url
  return true
}
