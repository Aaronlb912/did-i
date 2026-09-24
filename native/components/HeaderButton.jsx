import { Pressable, StyleSheet } from 'react-native'

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

/** Round floating control for the header. Pass `ref` to measure it. */
export function HeaderButton({ ref, colors, onPress, label, expanded, on = false, children }) {
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      hitSlop={6}
      collapsable={false}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={expanded == null ? undefined : { expanded }}
      style={({ pressed }) => [
        styles.button,
        headerSurface(colors),
        on && { borderColor: colors.onDeep },
        pressed && styles.pressed,
      ]}
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
  pressed: { transform: [{ scale: 0.94 }] },
})
