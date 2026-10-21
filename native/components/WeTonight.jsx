import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { PersonAvatar } from './PersonAvatar.jsx'
import { useAccount } from '../../src/lib/account.js'
import { pullAndMerge } from '../../src/lib/cloud-sync.js'
import {
  useWeTonight,
  weAnswer,
  weCheerStageIfDone,
  weClaim,
  weGoal,
  weMine,
  weNotTonightLine,
  weReply,
  weStreak,
  weTimeReady,
  wePausedCards,
  weRestart,
} from '../../src/lib/did-we.js'
import { weFaceFor, weFaceRow, weMissKey, wePersonKey, weSlotDay, weStatus, weWeekKey } from '../../src/lib/we-look.js'
import { refreshTogether } from '../../src/lib/people.js'
import { onTogetherSaved, readTogetherPeople } from '../../src/lib/together-widget.js'
import { pressFx } from '../lib/motion.jsx'
import { SwipeCardHost } from './SwipeCardHost.jsx'
import { clockWords } from '../../src/lib/hall-pages.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { fireCheer, normalizePurse } from '../../src/lib/purse.js'
import { goHash } from '../navigation/hash.js'
import { confirmDone, confirmMiss } from '../lib/confirm.js'
import { feelTap } from '../../src/lib/native.js'
import { fonts } from '../theme.js'
import { readPrefs } from '../../src/lib/prefs.js'
import { DidButton, KeyButton } from './ui.jsx'
import { MarkStamp } from './SwipeFace.jsx'


const FACES_SHOWN = 5

// One person: their buddy if they wear one, else their initials. The ring
// lights up on a did and marks whose turn it is; someone only asked is faded.
// The people you know carry the photo and buddy that a card's people may lack
// (the same list the Friends row reads, kept by the Together widget).
function useKnownFaces() {
  const [people, setPeople] = useState(() => readTogetherPeople())
  useEffect(() => {
    refreshTogether().catch(() => {})
    return onTogetherSaved(() => setPeople(readTogetherPeople()))
  }, [])
  return useMemo(() => new Map(people.map((p) => [String(p.id || ''), p])), [people])
}

function WeFace({ person: raw, card, colors, known, size = 30 }) {
  const person = weFaceFor(raw, known)
  const lit = person.status === 'did'
  const turn = card.mode === 'turns' && card.turn === person.id
  const tint = colors.we || colors.on
  return (
    <PersonAvatar
      person={person}
      colors={colors}
      size={size}
      round
      done={lit}
      tint={tint}
      ring={turn ? tint : undefined}
      faded={person.state === 'asked'}
    />
  )
}

function personLine(person, card) {
  if (person.state === 'asked') return t('we.pAsked')
  const bits = []
  if (card.mode === 'turns' && card.turn === person.id) bits.push(t(weWeekKey(card, 'we.tonightsTurn'), { day: weSlotDay(card, readPrefs().locale) }))
  bits.push(t(wePersonKey(card, person.status), { day: weSlotDay(card, readPrefs().locale) }))
  return bits.join(' · ')
}

// Everyone on the card as a row of faces (first five, then +N). Tap to see
// the whole list: who, their buddy, and where they are tonight. With cheer
// (useWeCheer), anyone who said did tonight gets a Cheer button.
// Under each face a dot for tonight: filled = did, ring = not yet, empty = no answer.
function WeDot({ dot, colors }) {
  const tint = colors.we || colors.on
  return (
    <View
      style={[
        styles.dot,
        dot === 'did'
          ? { backgroundColor: tint, borderColor: tint }
          : dot === 'notYet'
            ? { backgroundColor: 'transparent', borderColor: tint }
            : { backgroundColor: 'transparent', borderColor: colors.line },
      ]}
    />
  )
}

export function WeFaces({ card, colors, cheer, dots = true }) {
  const [open, setOpen] = useState(false)
  const known = useKnownFaces()
  const { shown, more } = weFaceRow(card, FACES_SHOWN)
  const listed = card.people || []
  const showDots = dots && card.due
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('we.onCard')}: ${t('we.countLine', { n: card.dids, total: card.total })}`}
        hitSlop={6}
        style={styles.faces}
      >
        {shown.map(({ person, dot }) => (
          <View key={person.id} style={styles.slot}>
            <WeFace person={person} card={card} colors={colors} known={known} />
            {showDots ? <WeDot dot={dot} colors={colors} /> : null}
          </View>
        ))}
        {more ? (
          <View style={styles.slot}>
            <View style={[styles.face, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
              <Text style={[styles.faceText, { color: colors.inkSoft }]} numberOfLines={1}>
                {t('we.more', { n: more })}
              </Text>
            </View>
          </View>
        ) : null}
      </Pressable>
      {open ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={() => setOpen(false)}>
            <Pressable
              accessible={false}
              onPress={(event) => event.stopPropagation()}
              style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
            >
              <Text style={[styles.popKicker, { color: colors.inkDim }]}>{t('we.onCard')}</Text>
              <Text style={[styles.question, { color: colors.ink }]}>{card.question}</Text>
              <ScrollView style={styles.popList}>
                {listed.map((person) => (
                  <View key={person.id} style={[styles.popRow, { borderTopColor: colors.line }]}>
                    <WeFace person={person} card={card} colors={colors} known={known} size={40} />
                    <View style={styles.popCopy}>
                      <Text style={[styles.question, { color: colors.ink }]}>{person.me ? t('we.you') : person.name}</Text>
                      <Text style={[styles.meta, { color: colors.inkDim }]}>{personLine(person, card)}</Text>
                    </View>
                    {cheer?.can && !person.me && person.state === 'in' && person.status === 'did' ? (
                      <KeyButton
                        colors={colors}
                        label={t('we.cheer')}
                        disabled={Boolean(cheer.busy)}
                        onPress={() => cheer.cheer(person)}
                      />
                    ) : null}
                  </View>
                ))}
              </ScrollView>
              {card.shows === 'count' && card.total > listed.length ? (
                <Text style={[styles.meta, { color: colors.inkDim }]}>
                  {t('we.pCountOnly', { n: card.total - listed.length })}
                </Text>
              ) : null}
              <Text style={[styles.meta, { color: colors.inkSoft }]}>{weStatusLine(card)}</Text>
              {cheer?.note ? <Text style={[styles.meta, { color: colors.inkSoft }]}>{cheer.note}</Text> : null}
              {cheer?.miss ? (
                <Text style={[styles.meta, { color: colors.miss }]} accessibilityRole="alert">
                  {cheer.miss}
                </Text>
              ) : null}
              <KeyButton colors={colors} label={t('settings.close')} onPress={() => setOpen(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  )
}

// Where each person is tonight, as small chips: "You: Did", "Jo: Waiting".
// The server already hides what the card's rules keep private (a nope under
// "waiting", every name under "count"), so a hidden answer reads as waiting
// and a count card lists only you, then the count.
const STATE_KEY = { did: 'we.did', nope: 'we.nope', waiting: 'we.a.waiting' }

export function WeAnswers({ card, colors }) {
  const known = useKnownFaces()
  const people = (card.people || []).filter((p) => p.state === 'in' && (card.shows !== 'count' || p.me))
  if (!people.length) return null
  const tint = colors.we || colors.on
  return (
    <View style={styles.answers}>
      {people.map((person) => {
        const state = person.status === 'did' ? 'did' : person.status === 'nope' ? 'nope' : 'waiting'
        const label = t('we.pAnswer', { name: person.me ? t('we.you') : person.name, state: t(STATE_KEY[state]) })
        return (
          <View
            key={person.id}
            accessible
            accessibilityLabel={label}
            style={[
              styles.answer,
              {
                borderColor: state === 'did' ? tint : colors.line,
                backgroundColor: state === 'did' ? colors.panel2 : 'transparent',
              },
            ]}
          >
            <WeFace person={person} card={card} colors={colors} known={known} size={18} />
            <Text style={[styles.answerText, { color: state === 'waiting' ? colors.inkDim : colors.ink }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        )
      })}
      {card.shows === 'count' ? (
        <Text style={[styles.meta, styles.answerCount, { color: colors.inkSoft }]}>
          {t('we.countLine', { n: card.dids, total: card.total })}
        </Text>
      ) : null}
    </View>
  )
}

export function weStatusLine(card) {
  const { key, vars } = weStatus(card, readPrefs().locale)
  return t(key, vars)
}

// Done for tonight: a soft wash of the Did we color on the card.
export function weDoneStyle(card, colors) {
  return card.due && card.done ? { backgroundColor: colors.weSoft || colors.panel2, borderColor: colors.we || colors.on } : null
}

// Did we asks waiting on you, for the inbox. Nothing when there are none.
export function WeAsks({ colors }) {
  const account = useAccount()
  const { cards, reload } = useWeTonight(account.user)
  const [busy, setBusy] = useState('')
  const [miss, setMiss] = useState('')
  // State lags a frame: a double tap would send twice without this.
  const sending = useRef(false)
  const asks = cards.filter((card) => card.myState === 'asked')
  if (!asks.length) return null

  async function reply(card, yes) {
    if (sending.current) return
    sending.current = true
    setBusy(card.id)
    const out = await weReply(card.id, yes).catch(() => ({ miss: 'confirm.miss' }))
    sending.current = false
    setBusy('')
    setMiss(out.miss ? tMiss(out.miss) : '')
    if (!out.miss) confirmDone(t(yes ? 'confirm.weJoined' : 'confirm.weDeclined'))
    reload()
  }

  return (
    <View style={[styles.wrap, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={styles.head}>
        <Text style={[styles.label, { color: colors.ink }]}>{t('we.asksTitle')}</Text>
      </View>
      {asks.map((card) => (
        <View key={card.id} style={[styles.row, { borderTopColor: colors.line }]}>
          <View style={styles.copy}>
            <Text style={[styles.meta, { color: colors.inkDim }]}>
              {card.askedBy ? t('we.askedBy', { name: card.askedBy }) : t('we.asked')}
            </Text>
            <Text style={[styles.question, { color: colors.ink }]}>{card.question}</Text>
            <Text style={[styles.meta, { color: colors.inkDim }]}>
              {t(`we.mode.${card.mode}`)} · {t(`we.shows.${card.shows}`)}
            </Text>
          </View>
          <DidButton colors={colors} small label={t('we.join')} disabled={busy === card.id} onPress={() => reply(card, true)} />
          <KeyButton colors={colors} label={t('we.noThanks')} disabled={busy === card.id} onPress={() => reply(card, false)} />
        </View>
      ))}
      {miss ? (
        <Text style={[styles.note, { color: colors.miss }]} accessibilityRole="alert">
          {miss}
        </Text>
      ) : null}
    </View>
  )
}

// Answering a Did we, shared by the panel and the swipe card on Tonight.
// Tapping the answer you already gave takes it back.
export function useWeAnswer(reload, book) {
  const [busy, setBusy] = useState('')
  const [miss, setMiss] = useState('')
  const [note, setNote] = useState('')
  // State lags a frame: a double tap would answer (and cheer, and claim) twice.
  const sending = useRef(false)

  async function run(id, job) {
    setBusy(id)
    let out
    try {
      out = await job()
    } catch {
      out = { miss: 'confirm.miss' }
    }
    setBusy('')
    setMiss(out?.miss ? tMiss(out.miss) : '')
    reload()
    return out
  }

  // `night` answers a later night early; tonight when left out.
  async function answer(card, status, night) {
    const mine = weMine(card)
    // A repeat tap on tonight's lit answer does nothing: a Did we answer has
    // no undo, so it must not clear by accident. Taking back is explicit.
    if (!night && status && mine?.status === status) return
    // One answer at a time: a second tap while one is sending does nothing.
    if (busy || sending.current) return
    sending.current = true
    try {
      await answerNow(card, status, night)
    } finally {
      sending.current = false
    }
  }

  async function answerNow(card, status, night) {
    const next = status
    const out = await run(card.id, () => weAnswer(card.id, next, night || undefined))
    // A Did we answer has no undo: it says it was saved, or that it was not.
    if (out?.miss) {
      confirmMiss(tMiss(weMissKey(card, out.miss)))
      return
    }
    if (next) {
      feelTap(next === 'nope' ? 'skip' : 'did')
      confirmDone(t('tonight.weSaved'))
    }
    // Only the answer that finished it cheers; card.done may be stale.
    if (!out.finished) return
    const purse = normalizePurse(book)
    if (purse.cheerOn) fireCheer(purse.cheerOn, weCheerStageIfDone(card))
    const claim = () => weClaim(card.id, night || undefined).catch(() => ({ miss: 'confirm.miss', coins: 0 }))
    let paid = await claim()
    if (paid.miss) paid = await claim()
    if (paid.miss) {
      confirmMiss(tMiss(paid.miss))
      return
    }
    if (paid.coins > 0) {
      setNote(t('we.coins', { n: paid.coins }))
      pullAndMerge().catch(() => {})
    }
  }

  return { busy, miss, note, run, answer }
}

// Due tonight, not done, and you have not answered: what the swipe card asks.
// Open Did wes for tonight. `early` also takes ones whose ask time has not
// come yet (answering early is fine; the time only sets the reminder), with
// the ready ones first. Only ever cards asked on this night (card.due).
export function weOpenForMe(cards, now = new Date(), { early = false } = {}) {
  const open = (cards || []).filter(
    (card) => card.myState === 'in' && card.due && !card.done && !weMine(card)?.status,
  )
  if (!early) return open.filter((card) => weTimeReady(card, now))
  return [...open.filter((card) => weTimeReady(card, now)), ...open.filter((card) => !weTimeReady(card, now))]
}

function weKicker(card) {
  return weTimeReady(card) ? card.folder || t('we.title') : t('we.asksAt', { time: clockWords(card.askAfter) })
}

// The Tonight card for a Did we: swipe right for did, left for nope, the
// other open ones stacked behind.
// frame: the worn card frame, the same as on your own cards.
// picked: a Did we tapped in the pills. It shows even once answered, with a
// Did or Not yet stamp, and can't be answered twice.
export function WeSwipeCard({ cards, colors, onAnswer, panelStyle, gemLook, buddy, frame = null, picked = null }) {
  const open = picked ? [picked] : weOpenForMe(cards, new Date(), { early: true })
  if (!open.length) return null
  const card = open[0]
  const mine = picked ? weMine(card)?.status || '' : ''
  const locked = Boolean(mine) || Boolean(picked && card.done)
  // Did we wears its own accent, so a shared card reads apart from your own.
  const weColors = { ...colors, on: colors.we || colors.on, line: colors.we || colors.line, onDeep: colors.weDeep || colors.onDeep }
  return (
    <SwipeCardHost
      key="we-face"
      cardKey={`we:${card.id}`}
      colors={weColors}
      panelStyle={panelStyle}
      gemLook={gemLook}
      head={
        <>
          <MarkStamp status={mine === 'did' ? 'yes' : mine === 'nope' ? 'skip' : ''} colors={weColors} beside={Boolean(buddy)} />
        <View style={styles.swipeHead}>
          <WeFaces card={card} colors={colors} />
        </View>
        </>
      }
      kicker={weKicker(card)}
      title={card.question}
      stampDid={t('tonight.swipeDid')}
      stampNope={t('tonight.swipeNope')}
      behind={open.slice(1).map((next) => ({ key: `we:${next.id}`, kicker: weKicker(next), title: next.question }))}
      onDid={() => onAnswer(card, 'did')}
      onNope={() => onAnswer(card, 'nope')}
      blockDid={locked}
      blockNope={locked}
      onEdit={picked ? () => goHash('/we', { id: card.id }) : undefined}
      buddy={buddy}
      frame={frame}
    >
      <View style={styles.swipeFoot}>
        <Text style={[styles.meta, { color: colors.inkSoft }]} numberOfLines={1}>
          {weStatusLine(card)}
        </Text>
        {weStreak(card) > 0 ? (
          <Text style={[styles.meta, { color: colors.inkDim }]}>{t('we.streak', { n: weStreak(card) })}</Text>
        ) : null}
      </View>
    </SwipeCardHost>
  )
}

// Did wes nobody answered for 3 nights. They stop asking until a member
// restarts one. Nothing when none is paused.
export function WePausedRow({ cards, colors, reload }) {
  const [busy, setBusy] = useState('')
  const [miss, setMiss] = useState('')
  const sending = useRef(false)
  const paused = wePausedCards(cards)
  if (!paused.length) return null

  async function restart(card) {
    if (sending.current) return
    sending.current = true
    setBusy(card.id)
    const out = await weRestart(card.id).catch(() => ({ miss: 'confirm.miss' }))
    sending.current = false
    setBusy('')
    setMiss(out.miss ? tMiss(out.miss) : '')
    if (!out.miss) confirmDone(t('we.restarted'))
    // A miss may mean someone else already restarted or left it: show what is true now.
    reload()
  }

  return (
    <View style={[styles.wrap, styles.pausedWrap, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      {paused.map((card, i) => (
        <View key={card.id} style={[styles.row, i ? { borderTopColor: colors.line } : { borderTopWidth: 0 }]}>
          <View style={styles.copy}>
            <Text style={[styles.question, { color: colors.ink }]} numberOfLines={2}>
              {card.question}
            </Text>
            <Text style={[styles.meta, { color: colors.inkDim }]}>{t(weWeekKey(card, 'we.paused'))}</Text>
          </View>
          <KeyButton colors={colors} label={t('we.restart')} disabled={busy === card.id} onPress={() => restart(card)} />
        </View>
      ))}
      {miss ? (
        <Text style={[styles.note, { color: colors.miss }]} accessibilityRole="alert">
          {miss}
        </Text>
      ) : null}
    </View>
  )
}

// Your shared questions, for People. Each opens its page, where you answer,
// nudge, and see the streak. Nothing when you have none.
export function WeList({ colors }) {
  const account = useAccount()
  const { cards } = useWeTonight(account.user)
  const live = cards.filter((card) => card.myState === 'in')
  if (!live.length) return null

  return (
    <View style={[styles.wrap, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      {live.map((card, at) => {
        const streak = weStreak(card)
        const goal = weGoal(card)
        return (
          <Pressable
            key={card.id}
            accessibilityRole="button"
            onPress={() => goHash('/we', { id: card.id })}
            style={[styles.row, at ? { borderTopColor: colors.line } : { borderTopWidth: 0 }, weDoneStyle(card, colors)]}
          >
            <View style={styles.copy}>
              <WeFaces card={card} colors={colors} />
              <Text style={[styles.question, { color: colors.ink }]}>{card.question}</Text>
              <Text style={[styles.status, { color: card.done && card.due ? colors.we || colors.on : colors.ink }]} numberOfLines={1}>
                {card.paused ? t(weWeekKey(card, 'we.paused')) : card.due ? weStatusLine(card) : weNotTonightLine(card, readPrefs().locale)}
              </Text>
              {card.folder || streak > 0 || goal ? (
                <Text style={[styles.meta, { color: colors.inkDim }]} numberOfLines={1}>
                  {[card.folder, streak > 0 ? t('we.streak', { n: streak }) : '', goal ? t(weWeekKey(card, 'we.goalLine'), { n: goal.done, goal: goal.goal }) : '']
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  head: { padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: fonts.uiSemi, fontSize: 14 },
  empty: { fontFamily: fonts.ui, fontSize: 13, paddingHorizontal: 12, paddingBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1 },
  copy: { flexBasis: '100%', gap: 6 },
  question: { fontFamily: fonts.uiSemi, fontSize: 15 },
  meta: { fontFamily: fonts.ui, fontSize: 12 },
  faces: { flexDirection: 'row', flexWrap: 'nowrap', gap: 4, alignSelf: 'flex-start' },
  slot: { alignItems: 'center', gap: 3 },
  dot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  status: { fontFamily: fonts.uiSemi, fontSize: 13 },
  swipeHead: { marginBottom: 10 },
  face: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10, maxHeight: '80%' },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  popList: { flexGrow: 0 },
  popRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1 },
  popCopy: { flex: 1, gap: 2 },
  faceText: { fontFamily: fonts.uiSemi, fontSize: 11 },
  note: { fontFamily: fonts.ui, fontSize: 13, padding: 12 },
  swipeFoot: { alignItems: 'center', gap: 6, marginTop: 10 },
  pausedWrap: { marginTop: 8 },
  answers: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  answer: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingLeft: 3, paddingRight: 9, paddingVertical: 3, maxWidth: '100%' },
  answerText: { fontFamily: fonts.uiSemi, fontSize: 12, flexShrink: 1 },
  slimFaces: { flexDirection: 'row' },
  slimSlot: { marginRight: 2 },
  slimCopy: { flex: 1, minWidth: 0 },
  slimQ: { fontFamily: fonts.uiSemi, fontSize: 13 },
  slimStatus: { fontFamily: fonts.ui, fontSize: 12 },
  answerCount: { marginLeft: 2 },
})
