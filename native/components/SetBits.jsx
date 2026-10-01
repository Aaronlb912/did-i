import { useEffect, useRef } from 'react'
import { Animated, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { t } from '../../src/lib/i18n.js'
import { useReduceMotion } from '../../src/lib/useReduceMotion.js'
import { ripple } from '../lib/ripple.js'
import { fonts, radius, sectionLabel } from '../theme.js'
import { MenuIcon } from './MenuIcon.jsx'
import { KeyboardLift } from './KeyboardLift.jsx'
import { AppTextInput } from './ui.jsx'

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

export function SetRow({ label, sub, value, icon, tint, last, onPress, chevron, danger, colors, on }) {
  const flat = !onPress
  const tileColor = danger ? colors.miss : tint || colors.inkSoft
  const tileBg = danger ? `${colors.miss}1f` : tint ? `${tint}1f` : colors.panel2
  const body = (
    <>
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: tileBg }]}>
          <MenuIcon name={icon} color={tileColor} size={17} stroke />
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
      android_ripple={ripple(colors.panel3)}
      accessibilityRole="button"
      accessibilityLabel={[label, value, sub].filter(Boolean).join(', ')}
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

export function SetSwitch({ label, sub, icon, tint, last, on, onPress, colors }) {
  const tileColor = tint || (on ? colors.on : colors.inkSoft)
  const tileBg = tint ? `${tint}1f` : colors.panel2
  return (
    <View style={[styles.row, { borderBottomColor: colors.lineSoft }, last && { borderBottomWidth: 0 }]}>
      {icon ? (
        <View style={[styles.iconTile, { backgroundColor: tileBg }]}>
          <MenuIcon name={icon} color={tileColor} size={17} stroke />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: colors.inkDim }]}>{sub}</Text> : null}
      </View>
      {Platform.OS === 'android' ? (
        <M3Switch on={on} onPress={onPress} label={label} colors={colors} />
      ) : (
        <Switch
          value={on}
          onValueChange={onPress}
          accessibilityLabel={label}
          trackColor={{ false: colors.open, true: colors.on }}
          ios_backgroundColor={colors.open}
        />
      )}
    </View>
  )
}

// Android's native Switch is still AppCompat's thin translucent track, so off
// read as dark grey on dark grey. Material 3's off state has an outlined
// track and an outline-colored thumb; on fills the track and grows the thumb.
function M3Switch({ on, onPress, label, colors }) {
  const reduce = useReduceMotion()
  const move = useRef(new Animated.Value(on ? 1 : 0)).current
  useEffect(() => {
    if (reduce) {
      move.setValue(on ? 1 : 0)
      return
    }
    Animated.timing(move, { toValue: on ? 1 : 0, duration: 150, useNativeDriver: false }).start()
  }, [on, reduce, move])
  const size = move.interpolate({ inputRange: [0, 1], outputRange: [16, 24] })
  const left = move.interpolate({ inputRange: [0, 1], outputRange: [6, 22] })
  const top = move.interpolate({ inputRange: [0, 1], outputRange: [6, 2] })
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: Boolean(on) }}
      onPress={() => onPress?.(!on)}
      hitSlop={8}
      style={[
        styles.m3Track,
        on
          ? { backgroundColor: colors.on, borderColor: colors.on }
          : { backgroundColor: colors.open, borderColor: colors.inkSoft },
      ]}
    >
      <Animated.View
        style={[
          styles.m3Thumb,
          { width: size, height: size, left, top, backgroundColor: on ? colors.bg : colors.inkSoft },
        ]}
      />
    </Pressable>
  )
}

export function SetField({ label, colors, ...inputProps }) {
  return (
    <View style={[styles.fieldRow, { borderBottomColor: colors.lineSoft }]}>
      <Text style={[styles.fieldLabel, { color: colors.ink }]}>{label}</Text>
      <AppTextInput
        colors={colors}
        {...inputProps}
        style={[styles.fieldInput, { color: colors.ink }]}
      />
    </View>
  )
}

export function SetPick({ label, on, onPress, colors }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={ripple(colors.panel3)}
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
        <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
          <Pressable
            accessible={false}
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
  m3Track: { width: 52, height: 32, borderRadius: 16, borderWidth: 2 },
  m3Thumb: { position: 'absolute', borderRadius: 12 },
  iconTile: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cap: {
    ...sectionLabel,
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
  // The value gives way before the label does: an email shortens with "…"
  // instead of squeezing "Account" into two lines on a narrow phone.
  end: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: '45%' },
  val: { fontFamily: fonts.ui, fontSize: 15, maxWidth: 140, flexShrink: 1 },
  chev: { fontFamily: fonts.ui, fontSize: 22, lineHeight: 24, marginTop: -2 },
  check: { fontFamily: fonts.uiBold, fontSize: 18 },
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
