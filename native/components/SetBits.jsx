import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { t } from '../../src/lib/i18n.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { fonts, radius } from '../theme.js'
import { MenuIcon } from './MenuIcon.jsx'
import { KeyboardLift } from './KeyboardLift.jsx'

export function SetCap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

export function SetNote({ children, colors }) {
  return <Text style={[styles.note, { color: colors.inkDim }]}>{children}</Text>
}

export function SetCard({ children, colors }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.panel, borderColor: colors.lineSoft }]}>
      {children}
    </View>
  )
}

export function SetRow({ label, sub, value, icon, last, onPress, chevron, danger, colors, on }) {
  const flat = !onPress
  const body = (
    <>
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: colors.panel2 }]}>
          <MenuIcon name={icon} color={danger ? colors.miss : colors.inkSoft} size={17} stroke />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.label, { color: danger ? colors.miss : colors.ink }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: colors.inkDim }]}>{sub}</Text> : null}
      </View>
      <View style={styles.end}>
        {value ? (
          <Text style={[styles.val, { color: colors.inkDim }]} numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {on ? <Text style={[styles.check, { color: colors.on }]}>✓</Text> : null}
        {chevron ? <Text style={[styles.chev, { color: colors.inkDim }]}>›</Text> : null}
      </View>
    </>
  )
  if (flat) {
    return (
      <View style={[styles.row, styles.rowFlat, { borderBottomColor: colors.lineSoft }, last && { borderBottomWidth: 0 }]}>
        {body}
      </View>
    )
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.lineSoft, backgroundColor: pressed ? colors.panel2 : 'transparent' },
        last && { borderBottomWidth: 0 },
      ]}
    >
      {body}
    </Pressable>
  )
}

export function SetSwitch({ label, sub, icon, last, on, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.lineSoft, backgroundColor: pressed ? colors.panel2 : 'transparent' },
        last && { borderBottomWidth: 0 },
      ]}
    >
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: colors.panel2 }]}>
          <MenuIcon name={icon} color={on ? colors.on : colors.inkSoft} size={17} stroke />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: colors.inkDim }]}>{sub}</Text> : null}
      </View>
      <View style={[styles.switch, { borderColor: on ? colors.onDeep : colors.line, backgroundColor: on ? colors.on : colors.open }]}>
        <View
          style={[
            styles.switchKnob,
            { backgroundColor: on ? colors.bg : colors.panel, alignSelf: on ? 'flex-end' : 'flex-start' },
          ]}
        />
      </View>
    </Pressable>
  )
}

export function SetField({ label, colors, ...inputProps }) {
  return (
    <View style={[styles.fieldRow, { borderBottomColor: colors.lineSoft }]}>
      <Text style={[styles.fieldLabel, { color: colors.ink }]}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[styles.fieldInput, { color: colors.ink }]}
        placeholderTextColor={colors.inkDim}
      />
    </View>
  )
}

export function SetPick({ label, on, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.lineSoft, backgroundColor: pressed ? colors.panel2 : 'transparent' },
      ]}
    >
      <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      {on ? <Text style={[styles.check, { color: colors.on }]}>✓</Text> : null}
    </Pressable>
  )
}

/** The React Native sheet, for when the native one is missing from the binary. SetChoice uses it. */
export function SetSheet({ title, onClose, children, colors }) {
  const still = useReduceMotion()
  const insets = useSafeAreaInsets()
  return (
    <Modal visible transparent animationType={still ? 'none' : 'slide'} onRequestClose={onClose}>
      <KeyboardLift>
        <Pressable style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              { backgroundColor: colors.panel, borderColor: colors.line, paddingBottom: insets.bottom },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={[styles.grabber, { backgroundColor: colors.line }]} />
            <View style={[styles.sheetBar, { borderBottomColor: colors.lineSoft }]}>
              <Text style={[styles.sheetTitle, { color: colors.ink }]}>{title}</Text>
              <Pressable onPress={onClose} accessibilityLabel={t('settings.close')} hitSlop={8}>
                <Text style={[styles.sheetX, { color: colors.inkDim }]}>×</Text>
              </Pressable>
            </View>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardLift>
    </Modal>
  )
}

const styles = StyleSheet.create({
  iconTile: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cap: {
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 14,
    marginBottom: 6,
    marginHorizontal: 3,
  },
  note: {
    fontFamily: fonts.ui,
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 3,
    marginBottom: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.r,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 49,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  rowFlat: {
    backgroundColor: 'transparent',
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontFamily: fonts.ui, fontSize: 16, lineHeight: 20 },
  sub: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 16 },
  end: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  val: { fontFamily: fonts.ui, fontSize: 15, maxWidth: 140 },
  chev: { fontFamily: fonts.ui, fontSize: 22, lineHeight: 24, marginTop: -2 },
  check: { fontFamily: fonts.ui, fontSize: 18, fontWeight: '700' },
  fieldRow: {
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  fieldLabel: { fontFamily: fonts.ui, fontSize: 16 },
  fieldInput: {
    fontFamily: fonts.ui,
    fontSize: 16,
    padding: 0,
    minHeight: 24,
  },
  switch: {
    width: 44,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    padding: 2,
    justifyContent: 'center',
  },
  switchKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  veil: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radius.r,
    borderTopRightRadius: radius.r,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '70%',
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, marginTop: 6 },
  sheetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontFamily: fonts.display, fontSize: 20, fontWeight: '700' },
  sheetX: { fontFamily: fonts.ui, fontSize: 28, lineHeight: 30 },
})
