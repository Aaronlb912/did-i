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
  const theme = useTheme()
  const prefs = usePrefs()
  const wallpaper = useWallpaperPalette()
  const look = book ? activeLook(book) : null
  return useMemo(() => {
    const id = look || activeLook(currentBook(readShelf()))
    const colors = hallColors(id, theme)
    if (Platform.OS !== 'android' || !prefs.matchWallpaper) return colors
    const looks = wallpaperLooks(wallpaper)
    if (!looks) return colors
    return { ...colors, ...looks[theme === 'light' ? 'light' : 'dark'] }
  }, [look, theme, prefs.matchWallpaper, wallpaper])
}
