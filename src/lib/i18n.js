import { en } from '../locales/en.js'
import { readPrefs, usePrefs } from './prefs.js'

// English fills any key a locale file missed. Every key goes in all 9 files;
// npm test checks that (docs/locales.md). The other 8 are added with
// addLocale: all at once on the phone and in tests (locales-all.js), only the
// one in use on the web (locale-load.js), so the web skips ~1 MB of text.
const packs = { en }

export function addLocale(code, pack) {
  if (code !== 'en') packs[code] = { ...en, ...pack }
}

export function hasLocale(code) {
  return Boolean(packs[code])
}

// Every language loaded so far: all 9 on the phone and in tests.
export function loadedPacks() {
  return Object.values(packs)
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

// True when the app shows English, so a translation note is not needed.
export function inEnglish() {
  return readPrefs().locale === 'en'
}

export function hasLocaleKey(key) {
  return Boolean(packs.en[key])
}

export function tMiss(code, vars) {
  if (!code) return ''
  if (hasLocaleKey(code)) return t(code, vars)
  return code
}
