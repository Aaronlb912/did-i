import { useEffect, useState } from 'react'
import { AccessibilityInfo, LayoutAnimation } from 'react-native'
import { readPrefs, usePrefs, writePrefs } from '../../src/lib/prefs.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'

// The Did and Nope buttons under the card are training wheels: they go once
// someone has answered by swiping this many times.
export const SWIPES_TO_LEARN = 3

/** One answer by swipe (not a tap or a screen reader action). */
export function noteSwipe() {
  const done = readPrefs().swipesLearned || 0
  if (done >= SWIPES_TO_LEARN) return
  // The last one takes the buttons away: Home eases into the room they leave.
  // (Reduced motion keeps the buttons, so this never animates for it.)
  if (done + 1 === SWIPES_TO_LEARN) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
  writePrefs({ swipesLearned: done + 1 })
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
 * buttons: show Did and Nope under the card. hint: show the swipe hint.
 * Screen readers and reduced motion keep the buttons for good.
 */
export function useSwipeWheels() {
  const prefs = usePrefs()
  const reader = useScreenReader()
  const reduce = useReduceMotion()
  const learning = (prefs.swipesLearned || 0) < SWIPES_TO_LEARN
  return { buttons: learning || reader || reduce, hint: learning && !reader }
}
