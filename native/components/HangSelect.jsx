import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { fonts, radius } from '../theme.js'

export function HangSelect({ value, onChange, options, ariaLabel, colors, open: openIn, onOpenChange }) {
  const [openLocal, setOpenLocal] = useState(false)
  const open = openIn ?? openLocal
  const current = options.find((opt) => opt.value === value) ?? options[0]

  function setOpen(next) {
    if (onOpenChange) onOpenChange(next)
    else setOpenLocal(next)
  }

  function pick(next) {
    onChange(next)
    setOpen(false)
  }

  return (
    <View style={[styles.shell, open && styles.shellOpen]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[
          styles.trigger,
          { borderColor: colors.line, backgroundColor: colors.panel },
          open && { borderColor: colors.onDeep },
        ]}
      >
        <Text style={[styles.value, { color: colors.ink }]} numberOfLines={1}>
          {current?.label}
        </Text>
        <Text style={[styles.chev, { color: colors.inkDim }]}>▾</Text>
      </Pressable>
      {open ? (
        <>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="" />
          <View
            style={[
              styles.menu,
              {
                borderColor: colors.line,
                backgroundColor: colors.panel,
                shadowColor: colors.bg,
              },
            ]}
          >
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.menuScroll}>
              {options.map((opt) => {
                const on = opt.value === value
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => pick(opt.value)}
                    style={({ pressed }) => [
                      styles.opt,
                      pressed && { backgroundColor: colors.panel2 },
                      on && { backgroundColor: colors.panel2 },
                    ]}
                  >
                    <Text style={[styles.optText, { color: on ? colors.on : colors.ink, fontWeight: on ? '600' : '400' }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    zIndex: 1,
  },
  shellOpen: {
    zIndex: 10,
  },
  trigger: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.rSm,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: {
    fontFamily: fonts.ui,
    fontSize: 15,
    flex: 1,
  },
  chev: {
    fontFamily: fonts.ui,
    fontSize: 12,
  },
  backdrop: {
    position: 'absolute',
    top: -400,
    left: -400,
    right: -400,
    bottom: -400,
    zIndex: 1,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: radius.rSm,
    maxHeight: 220,
    zIndex: 2,
    elevation: 8,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    overflow: 'hidden',
  },
  menuScroll: {
    maxHeight: 220,
  },
  opt: {
    minHeight: 40,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  optText: {
    fontFamily: fonts.ui,
    fontSize: 15,
  },
})
