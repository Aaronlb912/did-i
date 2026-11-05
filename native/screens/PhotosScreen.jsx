import { useIsFocused } from '@react-navigation/native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { t } from '../../src/lib/i18n.js'
import { PROOF_STALE_MS, cachedLibrary, clearLibrary, keepLibrary, loadLibrary, loadLibraryRow, removeAllProofs } from '../../src/lib/proofs.js'
import { formatBoardDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { EmptyCard } from '../components/PersonCard.jsx'
import { publishSheet } from '../components/SheetHost.jsx'
import { DidButton, KeyButton, Meta } from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { useWeCheer } from '../../src/lib/we-cheer.js'
import { confirmDone, confirmMiss, once } from '../lib/confirm.js'
import { photoList } from '../lib/photo-list.js'
import { askRemoveProof, askReportProof, canSaveProof, saveProof, shareProof } from '../lib/proof-flow.jsx'
import { goBack, goHash, onRoute } from '../navigation/hash.js'
import { fonts, sectionLabel } from '../theme.js'
import { SureModal } from './more.jsx'

const GAP = 6
const COLUMNS = 3
// Images drawn at once. Show more adds the next PAGE (and reads the next page of links when the loaded ones run out).
const PAGE = 30
const FILTERS = [
  ['all', 'photos.all'],
  ['you', 'people.sendDidYou'],
  ['we', 'we.title'],
]

// The photos removed or reported since the last read, so the grid is right
// on return. The viewer swipes through photoList (the grid as it was drawn).
const gone = new Set()
const goneWatchers = new Set()
function forget(id) {
  gone.add(id)
  goneWatchers.forEach((fn) => fn())
}

function useNameOf() {
  const uid = useAccount().user?.id
  return (row) => (row.owner_id === uid ? t('we.you') : row.name || t('people.someone'))
}

function groupRows(rows, by, nameOf) {
  const groups = new Map()
  for (const row of rows) {
    const key = by === 'person' ? row.owner_id : row.send_id || row.card_id
    const title = by === 'person' ? nameOf(row) : row.question || t('photos.noQuestion')
    if (!groups.has(key)) groups.set(key, { key, title, rows: [] })
    groups.get(key).rows.push(row)
  }
  // Rows arrive newest first, so each group and the list are newest first.
  return [...groups.values()]
}

/** The photo library: every photo you may see, by question or by person. openId: a photo a push or link points at. */
export function PhotosScreen({ openId = '' }) {
  const colors = useHallColors()
  const account = useAccount()
  const nameOf = useNameOf()
  const win = useWindowDimensions()
  const [rows, setRows] = useState(null)
  const [miss, setMiss] = useState('')
  const [filter, setFilter] = useState('all')
  const [by, setBy] = useState('question')
  const [tick, bump] = useState(0)
  const [sure, setSure] = useState(null)
  const [more, setMore] = useState(false)
  const [paging, setPaging] = useState(false)
  const [count, setCount] = useState(PAGE)
  const next = useRef(0)
  const epoch = useRef(0)
  const rowsRef = useRef([])
  rowsRef.current = rows || []
  const opened = useRef(false)
  const signedIn = Boolean(account.user)
  const uid = account.user?.id || null
  const focused = useIsFocused()
  const loadedAt = useRef(0)

  // force: read the first page again. Without it the last read is reused
  // while its links are fresh, so coming back does not download it all again.
  const load = useCallback(
    (force = true) => {
      const mine = (epoch.current += 1)
      setMiss('')
      setPaging(false)
      const cached = force ? null : cachedLibrary(uid)
      return (cached ? Promise.resolve(cached) : loadLibrary().then((out) => ({ ...out, at: Date.now() })))
        .then((out) => {
          if (mine !== epoch.current) return
          loadedAt.current = out.at
          next.current = out.next
          gone.clear()
          setRows(out.rows)
          setMore(out.more)
          setCount(PAGE)
          setMiss(out.miss)
          if (!cached && !out.miss && out.rows.length) keepLibrary(uid, { at: out.at, rows: out.rows, next: out.next, more: out.more })
        })
        .catch(() => mine === epoch.current && (setRows([]), setMiss('people.reach')))
    },
    [uid],
  )
  useEffect(() => {
    // Another account's photos never show under this one, even if this load fails.
    setRows(null)
    setMiss('')
    setMore(false)
    setCount(PAGE)
    loadedAt.current = 0
    next.current = 0
    gone.clear()
    photoList.rows = []
    photoList.uid = uid
    if (uid) load(false)
    else clearLibrary()
    return () => {
      epoch.current += 1
    }
  }, [uid, load])
  useEffect(() => {
    // Signed links last an hour; reload on return when they are getting old.
    if (focused && uid && loadedAt.current && Date.now() - loadedAt.current > PROOF_STALE_MS) load()
  }, [focused, uid, load])
  useEffect(() => setCount(PAGE), [filter, by])
  useEffect(() => {
    const redraw = () => bump((n) => n + 1)
    goneWatchers.add(redraw)
    return () => goneWatchers.delete(redraw)
  }, [])

  const shown = useMemo(
    () => (rows || []).filter((row) => !gone.has(row.id) && (filter === 'all' || row.kind === filter)),
    [rows, filter, tick],
  )
  const visible = shown.length > count ? shown.slice(0, count) : shown
  const hidden = shown.length - visible.length
  const groups = useMemo(() => groupRows(visible, by, nameOf), [visible, by, account.user?.id])
  const size = Math.floor((win.width - 40 - GAP * (COLUMNS - 1)) / COLUMNS)

  // The viewer swipes through every loaded photo, not only the ones drawn.
  function open(row) {
    photoList.rows = groupRows(shown, by, nameOf).flatMap((group) => group.rows)
    photoList.uid = uid
    goHash('/photo', { id: row.id })
  }

  function loadMore() {
    if (paging || !more) return
    const mine = epoch.current
    setPaging(true)
    loadLibrary({ from: next.current })
      .then((out) => {
        if (mine !== epoch.current) return
        if (out.miss) return confirmMiss(t(out.miss))
        const seen = new Set(rowsRef.current.map((row) => row.id))
        const merged = [...rowsRef.current, ...out.rows.filter((row) => !seen.has(row.id))]
        next.current = out.next
        setRows(merged)
        setMore(out.more)
        keepLibrary(uid, { at: loadedAt.current, rows: merged.filter((row) => !gone.has(row.id)), next: out.next, more: out.more })
      })
      .catch(() => mine === epoch.current && confirmMiss(t('people.reach')))
      .finally(() => setPaging(false))
  }
  function showMore() {
    setCount((n) => n + PAGE)
    if (more && hidden < PAGE * 2) loadMore()
  }

  // A push that says "added a photo" lands on that photo once the library is read.
  useEffect(() => {
    if (!openId || opened.current || !rows) return
    opened.current = true
    const row = rows.find((item) => item.id === openId)
    if (row) {
      open(row)
      return
    }
    // Past the pages read so far: read that one photo.
    loadLibraryRow(openId)
      .then((one) => {
        if (!one) return confirmMiss(t('proof.gone'))
        clearLibrary()
        photoList.rows = [one]
        photoList.uid = uid
        return goHash('/photo', { id: one.id })
      })
      .catch(() => confirmMiss(t('proof.gone')))
  }, [rows])

  function askDeleteAll() {
    setSure({
      kicker: t('photos.title'),
      title: t('photos.deleteAllTitle'),
      body: t('photos.deleteAllBody'),
      yes: t('photos.deleteAll'),
      danger: true,
    })
  }
  function deleteAll() {
    setSure(null)
    return once('photos-delete-all', async () => {
      const out = await removeAllProofs()
      if (out.miss) {
        load()
        return confirmMiss(t('photos.deleteAllFail'))
      }
      confirmDone(t('photos.deleteAllDone'))
      return load()
    })
  }

  let body
  if (!signedIn) {
    body = (
      <EmptyCard title={t('photos.emptyTitle')} body={t('photos.signIn')} colors={colors}>
        <DidButton small label={t('we.signIn')} onPress={() => goHash('/account')} colors={colors} />
      </EmptyCard>
    )
  } else if (rows === null) {
    body = <Meta colors={colors}>{t('photos.loading')}</Meta>
  } else if (miss) {
    body = (
      <EmptyCard title={t(miss)} colors={colors}>
        <KeyButton colors={colors} label={t('boot.retry')} onPress={() => load()} />
      </EmptyCard>
    )
  } else if (!rows.length) {
    body = (
      <EmptyCard title={t('photos.emptyTitle')} body={t('photos.emptyBody')} colors={colors}>
        <DidButton small label={t('nav.home')} onPress={() => goHash('/tonight')} colors={colors} />
      </EmptyCard>
    )
  } else {
    body = (
      <>
        <View style={styles.keys}>
          {FILTERS.map(([id, key]) => (
            <View key={id} style={styles.key}>
              <KeyButton colors={colors} label={t(key)} picked={filter === id} onPress={() => setFilter(id)} />
            </View>
          ))}
        </View>
        <View style={styles.keys}>
          {[
            ['question', 'photos.byQuestion'],
            ['person', 'photos.byPerson'],
          ].map(([id, key]) => (
            <View key={id} style={styles.key}>
              <KeyButton colors={colors} label={t(key)} picked={by === id} onPress={() => setBy(id)} />
            </View>
          ))}
        </View>
        {groups.length ? (
          groups.map((group) => (
            <View key={group.key} style={styles.group}>
              <Text style={[styles.label, { color: colors.inkDim }]} numberOfLines={2} accessibilityRole="header">
                {group.title}
              </Text>
              <View style={styles.grid}>
                {group.rows.map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => open(row)}
                    accessibilityRole="button"
                    accessibilityLabel={t('photos.thumbA11y', { name: nameOf(row), day: formatBoardDate(row.night) })}
                  >
                    <Image
                      source={{ uri: row.url }}
                      resizeMethod="resize"
                      accessibilityIgnoresInvertColors
                      style={{ width: size, height: size, borderRadius: 8, backgroundColor: colors.panel2 }}
                    />
                    <Meta colors={colors}>{by === 'person' ? formatBoardDate(row.night) : nameOf(row)}</Meta>
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        ) : (
          <EmptyCard title={t('photos.emptyFilter')} colors={colors} />
        )}
        {hidden > 0 || more ? (
          <KeyButton colors={colors} label={t('list.more', { n: hidden > 0 ? Math.min(hidden, PAGE) : PAGE })} disabled={paging} onPress={showMore} />
        ) : null}
        {rows.some((row) => row.owner_id === uid) ? <KeyButton danger colors={colors} label={t('photos.deleteAll')} onPress={askDeleteAll} /> : null}
      </>
    )
  }

  return (
    <BoardShell book={currentBook(readShelf())} title={t('photos.title')} colors={colors} showCogs onRefresh={signedIn ? () => load() : null}>
      <View style={styles.page}>{body}</View>
      <SureModal sure={sure} colors={colors} onClose={() => setSure(null)} onGo={deleteAll} />
    </BoardShell>
  )
}

/** One photo full width, swipe for the next. The actions are in a sheet. */
export function PhotoViewScreen({ id, book, onChange }) {
  const colors = useHallColors()
  const nameOf = useNameOf()
  const uid = useAccount().user?.id
  const list = useRef(null)
  const [, bump] = useState(0)
  const [width, setWidth] = useState(0)
  const cheer = useWeCheer(book, onChange)
  const [cheerFor, setCheerFor] = useState('')
  const rows = photoList.uid === uid ? photoList.rows.filter((row) => !gone.has(row.id)) : []
  const start = Math.max(0, rows.findIndex((row) => row.id === id))
  const [at, setAt] = useState(start)
  const row = rows[Math.min(at, rows.length - 1)]

  useEffect(() => {
    if (!rows.length) goBack()
  }, [rows.length])
  useEffect(() => onRoute(() => bump((n) => n + 1)), [])

  if (!row) return null
  const mine = row.owner_id === uid
  const name = nameOf(row)
  const done = () => {
    forget(row.id)
    bump((n) => n + 1)
  }
  const reopen = () => options()
  function options() {
    const act = (run) => () => {
      publishSheet(null)
      run()
    }
    publishSheet({
      bottom: true,
      title: t('photos.options'),
      colors,
      closeLabel: t('proof.close'),
      onClose: () => publishSheet(null),
      content: (
        <View style={styles.actions}>
          <KeyButton colors={colors} label={t('photos.share')} onPress={act(() => shareProof(row))} />
          {canSaveProof() ? <KeyButton colors={colors} label={t('photos.save')} onPress={act(() => saveProof(row, colors))} /> : null}
          {mine ? (
            <KeyButton danger colors={colors} label={t('proof.remove')} onPress={act(() => askRemoveProof({ row, colors, back: reopen, onGone: done }))} />
          ) : (
            <KeyButton danger colors={colors} label={t('proof.report')} onPress={act(() => askReportProof({ row, colors, back: reopen, onGone: done }))} />
          )}
        </View>
      ),
    })
  }

  return (
    <BoardShell book={currentBook(readShelf())} title={mine ? t('proof.yours') : t('proof.from', { name })} colors={colors} showCogs={false}>
      <View style={styles.page} onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}>
        {width ? (
          <FlatList
            ref={list}
            data={rows}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={start}
            getItemLayout={(_data, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={(event) => setAt(Math.round(event.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.url }}
                resizeMode="contain"
                accessibilityLabel={t('proof.viewA11y', { name: nameOf(item) })}
                accessibilityIgnoresInvertColors
                style={{ width, height: Math.round(width * 1.25), backgroundColor: colors.panel2, borderRadius: 12 }}
              />
            )}
          />
        ) : null}
        <Text style={[styles.who, { color: colors.ink }]}>{name}</Text>
        {row.question ? <Text style={[styles.what, { color: colors.inkSoft }]}>{row.question}</Text> : null}
        <Meta colors={colors}>{`${formatBoardDate(row.night)}  ·  ${t('photos.of', { n: Math.min(at, rows.length - 1) + 1, total: rows.length })}`}</Meta>
        {!mine && cheer.can ? (
          <KeyButton
            colors={colors}
            label={t('we.cheerName', { name })}
            disabled={Boolean(cheer.busy)}
            onPress={() => {
              setCheerFor(row.id)
              cheer.cheer({ id: row.owner_id, name }, row.question)
            }}
          />
        ) : null}
        {cheerFor === row.id && cheer.note ? <Meta colors={colors}>{cheer.note}</Meta> : null}
        {cheerFor === row.id && cheer.miss ? <Text style={[styles.what, { color: colors.miss }]}>{cheer.miss}</Text> : null}
        <DidButton label={t('photos.options')} onPress={options} colors={colors} />
      </View>
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  page: { gap: 12 },
  keys: { flexDirection: 'row', gap: 8 },
  key: { flex: 1 },
  group: { gap: 6 },
  label: { ...sectionLabel },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  actions: { gap: 8 },
  who: { fontFamily: fonts.uiSemi, fontSize: 17 },
  what: { fontFamily: fonts.ui, fontSize: 15 },
})
