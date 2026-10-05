import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import { refreshTogether } from '../../src/lib/people.js'
import { buildTogetherWidgetProps, onTogetherSaved, readTogetherPeople } from '../../src/lib/together-widget.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'

const SHOWN = 6

// Friends and family on Home: a face each, lit when they are done tonight.
// Reads the list the Together widget keeps (one known_people call, saved),
// so it draws at once with no flash, then refreshes at most every 5 minutes.
// Nothing shows when you have nobody yet. Tap to open Friends and family.
export function FriendsRow({ colors }) {
  const account = useAccount()
  const [people, setPeople] = useState(() => readTogetherPeople())

  useEffect(() => {
    if (!account.user) return undefined
    const off = onTogetherSaved(() => setPeople(readTogetherPeople()))
    refreshTogether().catch(() => {})
    return off
  }, [account.user])

  if (!account.user || !people.length) return null
  const props = buildTogetherWidgetProps(people)
  // Done first here: the row is a nudge that others are already there.
  const rows = [...props.people].sort((a, b) => Number(b.done) - Number(a.done) || a.name.localeCompare(b.name))
  const shown = rows.slice(0, SHOWN)
  const more = rows.length - shown.length
  const tint = colors.we || colors.on

  return (
    <Pressable
      onPress={() => goHash('/people')}
      accessibilityRole="button"
      accessibilityLabel={`${props.title}: ${props.countLine}`}
      hitSlop={6}
      style={[styles.wrap, { borderColor: colors.line, backgroundColor: colors.panel }]}
    >
      <View style={styles.faces}>
        {shown.map((p) => (
          <View
            key={p.id}
            accessibilityLabel={t(p.done ? 'friendsRow.done' : 'friendsRow.waiting', { name: p.name || '?' })}
            style={[
              styles.face,
              { backgroundColor: p.done ? tint : colors.panel2, borderColor: p.done ? tint : colors.line },
            ]}
          >
            <Text style={[styles.faceText, { color: p.done ? colors.bg : colors.inkSoft }]}>{p.initials}</Text>
          </View>
        ))}
        {more > 0 ? (
          <View style={[styles.face, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
            <Text style={[styles.faceText, { color: colors.inkSoft }]}>+{more}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.count, { color: colors.inkSoft }]} numberOfLines={1}>
        {props.countLine}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  faces: { flexDirection: 'row' },
  face: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -4,
  },
  faceText: { fontFamily: fonts.uiSemi, fontSize: 10 },
  count: { fontFamily: fonts.ui, fontSize: 13, marginLeft: 4, flexShrink: 1 },
})
