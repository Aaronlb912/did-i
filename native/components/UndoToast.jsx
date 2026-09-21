import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { useShakeUndo } from '../hooks/useShakeUndo.js'
import { fonts } from '../theme.js'

export function UndoToast({ undo, onUndo, colors }) {
  const reduce = useReduceMotion()
  const fade = useRef(new Animated.Value(0)).current
  const slide = useRef(new Animated.Value(8)).current
  const live = Boolean(undo)

  const shakeOk = useShakeUndo(live, onUndo)

  useEffect(() => {
    if (!live) {
      fade.setValue(0)
      slide.setValue(8)
      return
    }
    if (reduce) {
      fade.setValue(1)
      slide.setValue(0)
      return
    }
    fade.setValue(0)
    slide.setValue(8)
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start()
  }, [fade, live, reduce, slide])

  if (!live) return null

  const hint = reduce || !shakeOk ? t('tonight.undoTap') : t('tonight.undoShake')

  return (
    <Animated.View
      style={[styles.wrap, { opacity: fade, transform: [{ translateY: slide }] }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel={`${undo.label} ${hint}`}
        style={[styles.toast, { backgroundColor: colors.panel2, borderColor: colors.line }]}
      >
        <Text style={[styles.saved, { color: colors.inkSoft }]}>{undo.label}</Text>
        <Text style={[styles.hint, { color: colors.ink }]}>{hint}</Text>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: 'center',
    zIndex: 12,
    elevation: 12,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    maxWidth: '92%',
  },
  saved: {
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 16,
  },
  hint: {
    fontFamily: fonts.ui,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
    textAlign: 'center',
  },
})
