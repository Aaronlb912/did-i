import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * True while a screen reader or iOS Switch Control is on. Only then are there Did and Not yet
 * buttons under the card, since a screen reader cannot swipe; everyone else
 * learns the swipe from SwipeIntro (owner call, 2026-10-06).
 */
export function useAnswerButtons() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let live = true
    let reader = false
    let switchOn = false
    const set = () => live && setOn(reader || switchOn)
    AccessibilityInfo.isScreenReaderEnabled?.().then((value) => { reader = Boolean(value); set() }).catch(() => {})
    AccessibilityInfo.isSwitchControlEnabled?.().then((value) => { switchOn = Boolean(value); set() }).catch(() => {})
    const sub = AccessibilityInfo.addEventListener?.('screenReaderChanged', (value) => { reader = Boolean(value); set() })
    const sub2 = AccessibilityInfo.addEventListener?.('switchControlChanged', (value) => { switchOn = Boolean(value); set() })
    return () => {
      live = false
      sub?.remove?.()
      sub2?.remove?.()
    }
  }, [])
  return on
}
