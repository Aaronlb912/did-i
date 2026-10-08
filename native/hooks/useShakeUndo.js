// Shake to undo is off: it was not reliable and asked for motion permission
// on every undo. The Tap to undo toast stays. expo-sensors is no longer in
// the build; shakeStep in src/lib/shake-undo.js still holds the detection if
// it comes back (add expo-sensors and NSMotionUsageDescription again).
export function useShakeUndo(_active, _onUndo) {
  return false
}
