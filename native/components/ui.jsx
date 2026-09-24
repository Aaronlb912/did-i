import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fonts } from '../theme.js'

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

export function Meta({ children, colors }) {
  return <Text style={[styles.meta, { color: colors.inkSoft }]}>{children}</Text>
}

// `dim` looks disabled but still takes the press, so the screen can say why.
export function DidButton({ label, onPress, colors, small, disabled, dim }) {
  const off = disabled || dim
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(off) }}
      style={[
        styles.did,
        small && styles.didSmall,
        { backgroundColor: off ? colors.panel3 : colors.on },
      ]}
    >
      <Text style={[styles.didText, { color: off ? colors.inkDim : colors.bg }]}>{label}</Text>
    </Pressable>
  )
}

export function KeyButton({ label, onPress, colors, picked, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.key,
        {
          borderColor: picked ? colors.onDeep : colors.line,
          backgroundColor: colors.panel2,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text style={[styles.keyText, { color: picked ? colors.on : colors.ink }]}>{label}</Text>
    </Pressable>
  )
}

export function Row({ label, note, onPress, colors }) {
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <Text style={[styles.rowLabel, { color: colors.ink }]}>{label}</Text>
      {note ? <Text style={[styles.rowNote, { color: colors.inkDim }]}>{note}</Text> : null}
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
      <TextInput
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
        placeholderTextColor={colors.inkDim}
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
        onPress={() => onPick(item.id)}
        style={[styles.chip, { borderColor: on ? colors.onDeep : colors.line }]}
      >
        <Text style={{ color: on ? colors.on : colors.ink }}>{item.label}</Text>
      </Pressable>
    )
  })
  if (scroll) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips}
      </ScrollView>
    )
  }
  return <View style={styles.chips}>{chips}</View>
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  kicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 26, fontWeight: '700', lineHeight: 32 },
  meta: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  did: { borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  didSmall: { minHeight: 40 },
  didText: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '700' },
  key: { borderRadius: 999, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1 },
  keyText: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '500' },
  row: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 8, gap: 4 },
  rowLabel: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600' },
  rowNote: { fontFamily: fonts.ui, fontSize: 13 },
  field: { gap: 6, marginBottom: 10 },
  fieldLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  inputMulti: { minHeight: 88, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
})
