import { KeyboardAvoidingView, StyleSheet } from 'react-native'

// The app draws edge to edge, so Android no longer shrinks the window for the
// keyboard. Padding by the keyboard's height works the same on both platforms.
export function KeyboardLift({ children, style, offset = 0 }) {
  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={[styles.fill, style]}>
      {children}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
