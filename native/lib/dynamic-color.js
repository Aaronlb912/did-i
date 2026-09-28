import { useEffect, useState } from 'react'
import { NativeModules, Platform } from 'react-native'

// The device's Material You tonal palette, straight from Android 12+
// (android.R.color.system_*). null on iOS, older Android, or a device
// missing the resource -- callers hide "Match wallpaper" in that case.
export async function readWallpaperPalette() {
  if (Platform.OS !== 'android') return null
  const mod = NativeModules.DynamicColor
  if (!mod || typeof mod.getPalette !== 'function') return null
  try {
    const palette = await mod.getPalette()
    return palette && typeof palette === 'object' ? palette : null
  } catch {
    return null
  }
}

// A tiny store: one fetch for the app's whole lifetime, every screen that
// asks for the wallpaper palette shares it instead of re-bridging.
let cached = null
let loaded = false
let inflight = null
const listeners = new Set()

async function load() {
  if (loaded) return cached
  if (!inflight) {
    inflight = readWallpaperPalette().then((palette) => {
      cached = palette
      loaded = true
      listeners.forEach((fn) => fn(cached))
      return cached
    })
  }
  return inflight
}

/** The cached palette (or null before it loads, or on iOS / an unsupported device). */
export function useWallpaperPalette() {
  const [palette, setPalette] = useState(cached)
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    listeners.add(setPalette)
    load()
    return () => listeners.delete(setPalette)
  }, [])
  return palette
}

// Halfway between two #rrggbb stops, for a tone native does not hand over.
function mix(a, b) {
  const channel = (i) => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2)
  return `#${[1, 3, 5].map((i) => channel(i).toString(16).padStart(2, '0')).join('')}`
}

// The stops native hands over, turned into the same shape every other
// look in native/palette.js uses. Material You gives a tonal palette,
// not status colors, so open comes from the neutrals (kept apart from
// panel3 so an open dot still shows on a pill, and panel3 kept apart from
// inkDim so a disabled button's label still shows) and late/miss/skip
// stay the lime look's own.
export function wallpaperLooks(palette) {
  if (!palette) return null
  return {
    dark: {
      bg: palette.neutral1_900,
      panel: palette.neutral1_800,
      panel2: palette.neutral1_700,
      panel3: palette.neutral1_700,
      line: palette.neutral2_500,
      lineSoft: palette.neutral1_700,
      ink: palette.neutral1_50,
      inkSoft: palette.neutral1_200,
      open: mix(palette.neutral1_700, palette.neutral2_500),
      inkDim: palette.neutral2_500,
      on: palette.accent1_200,
      onDeep: palette.accent1_600,
      late: '#6fb7ff',
      veil: 'rgba(8, 10, 14, 0.55)',
    },
    light: {
      bg: palette.neutral1_50,
      panel: '#ffffff',
      panel2: palette.neutral1_100,
      panel3: palette.neutral1_200,
      line: palette.neutral2_500,
      lineSoft: palette.neutral1_200,
      ink: palette.neutral1_900,
      inkSoft: palette.neutral1_700,
      open: palette.neutral1_100,
      inkDim: palette.neutral2_500,
      on: palette.accent1_700,
      onDeep: palette.accent1_800,
      late: '#1e6bb8',
      veil: 'rgba(26, 29, 22, 0.4)',
    },
  }
}
