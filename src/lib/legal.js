import { env } from './env.js'

// Support and legal contact. Override with VITE_LEGAL_EMAIL in .env.local or Vercel.

const DEFAULT_EMAIL = 'support@did-i.app'
const LEGACY_EMAIL = 'codes@did-i.app'

export function legalEmail() {
  const raw = env('VITE_LEGAL_EMAIL') || DEFAULT_EMAIL
  if (!raw || raw === LEGACY_EMAIL) return DEFAULT_EMAIL
  return raw
}

const DEFAULT_OPERATOR = 'Did I'
const LEGACY_OPERATOR = 'Aaron Bryant'

export function legalOperator() {
  const raw = env('VITE_LEGAL_OPERATOR')
  if (!raw || raw === LEGACY_OPERATOR) return DEFAULT_OPERATOR
  return raw
}

export function legalVars() {
  const email = legalEmail()
  return {
    operator: legalOperator(),
    email,
    emailNote: '',
  }
}
