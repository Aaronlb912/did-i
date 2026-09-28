import { Pressable, StyleSheet } from 'react-native'
import { ripple } from '../lib/ripple.js'

export const HEADER_BUTTON = 40

/** Fill and hairline shared by every floating header surface. */
export function headerSurface(colors) {
  return { backgroundColor: colors.panel, borderColor: colors.lineSoft }
}

/** Soft lift shared by every floating header surface. */
export const headerLift = {
  borderWidth: StyleSheet.hairlineWidth,
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
}

/**
 * Round control for the header. Pass `ref` to measure it. `bare` drops the
 * app's own surface: the iOS bar puts items on glass, and a Material top app
 * bar uses plain icon buttons.
 */
export function HeaderButton({ ref, colors, onPress, label, expanded, on = false, bare = false, children }) {
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      hitSlop={6}
      collapsable={false}
      android_ripple={ripple(colors.panel3, true)}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={expanded == null ? undefined : { expanded }}
      style={({ pressed }) =>
        bare
          ? [styles.bare, pressed && { backgroundColor: colors.panel3 }]
          : [styles.button, headerSurface(colors), on && { borderColor: colors.onDeep }, pressed && styles.pressed]
      }
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    ...headerLift,
    width: HEADER_BUTTON,
    height: HEADER_BUTTON,
    borderRadius: HEADER_BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bare: {
    width: HEADER_BUTTON,
    height: HEADER_BUTTON,
    borderRadius: HEADER_BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { transform: [{ scale: 0.94 }] },
})
