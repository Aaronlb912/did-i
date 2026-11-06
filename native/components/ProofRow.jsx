import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

/** One photo as a full-width row: a small picture, who, the day if given, and a way to open it. */
export function ProofRow({ row, name, mine = false, day = '', colors, onOpen }) {
  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t('proof.viewA11y', { name })}
      style={[styles.row, { borderColor: colors.line }]}
    >
      <Image source={{ uri: row.url }} style={[styles.pic, { backgroundColor: colors.panel2 }]} accessibilityIgnoresInvertColors />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
          {mine ? t('proof.yours') : t('proof.from', { name })}
        </Text>
        {day ? <Text style={[styles.day, { color: colors.inkDim }]} numberOfLines={1}>{day}</Text> : null}
      </View>
      <Text style={[styles.chev, { color: colors.inkDim }]}>›</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth },
  pic: { width: 48, height: 48, borderRadius: 8 },
  copy: { flex: 1 },
  title: { fontFamily: fonts.uiSemi, fontSize: 15 },
  day: { fontFamily: fonts.ui, fontSize: 13 },
  chev: { fontSize: 18 },
})
