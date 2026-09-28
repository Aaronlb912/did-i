import { useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { topicLabel } from '../../src/lib/board-json.js'
import { joinTagIds, leftoverOn, tagIdsOf } from '../../src/lib/tags.js'
import { t } from '../../src/lib/i18n.js'
import { fonts } from '../theme.js'

// One filter popup for folders and, where the screen passes them, topics.
// It floats over the page, so nothing below moves, and scrolls when the list
// is long. Tap to add or remove; "All" clears a section. Done or a tap
// outside closes it.
export function TagFilter({ boards, tagId, onTag, now, colors, topics = [], topicPicks = [], onTopics }) {
  const [open, setOpen] = useState(false)
  const [at, setAt] = useState(null)
  const button = useRef(null)
  const { height } = useWindowDimensions()
  const live = (boards || []).filter((book) => !book.archived)
  const ids = tagIdsOf(tagId)
  const showFolders = live.length >= 2
  const showTopics = Boolean(onTopics) && topics.length > 0
  if (!showFolders && !showTopics) return null

  const clock = now || new Date()
  const allLeft = leftoverOn(live, clock, '')
  const picked = live.filter((book) => ids.includes(book.id))
  const folderPart =
    picked.length === 0 ? t('tags.all') : picked.length === 1 ? picked[0].title : t('tags.some', { n: picked.length })
  const topicPart =
    topicPicks.length === 0 ? '' : topicPicks.length === 1 ? topicLabel(topicPicks[0]) : t('topics.some', { n: topicPicks.length })
  const label = topicPart ? (picked.length ? `${folderPart} · ${topicPart}` : topicPart) : folderPart
  const count = picked.length ? leftoverOn(live, clock, tagId) : allLeft
  const filtering = Boolean(tagId) || topicPicks.length > 0

  function toggleTag(id) {
    const next = ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id]
    // Picking every folder is the same as All.
    onTag(next.length === live.length ? '' : joinTagIds(next))
  }

  function toggleTopic(topic) {
    onTopics(topicPicks.includes(topic) ? topicPicks.filter((item) => item !== topic) : [...topicPicks, topic])
  }

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    button.current?.measureInWindow((x, y, w, h) => {
      setAt({ x, y: y + h + 6 })
      setOpen(true)
    })
  }

  function Check({ on }) {
    return (
      <View style={[styles.box, { borderColor: on ? colors.on : colors.line, backgroundColor: on ? colors.on : 'transparent' }]}>
        {on ? <Text style={[styles.tick, { color: colors.bg }]}>✓</Text> : null}
      </View>
    )
  }

  function Row({ on, name, left, onPress }) {
    return (
      <Pressable style={styles.row} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
        <View style={styles.rowName}>
          <Check on={on} />
          <Text style={{ color: on ? colors.on : colors.ink, flexShrink: 1 }} numberOfLines={1}>
            {name}
          </Text>
        </View>
        {left ? <Text style={{ color: colors.on }}>{left}</Text> : null}
      </Pressable>
    )
  }

  // Keep the popup on screen: leave room below it for Done.
  const maxList = Math.max(160, height - (at?.y || 0) - 90)

  return (
    <View style={styles.wrap}>
      <View style={styles.line}>
      <Pressable
        ref={button}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={[styles.pick, { backgroundColor: colors.panel2, borderColor: filtering ? colors.onDeep : colors.line }]}
      >
        <Text style={[styles.bars, { color: filtering ? colors.on : colors.ink }]}>≡</Text>
        <Text
          style={[styles.name, { color: filtering ? colors.on : colors.ink }]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {label}
        </Text>
        {count && showFolders && !topicPicks.length ? <Text style={[styles.count, { color: colors.on }]}>{count}</Text> : null}
      </Pressable>
      {filtering ? (
        <Pressable
          onPress={() => {
            onTag('')
            if (onTopics && topicPicks.length) onTopics([])
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('tags.clear')}
          style={[styles.clear, { backgroundColor: colors.panel2, borderColor: colors.line }]}
        >
          <Text style={[styles.clearText, { color: colors.ink }]}>×</Text>
        </Pressable>
      ) : null}
      </View>
      <Modal visible={open && Boolean(at)} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t('settings.close')}>
          <Pressable
            style={[
              styles.menu,
              { top: at?.y || 0, left: at?.x || 0, backgroundColor: colors.panel2, borderColor: colors.line },
            ]}
          >
            <ScrollView style={{ maxHeight: maxList }} contentContainerStyle={styles.list}>
              {showFolders ? (
                <>
                  {showTopics ? <Text style={[styles.cap, { color: colors.inkDim }]}>{t('nav.boards')}</Text> : null}
                  <Row on={!ids.length} name={t('tags.all')} left={allLeft} onPress={() => onTag('')} />
                  {live.map((book) => (
                    <Row
                      key={book.id}
                      on={ids.includes(book.id)}
                      name={book.title}
                      left={leftoverOn(live, clock, book.id)}
                      onPress={() => toggleTag(book.id)}
                    />
                  ))}
                </>
              ) : null}
              {showTopics ? (
                <>
                  <Text style={[styles.cap, { color: colors.inkDim }, showFolders && styles.capGap]}>
                    {t('questions.topics')}
                  </Text>
                  <Row on={!topicPicks.length} name={t('tags.all')} onPress={() => onTopics([])} />
                  {topics.map((topic) => (
                    <Row
                      key={topic}
                      on={topicPicks.includes(topic)}
                      name={topicLabel(topic)}
                      onPress={() => toggleTopic(topic)}
                    />
                  ))}
                </>
              ) : null}
            </ScrollView>
            <Pressable style={[styles.done, { borderTopColor: colors.line }]} onPress={() => setOpen(false)}>
              <Text style={[styles.doneText, { color: colors.on }]}>{t('tags.done')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 8, alignSelf: 'flex-start' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { fontFamily: fonts.ui, fontSize: 18, lineHeight: 20 },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 32,
    maxWidth: '100%',
  },
  bars: { fontFamily: fonts.mono, fontSize: 14 },
  name: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', flexShrink: 1 },
  count: { fontFamily: fonts.mono, fontSize: 11 },
  backdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 12,
    padding: 6,
    minWidth: 220,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  list: { gap: 2 },
  cap: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 10, paddingTop: 6 },
  capGap: { marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, gap: 12 },
  rowName: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  box: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tick: { fontSize: 12, fontWeight: '800', lineHeight: 14 },
  done: { borderTopWidth: 1, marginTop: 4, paddingTop: 10, paddingBottom: 6, alignItems: 'center' },
  doneText: { fontFamily: fonts.ui, fontSize: 14, fontWeight: '700' },
})
