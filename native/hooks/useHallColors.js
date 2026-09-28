import { useMemo } from 'react'
import { Platform } from 'react-native'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { activeLook } from '../../src/lib/active-look.js'
import { usePrefs, useTheme } from '../../src/lib/prefs.js'
import { hallColors } from '../theme.js'
import { useWallpaperPalette, wallpaperLooks } from '../lib/dynamic-color.js'

// The web puts data-look on the hall, so every screen wears the look.
// Native has no cascade, so each screen has to ask. Pass the book when
// the screen already has it; otherwise the shelf holds the same one.
export function useHallColors(book) {
  const look = book ? activeLook(book) : null
  return useLookColors(look || activeLook(currentBook(readShelf())))
}

// The colors for one look id, with "Match wallpaper" laid over them when
// it is on. Pass wallpaper = false to show a look exactly as it is.
export function useLookColors(look, wallpaper = true) {
  const theme = useTheme()
  const prefs = usePrefs()
  const palette = useWallpaperPalette()
  const matched = wallpaper && Platform.OS === 'android' && prefs.matchWallpaper
  return useMemo(() => {
    const colors = hallColors(look, theme)
    if (!matched) return colors
    const looks = wallpaperLooks(palette)
    if (!looks) return colors
    return { ...colors, ...looks[theme === 'light' ? 'light' : 'dark'] }
  }, [look, theme, matched, palette])
}
