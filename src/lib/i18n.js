import { de } from '../locales/de.js'
import { en } from '../locales/en.js'
import { es } from '../locales/es.js'
import { fr } from '../locales/fr.js'
import { it } from '../locales/it.js'
import { ja } from '../locales/ja.js'
import { ko } from '../locales/ko.js'
import { pt } from '../locales/pt.js'
import { zh } from '../locales/zh.js'
import { readPrefs, usePrefs } from './prefs.js'

// English fills any key a partial locale file missed. Run npm run locales:sync
// after adding keys to en.js.
const packs = {
  en,
  es: { ...en, ...es },
  fr: { ...en, ...fr },
  de: { ...en, ...de },
  pt: { ...en, ...pt },
  it: { ...en, ...it },
  zh: { ...en, ...zh },
  ja: { ...en, ...ja },
  ko: { ...en, ...ko },
}

export function localePack(locale = readPrefs().locale) {
  return packs[locale] ?? packs.en
}

export function useLocale() {
  const prefs = usePrefs()
  return prefs.locale
}

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

export function tMiss(code, vars) {
  if (!code) return ''
  if (hasLocaleKey(code)) return t(code, vars)
  return code
}
