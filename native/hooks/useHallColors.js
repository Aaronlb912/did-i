import { useMemo } from 'react'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { activeLook } from '../../src/lib/active-look.js'
import { useTheme } from '../../src/lib/prefs.js'
import { hallColors } from '../theme.js'

// The web puts data-look on the hall, so every screen wears the look.
// Native has no cascade, so each screen has to ask. Pass the book when
// the screen already has it; otherwise the shelf holds the same one.
export function useHallColors(book) {
  const theme = useTheme()
  const look = book ? activeLook(book) : null
  return useMemo(() => {
    const id = look || activeLook(currentBook(readShelf()))
    return hallColors(id, theme)
  }, [look, theme])
}
