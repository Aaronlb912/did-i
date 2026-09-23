import { useRef } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { useTheme } from '../../src/lib/prefs.js'
import { blurNativeReady } from '../lib/blur-ready.js'
import { radius } from '../theme.js'
import { AuthSwipeBackdrop } from './AuthSwipeBackdrop.jsx'
import { Slot } from './Slot.jsx'

function AuthFrostFallback({ colors }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.panel, opacity: 0.62 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: 0.5 }]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.panel, opacity: 0.22 }]} />
    </View>
  )
}

function AuthBlurLayer({ colors, blurTarget, tint }) {
  if (!blurNativeReady()) return <AuthFrostFallback colors={colors} />
  let BlurView = null
  try {
    BlurView = require('expo-blur').BlurView
  } catch {
    return <AuthFrostFallback colors={colors} />
  }
  if (!BlurView) return <AuthFrostFallback colors={colors} />
  const blurProps =
    Platform.OS === 'android'
      ? { blurMethod: 'dimezisBlurViewSdk31Plus' }
      : {}
  return (
    <BlurView
      blurTarget={blurTarget}
      intensity={Platform.OS === 'ios' ? 74 : 92}
      tint={tint}
      {...blurProps}
      style={StyleSheet.absoluteFill}
    />
  )
}

function AuthBlurTarget({ blurTarget, colors, children }) {
  if (!blurNativeReady()) {
    return (
      <View ref={blurTarget} style={styles.backdropFill} collapsable={false}>
        {children}
      </View>
    )
  }
  let BlurTargetView = null
  try {
    BlurTargetView = require('expo-blur').BlurTargetView
  } catch {
    BlurTargetView = null
  }
  if (!BlurTargetView) {
    return (
      <View ref={blurTarget} style={styles.backdropFill} collapsable={false}>
        {children}
      </View>
    )
  }
  return (
    <BlurTargetView ref={blurTarget} style={styles.backdropFill} collapsable={false}>
      {children}
    </BlurTargetView>
  )
}

/** Sign-in card with a blurred Tonight swipe preview locked behind it. */
export function AuthSignInStage({ colors, children }) {
  const blurTarget = useRef(null)
  const theme = useTheme()
  const tint = theme === 'light' ? 'light' : 'dark'

  return (
    <View style={styles.stage}>
      <Slot fallback={null}>
        <View style={styles.backdropClip} pointerEvents="none">
          <AuthBlurTarget blurTarget={blurTarget} colors={colors}>
            <AuthSwipeBackdrop colors={colors} behind />
          </AuthBlurTarget>
          <AuthBlurLayer colors={colors} blurTarget={blurTarget} tint={tint} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, opacity: 0.1 }]} />
        </View>
      </Slot>
      <View style={[styles.panel, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.panelWash,
            { backgroundColor: colors.panel, borderRadius: radius.r },
          ]}
        />
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stage: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  backdropClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.r,
    overflow: 'hidden',
  },
  backdropFill: {
    flex: 1,
  },
  panel: {
    borderWidth: 1,
    borderRadius: radius.r,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 16,
    position: 'relative',
  },
  panelWash: {
    opacity: 0.16,
  },
})
