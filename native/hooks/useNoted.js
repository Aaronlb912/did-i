import { useEffect } from 'react'
import { useIsFocused } from '@react-navigation/native'
import { notedPeople } from '../../src/lib/people.js'
import { useKept } from './useKept.js'

/**
 * The ids of everyone you keep a private note about, for the mark on friend
 * and family lists. Read again each time the screen is shown, so a note just
 * saved shows its mark on the way back. One query, not one per person.
 */
export function useNoted(userId) {
  const [noted, setNoted] = useKept(`people.noted:${userId}`, () => new Set())
  const focused = useIsFocused()
  useEffect(() => {
    if (!userId || !focused) return
    notedPeople()
      .then(setNoted)
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, focused])
  return noted instanceof Set ? noted : new Set()
}
