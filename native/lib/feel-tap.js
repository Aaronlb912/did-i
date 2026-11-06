// The haptic vocabulary behind feelTap, kept apart so node can play it
// against a stand-in expo-haptics and check what each answer feels like.
//   did: success (Android CONFIRM)     skip (nope): soft (Android TOGGLE_OFF)
//   undo: rigid (CONTEXT_CLICK)        edge: a tick as the card crosses a line
//   tick: selection (CLOCK_TICK)       anything else: light (VIRTUAL_KEY)
// Android constants follow the phone's own touch feedback setting.

/**
 * feelTap for `Haptics` (expo-haptics). On Android, `thresholdModule()` gives
 * the local DidIHaptics module, or null on a binary built before it.
 * `on()` is the Vibration setting: false plays nothing.
 */
export function makeFeelTap({ Haptics, android, thresholdModule, on = () => true }) {
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
    if (!on()) return
    if (kind === 'did' || kind === 'hall-on') {
      const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(quiet)
      if (android) androidFeel(Haptics.AndroidHaptics.Confirm, success)
      else success()
      return
    }
    if (kind === 'skip') {
      const soft = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(quiet)
      if (android) androidFeel(Haptics.AndroidHaptics.Toggle_Off, soft)
      else soft()
      return
    }
    if (kind === 'undo') {
      const rigid = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(quiet)
      if (android) androidFeel(Haptics.AndroidHaptics.Context_Click, rigid)
      else rigid()
      return
    }
    if (kind === 'edge') {
      edgeTick()
      return
    }
    if (kind === 'tick') {
      if (android) androidFeel(Haptics.AndroidHaptics.Clock_Tick, select)
      else select()
      return
    }
    const light = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(quiet)
    if (android) androidFeel(Haptics.AndroidHaptics.Virtual_Key, light)
    else light()
  }
}
