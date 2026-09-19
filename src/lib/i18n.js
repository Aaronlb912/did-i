import { de } from '../locales/de.js'
import { en } from '../locales/en.js'
import { es } from '../locales/es.js'
import { fr } from '../locales/fr.js'
import { it } from '../locales/it.js'
import { ja } from '../locales/ja.js'
import { pt } from '../locales/pt.js'
import { zh } from '../locales/zh.js'
import { readPrefs } from './prefs.js'

const packs = { de, en, es, fr, it, ja, pt, zh }

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
