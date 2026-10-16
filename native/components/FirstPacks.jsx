import { Pressable, StyleSheet, Text, View } from 'react-native'
import { packState } from '../../src/lib/first-run.js'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

function Box({ state, colors }) {
  const on = state !== 'none'
  return (
    <View
      style={[
        styles.box,
        { borderColor: on ? colors.on : colors.line, backgroundColor: on ? colors.on : 'transparent' },
      ]}
    >
      {on ? <Text style={[styles.mark, { color: colors.bg }]}>{state === 'all' ? '✓' : '–'}</Text> : null}
    </View>
  )
}

// First run: each pack is a card. The header checks or clears the whole
// pack; each question row checks or clears just that one.
export function FirstPacks({ packs, picks, onPack, onPick, colors }) {
  if (!packs.length) return null
  const isOn = (item) => picks.some((pick) => pick.question === item.question)
  return (
    <View style={styles.list}>
      {packs.map((pack) => {
        const state = packState(picks, pack)
        const count = pack.items.filter(isOn).length
        return (
          <View
            key={pack.id}
            style={[
              styles.card,
              { borderColor: state === 'none' ? colors.line : colors.onDeep, backgroundColor: colors.panel2 },
            ]}
          >
            <Pressable
              onPress={() => onPack(pack)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: state === 'all' ? true : state === 'some' ? 'mixed' : false }}
              accessibilityLabel={pack.title}
              accessibilityHint={t('first.stepOf', { n: count, total: pack.items.length })}
              style={styles.head}
            >
              <Box state={state} colors={colors} />
              <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
                {pack.title}
              </Text>
              <Text style={[styles.count, { color: state === 'none' ? colors.inkSoft : colors.on }]}>
                {t('first.stepOf', { n: count, total: pack.items.length })}
              </Text>
            </Pressable>
            {pack.items.map((item) => {
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
                  <Text style={[styles.question, { color: on ? colors.ink : colors.inkDim }]}>{item.question}</Text>
                </Pressable>
              )
            })}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 10, marginTop: 12, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14 },
  title: { flex: 1, fontFamily: fonts.uiSemi, fontSize: 17 },
  count: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6 },
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
