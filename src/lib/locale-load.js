// Web only: fetch the language in use before the first render, and a new one
// when it changes. English ships in the main bundle as the fallback.
import { addLocale, hasLocale } from './i18n.js'
import { bumpPrefs, onPrefs, readPrefs } from './prefs.js'

const loaders = {
  es: () => import('../locales/es.js'),
  fr: () => import('../locales/fr.js'),
  de: () => import('../locales/de.js'),
  pt: () => import('../locales/pt.js'),
  it: () => import('../locales/it.js'),
  zh: () => import('../locales/zh.js'),
  ja: () => import('../locales/ja.js'),
  ko: () => import('../locales/ko.js'),
}

export async function loadLocale(code) {
  if (hasLocale(code) || !loaders[code]) return
  try {
    const mod = await loaders[code]()
    addLocale(code, mod[code])
  } catch {
    // Offline with nothing cached: English shows until the next try.
  }
}

/** Load the current language, and follow later changes with a re-render. */
export async function startLocales() {
  await loadLocale(readPrefs().locale)
  onPrefs((next) => {
    if (hasLocale(next.locale)) return
    loadLocale(next.locale).then(() => {
      if (hasLocale(next.locale)) bumpPrefs()
    })
  })
}
