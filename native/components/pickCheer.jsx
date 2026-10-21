import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { cheerText } from '../../src/lib/purse.js'
import { fonts } from '../theme.js'
import { CheerChip } from './Cosmetic.jsx'
import { publishSheet } from './SheetHost.jsx'

// "Cheer Sam?" with the cheers you own, so a tap never sends one by itself.
export function pickCheer(colors, { name, purse, onGo }) {
  const owned = purse.cheers?.length ? purse.cheers : ['lime']
  let chosen = owned.includes(purse.cheerOn) ? purse.cheerOn : owned[0]
  publishSheet({
    title: t('cheer.pickTitle', { name }),
    body: owned.length > 1 ? t('cheer.pickBody') : '',
    content: owned.length > 1 ? <Picks owned={owned} first={chosen} colors={colors} onPick={(id) => { chosen = id }} /> : null,
    goLabel: t('friends.cheerUse'),
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      onGo(chosen)
    },
  })
}

function Picks({ owned, first, colors, onPick }) {
  const [on, setOn] = useState(first)
  return (
    <View style={styles.grid}>
      {owned.map((id) => {
        const picked = id === on
        const label = t(cheerText(id, 'name'))
        return (
          <Pressable
            key={id}
            onPress={() => { setOn(id); onPick(id) }}
            accessibilityRole="radio"
            accessibilityState={{ selected: picked }}
            accessibilityLabel={label}
            style={[styles.tile, { borderColor: picked ? colors.on : colors.line, borderWidth: picked ? 2 : 1 }]}
          >
            <CheerChip id={id} stage={1} colors={colors} />
            <Text numberOfLines={1} style={[styles.name, { color: colors.ink }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  tile: { width: 84, alignItems: 'center', gap: 4, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 4 },
  name: { fontFamily: fonts.ui, fontSize: 12 },
})
