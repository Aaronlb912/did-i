import { en } from '../locales/en.js'
import { es } from '../locales/es.js'
import { readPrefs } from './prefs.js'

const packs = { en, es }

export function t(key, vars) {
  const locale = readPrefs().locale
  let text = packs[locale]?.[key] ?? packs.en[key] ?? key
  if (vars) {
    text = String(text).replace(/\{(\w+)\}/g, (_, name) =>
      vars[name] == null ? '' : String(vars[name]),
    )
  }
  return text
}

export function hasLocaleKey(key) {
  return Boolean(packs.en[key])
}
