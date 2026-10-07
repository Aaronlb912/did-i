import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { readPrefs, writePrefs } from '../../src/lib/prefs.js'

// Swipes counted to this many; a phone that got there before SwipeIntro
// existed does not see the popup.
export const SWIPES_TO_LEARN = 3

/** One answer by swipe (not a tap or a screen reader action). */
export function noteSwipe() {
  const done = readPrefs().swipesLearned || 0
  if (done < SWIPES_TO_LEARN) writePrefs({ swipesLearned: done + 1 })
}

function useScreenReader() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let live = true
    AccessibilityInfo.isScreenReaderEnabled?.().then((value) => live && setOn(Boolean(value))).catch(() => {})
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', (value) => setOn(Boolean(value)))
    return () => {
      live = false
      sub?.remove?.()
    }
  }, [])
  return on
}

/**
 * buttons: show Did and Not yet under the card. Only for a screen reader,
 * which cannot swipe; everyone else learns the swipe from SwipeIntro
 * (owner call, 2026-10-06: nobody should get used to buttons).
 */
export function useSwipeWheels() {
  const reader = useScreenReader()
  return { buttons: reader, hint: false }
}
