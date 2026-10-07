import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * True while a screen reader is on. Only then are there Did and Not yet
 * buttons under the card, since a screen reader cannot swipe; everyone else
 * learns the swipe from SwipeIntro (owner call, 2026-10-06).
 */
export function useAnswerButtons() {
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
