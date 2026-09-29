package com.aaronbryant.didi.haptics

import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.View
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// The swipe card's Did or nope line. expo-haptics has no
// GESTURE_THRESHOLD_ACTIVATE, so this one constant lives here. Like every
// View haptic it follows the phone's touch feedback switch.
class DidIHapticsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DidIHaptics")

    // performHapticFeedback only works on the main thread.
    AsyncFunction("gestureThresholdAsync") {
      val view = appContext.currentActivity?.findViewById<View>(android.R.id.content)
        ?: return@AsyncFunction false
      val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        HapticFeedbackConstants.GESTURE_THRESHOLD_ACTIVATE
      } else {
        HapticFeedbackConstants.CLOCK_TICK
      }
      view.performHapticFeedback(type)
    }.runOnQueue(Queues.MAIN)
  }
}
