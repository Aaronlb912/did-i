import { Pressable, StyleSheet, Text, View } from 'react-native'
import { fonts, radius } from '../theme.js'

const GLASS = 9

export function Jewel({
  label,
  tag,
  on,
  skip,
  late,
  waiting,
  face,
  hole,
  sit,
  filament = 0,
  colors,
  onPress,
  disabled = false,
}) {
  const glow = on && filament > 0
  const ink = on || face ? colors.ink : skip && !on ? colors.inkDim : colors.inkSoft
  const rim = on || face ? colors.onDeep : colors.line
  const glassColor = late ? colors.late : on ? colors.on : skip ? colors.skip : colors.open

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shell,
        {
          backgroundColor: face ? colors.panel3 : colors.panel,
          borderColor: hole ? colors.line : sit && on ? colors.on : rim,
          opacity: pressed ? 0.88 : hole ? 0.9 : 1,
        },
        waiting && styles.wait,
        hole && styles.hole,
      ]}
    >
      <View style={styles.ring}>
        {glow ? (
          <View
            style={[
              styles.filament,
              {
                width: GLASS + filament * 3,
                height: GLASS + filament * 3,
                borderRadius: GLASS + filament * 3,
                borderColor: colors.on,
                opacity: 0.18 + filament * 0.12,
              },
            ]}
          />
        ) : null}
        <View
          style={[
            styles.glass,
            hole && !on
              ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.inkDim }
              : { backgroundColor: glassColor },
          ]}
        />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: ink }]} numberOfLines={1}>
          {label}
        </Text>
        {tag ? (
          <Text style={[styles.tag, { color: colors.inkDim }]} numberOfLines={1}>
            {tag}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    maxWidth: 220,
  },
  wait: {
    borderStyle: 'dashed',
  },
  hole: {
    borderStyle: 'dashed',
  },
  ring: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filament: {
    position: 'absolute',
    borderWidth: 1,
  },
  glass: {
    width: GLASS,
    height: GLASS,
    borderRadius: GLASS / 2,
  },
  copy: {
    minWidth: 0,
    flexShrink: 1,
  },
  label: {
    fontFamily: fonts.ui,
    fontSize: 14,
    fontWeight: '500',
  },
  tag: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 1,
  },
})
