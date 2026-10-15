import { forwardRef, useEffect, useState } from 'react'
import { FadeScroll } from './FadeScroll.jsx'
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../../src/lib/prefs.js'
import { pressFx, useFadeIn } from '../lib/motion.jsx'
import { ripple } from '../lib/ripple.js'
import { fonts, sectionLabel } from '../theme.js'

// The one text input every screen renders through: a light keyboard and a
// blue system cursor read as unfinished on a dark app. keyboardAppearance
// follows the resolved theme, selectionColor/cursorColor follow the hall's
// accent, and returnKeyType stays per field since each caller knows its own.
export const AppTextInput = forwardRef(function AppTextInput({ colors, ...props }, ref) {
  const theme = useTheme()
  return (
    <TextInput
      ref={ref}
      keyboardAppearance={theme}
      selectionColor={colors.on}
      cursorColor={colors.on}
      placeholderTextColor={colors.inkDim}
      {...props}
    />
  )
})

export function Page({ colors, children, scroll = true }) {
  const insets = useSafeAreaInsets()
  const body = <View style={[styles.page, { paddingBottom: insets.bottom + 80 }]}>{children}</View>
  if (!scroll) return body
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {body}
    </ScrollView>
  )
}

export function Kicker({ children, colors }) {
  return <Text style={[styles.kicker, { color: colors.on }]}>{children}</Text>
}

export function Title({ children, colors }) {
  return <Text style={[styles.title, { color: colors.ink }]}>{children}</Text>
}

export function Meta({ children, colors, style }) {
  return <Text style={[styles.meta, { color: colors.inkSoft }, style]}>{children}</Text>
}

const SKEL_ROWS = ['92%', '74%', '84%']

// A loading skeleton that waits 300 ms, so a fast load never flashes it for one frame.
export function LateMeta({ children, colors }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 300)
    return () => clearTimeout(timer)
  }, [])
  // Fades in rather than popping (reduced motion shows it at once).
  const fade = useFadeIn(show)
  if (!show) return null
  // A soft, still skeleton in place of a blank screen. The words stay for screen readers.
  return (
    <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={String(children || '')} style={[styles.skel, { opacity: fade }]}>
      {SKEL_ROWS.map((width, i) => (
        <View key={i} style={[styles.skelRow, { width, backgroundColor: colors.panel3 }]} />
      ))}
    </Animated.View>
  )
}

// `dim` looks disabled but still takes the press, so the screen can say why.
export function DidButton({ label, onPress, colors, small, disabled, dim, danger }) {
  const off = disabled || dim
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      android_ripple={ripple(`${colors.bg}40`)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(off) }}
      style={({ pressed }) => [
        styles.did,
        small && styles.didSmall,
        // danger: the red for actions that remove something.
        { backgroundColor: off ? colors.panel3 : danger ? colors.miss : colors.on },
        pressFx(pressed),
      ]}
    >
      <Text style={[styles.didText, { color: off ? colors.inkDim : colors.bg }]}>{label}</Text>
    </Pressable>
  )
}

export function KeyButton({ label, onPress, colors, picked, disabled, danger }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      android_ripple={ripple(`${colors.on}33`)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(picked) }}
      style={({ pressed }) => [
        styles.key,
        {
          borderColor: picked ? colors.onDeep : colors.line,
          backgroundColor: colors.panel2,
          opacity: disabled ? 0.5 : 1,
        },
        pressFx(pressed),
      ]}
    >
      <Text style={[styles.keyText, { color: danger ? colors.miss : picked ? colors.on : colors.ink }]}>{label}</Text>
    </Pressable>
  )
}

// children: actions that belong to this row (Copy, Share), drawn inside its card.
export function Row({ label, note, onPress, colors, children }) {
  if (children && !onPress) {
    return (
      <View style={[styles.row, styles.rowStack, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
          {note ? <Text style={[styles.rowNote, { color: colors.inkDim }]}>{note}</Text> : null}
        </View>
        {children}
      </View>
    )
  }
  return (
    // No onPress: a plain info row, no chevron and no press state.
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={onPress ? ripple(`${colors.on}33`) : undefined}
      style={({ pressed }) => [styles.row, { borderColor: colors.line, backgroundColor: colors.panel }, pressFx(pressed)]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
        {note ? <Text style={[styles.rowNote, { color: colors.inkDim }]}>{note}</Text> : null}
      </View>
      {onPress ? <Text style={[styles.rowChev, { color: colors.inkDim }]}>›</Text> : null}
    </Pressable>
  )
}

export function Field({
  label,
  value,
  onChangeText,
  colors,
  multiline,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  maxLength,
  onSubmitEditing,
  onEndEditing,
  returnKeyType,
  blurOnSubmit,
  autoFocus,
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.inkSoft }]}>{label}</Text>
      <AppTextInput
        colors={colors}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        onSubmitEditing={onSubmitEditing}
        onEndEditing={onEndEditing}
        autoFocus={autoFocus}
        blurOnSubmit={blurOnSubmit}
        returnKeyType={returnKeyType ?? (onSubmitEditing ? 'done' : undefined)}
        style={[
          styles.input,
          multiline && styles.inputMulti,
          { color: colors.ink, borderColor: colors.line, backgroundColor: colors.panel2 },
        ]}
      />
    </View>
  )
}

export function ChipRow({ items, value, onPick, colors, scroll }) {
  const chips = items.map((item) => {
    const on = value === item.id
    return (
      <Pressable
        key={item.id}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => onPick(item.id)}
        android_ripple={ripple(`${colors.on}33`)}
        style={({ pressed }) => [styles.chip, { borderColor: on ? colors.onDeep : colors.line }, pressFx(pressed)]}
      >
        <Text style={{ color: on ? colors.on : colors.ink }}>{item.label}</Text>
      </Pressable>
    )
  })
  if (scroll) {
    return (
      <FadeScroll fade={colors.bg} contentContainerStyle={styles.chips}>
        {chips}
      </FadeScroll>
    )
  }
  return <View style={styles.chips}>{chips}</View>
}

const styles = StyleSheet.create({
  skel: { gap: 12, paddingVertical: 8, alignSelf: 'stretch' },
  skelRow: { height: 52, borderRadius: 14, opacity: 0.7 },
  page: { gap: 12 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  meta: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  // overflow: the Android press ripple stays inside the round pill.
  did: { borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, overflow: 'hidden' },
  didSmall: { minHeight: 40 },
  didText: { fontFamily: fonts.uiBold, fontSize: 15 },
  key: { borderRadius: 999, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, overflow: 'hidden' },
  keyText: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '500' },
  row: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { flex: 1, gap: 4 },
  rowStack: { flexDirection: 'column', alignItems: 'stretch', gap: 12 },
  rowChev: { fontSize: 22, lineHeight: 24 },
  rowLabel: { fontFamily: fonts.uiSemi, fontSize: 15 },
  rowNote: { fontFamily: fonts.ui, fontSize: 13 },
  field: { gap: 6, marginBottom: 10 },
  fieldLabel: { ...sectionLabel },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
})
