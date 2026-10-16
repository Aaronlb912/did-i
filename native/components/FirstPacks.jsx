import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { packState } from '../../src/lib/first-run.js'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'
import { BackChevron } from './BackChevron.jsx'

function Box({ state, colors }) {
  const on = state !== 'none'
  return (
    <View
      style={[
        styles.box,
        { borderColor: on ? colors.on : colors.inkSoft, backgroundColor: on ? colors.on : 'transparent' },
      ]}
    >
      {on ? <Text style={[styles.mark, { color: colors.bg }]}>{state === 'all' ? '✓' : '–'}</Text> : null}
    </View>
  )
}

// First run: each pack is a card. The header checks or clears the whole
// pack; the arrow opens it so each question can be checked on its own.
// Packs start closed so the page fits on one screen.
export function FirstPacks({ packs, picks, onPack, onPick, colors }) {
  const [open, setOpen] = useState([])
  if (!packs.length) return null
  const isOn = (item) => picks.some((pick) => pick.question === item.question)
  return (
    <View style={styles.list}>
      {packs.map((pack) => {
        const state = packState(picks, pack)
        const count = pack.items.filter(isOn).length
        const shown = open.includes(pack.id)
        return (
          <View
            key={pack.id}
            style={[
              styles.card,
              { borderColor: state === 'none' ? colors.line : colors.onDeep, backgroundColor: colors.panel2 },
            ]}
          >
            <View style={styles.top}>
              <Pressable
                onPress={() => onPack(pack)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: state === 'all' ? true : state === 'some' ? 'mixed' : false }}
                accessibilityLabel={pack.title}
                accessibilityHint={t('first.stepOf', { n: count, total: pack.items.length })}
                style={styles.head}
              >
                <Box state={state} colors={colors} />
                <View style={styles.text}>
                  <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
                    {pack.title}
                  </Text>
                  <Text style={[styles.sub, { color: colors.inkSoft }]} numberOfLines={1}>
                    {pack.items.map((item) => item.short).join(', ')}
                  </Text>
                </View>
                <Text style={[styles.count, { color: state === 'none' ? colors.inkSoft : colors.on }]}>
                  {t('first.stepOf', { n: count, total: pack.items.length })}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setOpen((list) => (shown ? list.filter((id) => id !== pack.id) : [...list, pack.id]))}
                accessibilityRole="button"
                accessibilityState={{ expanded: shown }}
                accessibilityLabel={t('first.packShow', { pack: pack.title })}
                style={[styles.more, { borderLeftColor: colors.lineSoft }]}
              >
                <View style={{ transform: [{ rotate: shown ? '90deg' : '-90deg' }] }}>
                  <BackChevron color={colors.inkSoft} size={22} />
                </View>
              </Pressable>
            </View>
            {shown
              ? pack.items.map((item) => {
                  const on = isOn(item)
                  return (
                    <Pressable
                      key={item.idea}
                      onPress={() => onPick(item)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={item.question}
                      style={[styles.row, { borderTopColor: colors.lineSoft }]}
                    >
                      <Box state={on ? 'all' : 'none'} colors={colors} />
                      <Text style={[styles.question, { color: colors.ink }]}>{item.question}</Text>
                    </Pressable>
                  )
                })
              : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10, marginTop: 12, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'stretch' },
  head: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingLeft: 14, paddingRight: 6 },
  text: { flex: 1, gap: 1 },
  title: { fontFamily: fonts.uiSemi, fontSize: 17 },
  sub: { fontFamily: fonts.ui, fontSize: 13 },
  count: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6 },
  more: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  question: { flex: 1, fontFamily: fonts.ui, fontSize: 15, lineHeight: 20 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mark: { fontFamily: fonts.uiBold, fontSize: 14, lineHeight: 16 },
})
