// Operator contact for privacy and terms. Set in .env.local before you ship.
// VITE_LEGAL_EMAIL is required for store listings and GDPR/CCPA requests.

export function legalEmail() {
  return String(import.meta.env?.VITE_LEGAL_EMAIL || '').trim()
}

export function legalOperator() {
  return String(import.meta.env?.VITE_LEGAL_OPERATOR || '').trim() || 'Aaron Bryant'
}

import { t } from './i18n.js'

export function legalVars() {
  const email = legalEmail()
  return {
    operator: legalOperator(),
    email: email || 'privacy@example.com',
    emailNote: email ? '' : t('legal.emailMissing'),
  }
}
