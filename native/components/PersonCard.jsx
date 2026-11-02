import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Reveal } from '../lib/motion.jsx'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'
import { PersonAvatar } from './PersonAvatar.jsx'

/** One person: photo, else buddy with a colored initial, else letters (PersonAvatar). */
export function Avatar(props) {
  return <PersonAvatar {...props} />
}

/** A small label on the right of a card: done tonight, a role, a streak. */
export function Pill({ label, on, colors }) {
  if (!label) return null
  return (
    <View
      style={[
        styles.pill,
        { borderColor: on ? colors.onDeep : colors.line, backgroundColor: on ? colors.panel3 : colors.panel2 },
      ]}
    >
      <Text style={[styles.pillText, { color: on ? colors.on : colors.inkSoft }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

/**
 * One person: avatar, name, a line under it, quick actions, and an optional
 * fold with the rarer ones (switches, remove, block).
 */
export function PersonCard({ person, name, line, done, pill, pillOn, colors, extra, actions, more, highlight, onOpen, noted = false }) {
  const [open, setOpen] = useState(false)
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.panel,
          borderColor: highlight ? colors.on : colors.line,
          borderWidth: highlight ? 2 : 1,
        },
      ]}
    >
      <Pressable
        disabled={!onOpen}
        onPress={onOpen}
        accessibilityRole={onOpen ? 'button' : undefined}
        style={({ pressed }) => [styles.top, pressed && onOpen ? { opacity: 0.7 } : null]}
      >
        <Avatar person={person} done={done} colors={colors} />
        <View style={styles.copy}>
          <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>
            {name}
            {noted ? (
              <Text style={{ color: colors.inkDim }} accessibilityLabel={t('friendNote.has')}>
                {'  ✎'}
              </Text>
            ) : null}
          </Text>
          {line ? (
            <Text style={[styles.line, { color: colors.inkDim }]} numberOfLines={2}>
              {line}
            </Text>
          ) : null}
        </View>
        <Pill label={pill} on={pillOn} colors={colors} />
        {onOpen ? <Text style={[styles.chev, { color: colors.inkDim }]}>›</Text> : null}
      </Pressable>
      {extra}
      {actions || more ? (
        <View style={styles.actions}>
          {actions}
          {more ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpen((live) => !live)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.moreBtn,
                { borderColor: colors.line, backgroundColor: pressed ? colors.panel3 : colors.panel2 },
              ]}
            >
              <Text style={[styles.moreText, { color: colors.inkSoft }]}>
                {open ? t('people.less') : t('people.more')}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {more && open ? <Reveal style={[styles.fold, { borderTopColor: colors.lineSoft }]}>{more}</Reveal> : null}
    </View>
  )
}

/** Section heading with an optional count and a link on the right. */
/** "+ Add" as an outlined pill, so it does not read as the same thing as See all. */
export function AddPill({ colors, onPress, label }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <View style={[styles.addPill, { borderColor: colors.on, opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.addPillText, { color: colors.on }]}>+ {t('tonight.add')}</Text>
        </View>
      )}
    </Pressable>
  )
}

export function SectionHead({ label, count, link, onLink, onAdd, addLabel, colors }) {
  return (
    <View style={styles.head}>
      <Text style={[styles.headText, { color: colors.inkDim }]}>
        {label}
        {count != null ? ` · ${count}` : ''}
      </Text>
      <View style={styles.headRight}>
        {onAdd ? <AddPill colors={colors} onPress={onAdd} label={addLabel} /> : null}
        {link ? (
          <Pressable onPress={onLink} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.headLink, { color: colors.inkSoft }]}>{link} ›</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

/** What an empty section says, and the one thing to do about it. */
export function EmptyCard({ title, body, children, colors }) {
  return (
    <View style={[styles.empty, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      {title ? <Text style={[styles.emptyTitle, { color: colors.ink }]}>{title}</Text> : null}
      {body ? <Text style={[styles.line, { color: colors.inkDim }]}>{body}</Text> : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontFamily: fonts.display, fontWeight: '700' },
  card: { borderRadius: 16, padding: 14, gap: 12, marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chev: { fontFamily: fonts.ui, fontSize: 22, lineHeight: 24 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontFamily: fonts.uiBold, fontSize: 16 },
  line: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 120 },
  pillText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  moreBtn: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  moreText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  fold: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  headText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  headRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headLink: { fontFamily: fonts.uiSemi, fontSize: 14 },
  addPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  addPillText: { fontFamily: fonts.uiSemi, fontSize: 13 },
  empty: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10, marginBottom: 10 },
  emptyTitle: { fontFamily: fonts.uiBold, fontSize: 16 },
})
