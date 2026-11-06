import { StyleSheet, Text, View } from 'react-native'
import { shortLabel } from '../../src/lib/board-json.js'
import { recapLine, recapShareText } from '../../src/lib/hall-pages.js'
import { t } from '../../src/lib/i18n.js'
import { passAlong } from '../../src/lib/native.js'
import { withAppLink } from '../../src/lib/qr-links.js'
import { gentleOn, usePrefs } from '../../src/lib/prefs.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { goHash } from '../navigation/hash.js'
import { publishSheet } from './SheetHost.jsx'
import { KeyButton, Row } from './ui.jsx'
import { fonts, sectionLabel } from '../theme.js'

/** Shares the week as text, with a visible copied or failed note. */
export async function shareRecap(recap) {
  const how = await passAlong(withAppLink(recapShareText(recap, gentleOn())), t('recap.kicker'))
  if (how === 'copied') confirmDone(t('recap.copied'))
  else if (!how) confirmMiss(t('confirm.shareMiss'))
}

/** A few notes from the week, each opening its question, then a way to all notes. `notes` comes from recapNotes. */
export function RecapNotes({ notes, colors }) {
  if (!notes?.length) return null
  const go = (path, params) => {
    publishSheet(null)
    goHash(path, params)
  }
  return (
    <View style={styles.notes}>
      <Text style={[styles.kicker, { color: colors.inkSoft }]}>{t('notes.title')}</Text>
      {notes.map(({ day, lamp, answer }) => (
        <Row
          key={`${lamp.id}:${answer.periodKey}`}
          colors={colors}
          label={`${formatBoardDate(day)} · ${shortLabel(lamp)}`}
          note={answer.note}
          onPress={() => go('/lamp', { id: lamp.id })}
        />
      ))}
      <Row colors={colors} label={t('notes.seeAll')} onPress={() => go('/notes')} />
    </View>
  )
}

/** The week in three lines, with a share. `recap` comes from weekRecap. */
export function WeekRecap({ recap, colors }) {
  const gentle = usePrefs().gentle === true
  if (!recap) return null

  const share = () => shareRecap(recap)

  return (
    <View style={[styles.wrap, { borderColor: colors.lineSoft || colors.line }]}>
      <Text style={[styles.kicker, { color: colors.inkSoft }]}>{t('recap.kicker')}</Text>
      <Text style={[styles.big, { color: colors.ink }]}>{t('recap.cleared', { cleared: recap.cleared, n: recap.nights })}</Text>
      <Text style={[styles.line, { color: colors.inkSoft }]}>
        {recapLine(recap, gentle)}
      </Text>
      <View style={styles.keys}>
        <KeyButton colors={colors} label={t('recap.shareBtn')} onPress={share} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginTop: 16, paddingTop: 12, borderTopWidth: 1, width: '100%' },
  kicker: { ...sectionLabel },
  big: { fontFamily: fonts.uiBold, fontSize: 16, lineHeight: 22 },
  line: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20 },
  keys: { flexDirection: 'row', marginTop: 6 },
  notes: { gap: 8, marginTop: 8, width: '100%' },
})
