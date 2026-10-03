import { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BuddyPlain } from './BuddyArt.jsx'
import { useAccount } from '../../src/lib/account.js'
import { pullAndMerge } from '../../src/lib/cloud-sync.js'
import {
  useWeTonight,
  weAnswer,
  weCheerStageIfDone,
  weClaim,
  weGoal,
  weMine,
  weReply,
  weStreak,
  weTimeReady,
  weWaiting,
} from '../../src/lib/did-we.js'
import { SwipeCardHost } from './SwipeCardHost.jsx'
import { clockWords } from '../../src/lib/hall-pages.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { fireCheer, normalizePurse } from '../../src/lib/purse.js'
import { goHash } from '../navigation/hash.js'
import { confirmDone } from '../lib/confirm.js'
import { fonts } from '../theme.js'
import { DidButton, KeyButton } from './ui.jsx'

function initials(name) {
  const parts = String(name || '').replace(/^@/, '').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

const FACES_SHOWN = 5

// One person: their buddy if they wear one, else their initials. The ring
// lights up on a did and marks whose turn it is; someone only asked is faded.
function WeFace({ person, card, colors, size = 30 }) {
  const lit = person.status === 'did'
  const turn = card.mode === 'turns' && card.turn === person.id
  const tint = colors.we || colors.on
  return (
    <View
      style={[
        styles.face,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: lit ? tint : colors.panel2,
          borderColor: turn || lit ? tint : colors.line,
          opacity: person.state === 'asked' ? 0.5 : 1,
        },
      ]}
    >
      {person.buddy ? (
        <BuddyPlain id={person.buddy} width={size * 0.72} height={size * 0.86} />
      ) : (
        <Text style={[styles.faceText, { color: lit ? colors.bg : colors.inkSoft }]}>{initials(person.name)}</Text>
      )}
    </View>
  )
}

function personLine(person, card) {
  if (person.state === 'asked') return t('we.pAsked')
  const bits = []
  if (card.mode === 'turns' && card.turn === person.id) bits.push(t('we.tonightsTurn'))
  if (person.status === 'did') bits.push(t('we.pDid'))
  else if (person.status === 'nope') bits.push(t('we.pNope'))
  else bits.push(t('we.pWaiting'))
  return bits.join(' · ')
}

// Everyone on the card as a row of faces (first five, then +N). Tap to see
// the whole list: who, their buddy, and where they are tonight. With cheer
// (useWeCheer), anyone who said did tonight gets a Cheer button.
export function WeFaces({ card, colors, cheer }) {
  const [open, setOpen] = useState(false)
  const people = (card.people || []).filter((p) => p.state === 'in')
  const shown = people.slice(0, FACES_SHOWN)
  const more = Math.max(0, (card.total || people.length) - shown.length)
  const listed = card.people || []
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t('we.onCard')}: ${t('we.countLine', { n: card.dids, total: card.total })}`}
        hitSlop={6}
        style={styles.faces}
      >
        {shown.map((person) => (
          <WeFace key={person.id} person={person} card={card} colors={colors} />
        ))}
        {more ? (
          <View style={[styles.face, { backgroundColor: colors.panel2, borderColor: colors.line }]}>
            <Text style={[styles.faceText, { color: colors.inkSoft }]}>{t('we.more', { n: more })}</Text>
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
                    <WeFace person={person} card={card} colors={colors} size={40} />
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

export function weStatusLine(card) {
  if (card.done) return t('we.doneTogether')
  const waiting = weWaiting(card)
  if (card.mode === 'turns') {
    const whose = (card.people || []).find((p) => p.id === card.turn)
    if (!whose) return t('we.countLine', { n: card.dids, total: card.total })
    return whose.me ? t('we.yourTurn') : t('we.theirTurn', { name: whose.name })
  }
  if (card.shows !== 'count' && waiting.length) {
    return t('we.waitingOn', { names: waiting.map((p) => p.name).join(', ') })
  }
  return t('we.countLine', { n: card.dids, total: card.total })
}

// Did we asks waiting on you, for the inbox. Nothing when there are none.
export function WeAsks({ colors }) {
  const account = useAccount()
  const { cards, reload } = useWeTonight(account.user)
  const [busy, setBusy] = useState('')
  const [miss, setMiss] = useState('')
  const asks = cards.filter((card) => card.myState === 'asked')
  if (!asks.length) return null

  async function reply(card, yes) {
    setBusy(card.id)
    const out = await weReply(card.id, yes)
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

  async function run(id, job) {
    setBusy(id)
    const out = await job()
    setBusy('')
    setMiss(out?.miss ? tMiss(out.miss) : '')
    reload()
    return out
  }

  // `night` answers a later night early; tonight when left out.
  async function answer(card, status, night) {
    const mine = weMine(card)
    const next = mine?.status === status ? null : status
    const out = await run(card.id, () => weAnswer(card.id, next, night || undefined))
    if (out.miss || !out.done || card.done) return
    const purse = normalizePurse(book)
    if (purse.cheerOn) fireCheer(purse.cheerOn, weCheerStageIfDone(card))
    const paid = await weClaim(card.id, night || undefined)
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
  return weTimeReady(card) ? t('we.title') : t('we.asksAt', { time: clockWords(card.askAfter) })
}

// The Tonight card for a Did we: swipe right for did, left for nope, the
// other open ones stacked behind.
export function WeSwipeCard({ cards, colors, onAnswer, panelStyle, gemLook, buddy }) {
  const open = weOpenForMe(cards, new Date(), { early: true })
  if (!open.length) return null
  const card = open[0]
  // Did we wears its own accent, so a shared card reads apart from your own.
  const weColors = { ...colors, on: colors.we || colors.on, line: colors.we || colors.line, onDeep: colors.weDeep || colors.onDeep }
  return (
    <SwipeCardHost
      key="we-face"
      cardKey={`we:${card.id}`}
      colors={weColors}
      panelStyle={panelStyle}
      gemLook={gemLook}
      kicker={weKicker(card)}
      title={card.question}
      stampDid={t('tonight.swipeDid')}
      stampNope={t('tonight.swipeNope')}
      behind={open.slice(1).map((next) => ({ key: `we:${next.id}`, kicker: weKicker(next), title: next.question }))}
      onDid={() => onAnswer(card, 'did')}
      onNope={() => onAnswer(card, 'nope')}
      buddy={buddy}
    >
      <View style={styles.swipeFoot}>
        <WeFaces card={card} colors={colors} />
        <Text style={[styles.meta, { color: colors.inkSoft }]}>{weStatusLine(card)}</Text>
      </View>
    </SwipeCardHost>
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
            style={[styles.row, at ? { borderTopColor: colors.line } : { borderTopWidth: 0 }]}
          >
            <View style={styles.copy}>
              <Text style={[styles.question, { color: colors.ink }]}>{card.question}</Text>
              <WeFaces card={card} colors={colors} />
              <Text style={[styles.meta, { color: card.done ? colors.on : colors.inkSoft }]}>
                {card.folder ? `${card.folder} · ` : ''}
                {card.due ? weStatusLine(card) : t('we.notTonight')}
                {streak > 0 ? ` · ${t('we.streak', { n: streak })}` : ''}
                {goal ? ` · ${t('we.goalLine', { n: goal.done, goal: goal.goal })}` : ''}
              </Text>
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
  faces: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignSelf: 'flex-start' },
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
})
