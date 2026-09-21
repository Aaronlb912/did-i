package com.aaronbryant.didi

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DevicePhoneModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "DevicePhone"

  @ReactMethod
  fun getLineNumber(promise: Promise) {
    try {
      val ctx = reactApplicationContext
      if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_PHONE_STATE)
        != PackageManager.PERMISSION_GRANTED
      ) {
        promise.resolve("")
        return
      }
      val tm = ctx.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
      @Suppress("DEPRECATION")
      promise.resolve(tm.line1Number ?: "")
    } catch (_: Exception) {
      promise.resolve("")
    }
  }
}
