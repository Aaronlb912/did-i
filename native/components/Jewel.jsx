import { Pressable, StyleSheet, Text, View } from 'react-native'
import { fonts } from '../theme.js'

export function Jewel({ label, tag, on, skip, late, waiting, face, colors, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.shell,
        {
          backgroundColor: face ? colors.panel3 : colors.panel,
          borderColor: on || face ? colors.onDeep : colors.line,
          opacity: pressed ? 0.88 : 1,
        },
        waiting && styles.wait,
        skip && !on && styles.skip,
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: on ? colors.on : skip ? colors.skip : late ? colors.late : colors.open,
            borderWidth: waiting ? 0 : 0,
          },
        ]}
      />
      <View style={styles.copy}>
        <Text style={[styles.label, { color: skip && !on ? colors.inkDim : colors.ink }]} numberOfLines={1}>
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
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 220,
  },
  wait: {
    borderStyle: 'dashed',
  },
  skip: {},
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
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
