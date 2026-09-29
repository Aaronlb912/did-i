// The haptic vocabulary behind feelTap, kept apart so node can play it
// against a stand-in expo-haptics and check what each answer feels like.
//   did: success (Android CONFIRM)     skip (nope): soft (Android REJECT)
//   undo: rigid                        edge: a tick as the card crosses a line
//   tick: selection                    anything else: heavy

/**
 * feelTap for `Haptics` (expo-haptics). On Android, `thresholdModule()` gives
 * the local DidIHaptics module, or null on a binary built before it.
 */
export function makeFeelTap({ Haptics, android, thresholdModule }) {
  const quiet = () => {}
  const androidFeel = (type, fallback) => Haptics.performAndroidHapticsAsync(type).catch(fallback)
  const select = () => Haptics.selectionAsync().catch(quiet)

  // GESTURE_THRESHOLD_ACTIVATE comes from modules/didi-haptics. A binary built
  // before that module (an over-the-air update) ticks with SEGMENT_TICK instead.
  function edgeTick() {
    if (!android) {
      select()
      return
    }
    const threshold = thresholdModule()
    if (threshold) {
      threshold.gestureThresholdAsync().catch(select)
      return
    }
    androidFeel(Haptics.AndroidHaptics.Segment_Tick, select)
  }

  return function feelTap(kind) {
    if (kind === 'did' || kind === 'hall-on') {
      const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(quiet)
      if (android) androidFeel(Haptics.AndroidHaptics.Confirm, success)
      else success()
      return
    }
    if (kind === 'skip') {
      const soft = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(quiet)
      if (android) androidFeel(Haptics.AndroidHaptics.Reject, soft)
      else soft()
      return
    }
    if (kind === 'undo') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(quiet)
      return
    }
    if (kind === 'edge') {
      edgeTick()
      return
    }
    if (kind === 'tick') {
      select()
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(quiet)
  }
}
