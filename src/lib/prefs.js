import { useEffect, useState } from 'react'

const KEY = 'did-i-prefs'
const THEMES = new Set(['dark', 'light', 'phone'])
const LOCALES = new Set(['en', 'es'])
const listeners = new Set()

export const THEME_IDS = ['dark', 'light', 'phone']
export const LOCALE_IDS = ['en', 'es']

function blankPrefs() {
  return { theme: 'dark', locale: 'en', lessMotion: false }
}

function cleanPrefs(raw) {
  const next = blankPrefs()
  if (THEMES.has(raw?.theme)) next.theme = raw.theme
  if (LOCALES.has(raw?.locale)) next.locale = raw.locale
  if (raw?.lessMotion === true) next.lessMotion = true
  return next
}

export function readPrefs() {
  try {
    return cleanPrefs(JSON.parse(localStorage.getItem(KEY) || ''))
  } catch {
    return blankPrefs()
  }
}

export function writePrefs(patch) {
  const next = cleanPrefs({ ...readPrefs(), ...patch })
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((fn) => fn(next))
  applyPrefsToDocument(next)
  return next
}

export function onPrefs(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function resolveTheme(theme) {
  if (theme === 'phone') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  return theme === 'light' ? 'light' : 'dark'
}

export function applyPrefsToDocument(prefs) {
  const next = prefs || readPrefs()
  document.documentElement.lang = next.locale
  document.documentElement.dataset.theme = resolveTheme(next.theme)
  const reduce =
    next.lessMotion ||
    (typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  if (reduce) document.documentElement.dataset.reduceMotion = ''
  else delete document.documentElement.dataset.reduceMotion
}

export function usePrefs() {
  const [prefs, setPrefs] = useState(readPrefs)
  useEffect(() => onPrefs(setPrefs), [])
  return prefs
}

export function useTheme() {
  const prefs = usePrefs()
  const [theme, setTheme] = useState(() => resolveTheme(prefs.theme))

  useEffect(() => {
    function sync() {
      const next = resolveTheme(prefs.theme)
      setTheme(next)
      document.documentElement.dataset.theme = next
    }
    sync()
    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [prefs.theme])

  return theme
}
