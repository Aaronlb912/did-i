import { useMemo } from 'react'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { activeLook } from '../../src/lib/active-look.js'
import { useTheme } from '../../src/lib/prefs.js'
import { hallColors } from '../theme.js'

// The web puts data-look on the hall, so every screen wears the look.
// Native has no cascade, so each screen has to ask. Pass the book when
// the screen already has it; otherwise the shelf holds the same one.
export function useHallColors(book) {
  const look = book ? activeLook(book) : null
  return useLookColors(look || activeLook(currentBook(readShelf())))
}

// The colors for one look id.
export function useLookColors(look) {
  const theme = useTheme()
  return useMemo(() => hallColors(look, theme), [look, theme])
}
