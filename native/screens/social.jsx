import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FadeScroll } from '../components/FadeScroll.jsx'
import { AppState, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { cloudSetUp, supabaseSqlUrl } from '../../src/lib/cloud.js'
import { canEditSent, cleanSentEdit, endDidYouLink, myDidYouLinks } from '../../src/lib/did-you-links.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { repeatLabel } from '../../src/lib/send-repeat.js'
import { sendAnswerLine } from '../../src/lib/send-answers.js'
import { copyText, dismissReadPushes, passAlong } from '../../src/lib/native.js'
import { holdFor } from '../../src/lib/cheer-pops.js'
import {
  INVITE_CODE_LEN,
  INVITE_GEMS_CAP,
  cleanInvite,
  formatInvite,
  invitePayoutNote,
  answerSend,
  reportSend,
  askByFriendId,
  needsName,
  cleanFriendId,
  editSend,
  formatFriendId,
  lookUpFriendId,
  myFriendId,
  blockPerson,
  partFamilies,
  sharedFamilies,
  claimInvites,
  cleanCode,
  doneTonight,
  friendLine,
  friendStreak,
  friendAskNote,
  friendAskTitle,
  inboxCount,
  joinFamily,
  lookUpFamily,
  familyCodeOk,
  listBlocks,
  listCheersGot,
  listFamilies,
  listFriends,
  listAutoAdds,
  listInbox,
  listSent,
  makeFamily,
  syncDisplayName,
  myInvite,
  personName,
  stillLinked,
  readMine,
  refreshPeople,
  sayNo,
  sayYes,
  sendCheer,
  buyCheers,
  cheerFriend,
  cheerFamily,
  readFriendCheers,
  setAutoAdd,
  shareStreak,
  personById,
  friendWeek,
  sendsWith,
  takeBack,
  unblockPerson,
  unsendAsk,
  usePeoplePulse,
  FRIEND_NOTE_MAX,
  readFriendNote,
  saveFriendNote,
  cheerTitle,
} from '../../src/lib/people.js'
import { sharedNotesFrom } from '../../src/lib/social-amounts.js'
import { keptProfileName } from '../../src/lib/cloud-sync.js'
import { onSocialLive } from '../../src/lib/social-live.js'
import {
  FRIEND_CHEER_CAP,
  FRIEND_CHEER_GEMS,
  FRIEND_CHEERS_PER_GEM,
  cheerText,
  fireCheer,
  friendCheerMissKey,
  applyInvitePayout,
  BUDDY_IDS,
  lookText,
  normalizePurse,
} from '../../src/lib/purse.js'
import { KEEP, useKept } from '../hooks/useKept.js'
import { useTourTarget } from '../lib/tour.js'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { isNewShelf } from '../../src/lib/first-run.js'
import { boardDate, dateTag, formatBoardDate, isoDate } from '../../src/lib/recurrence.js'
import { sendLastLine } from '../../src/lib/every-copy.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { confirmFriendCheers, offerMoreGems, publishSheet } from '../components/SheetHost.jsx'
import { pickCheer } from '../components/pickCheer.jsx'
import { InviteCodeSection } from '../components/InviteCodeSection.jsx'
import { InviteCard } from '../components/InviteCard.jsx'
import { copyInviteLink, shareInvite } from '../lib/share-invite.js'
import { WeAsks } from '../components/WeTonight.jsx'
import { ReferLadder } from '../components/ReferLadder.jsx'
import { activeLook } from '../../src/lib/active-look.js'
import { Avatar, EmptyCard, PersonCard, SectionHead } from '../components/PersonCard.jsx'
import { SendSheet } from '../components/SendDidYou.jsx'
import { ProofRow } from '../components/ProofRow.jsx'
import { openProofView } from '../lib/proof-flow.jsx'
import { loadProofs } from '../../src/lib/proofs.js'
import { checkOnsFrom, minuteClock, stopCheckOn } from '../../src/lib/check-on.js'
import { askRemoveFriend } from '../components/removeFriend.js'
import { KitSegment } from '../components/KitSegment.jsx'
import { SetCard, SetRow, SetSwitch } from '../components/SetBits.jsx'
import {
  DidButton,
  Field,
  KeyButton,
  LateMeta,
  Meta, OfflineLine,
  Row,
} from '../components/ui.jsx'
import { useHallColors, useLookColors } from '../hooks/useHallColors.js'
import { FramePreview } from '../components/frames/FramePreview.jsx'
import { FRAME_IDS, frameText } from '../../src/lib/frames.js'
import { goHash, swapHash } from '../navigation/hash.js'
import { confirmDone, confirmMiss, once } from '../lib/confirm.js'
import { keptButMissing } from '../lib/kept-send.js'
import { FamilyDetailScreen } from './FamilyDetail.jsx'
import { nameFirst } from '../components/NameFirstSheet.jsx'
import { useNoted } from '../hooks/useNoted.js'
import { useLiveReload } from '../hooks/useLiveReload.js'
import { inviteLink } from '../../src/lib/invite-link.js'
import { LOOK_IDS, fonts, radius } from '../theme.js'
import { KeyboardLift } from '../components/KeyboardLift.jsx'
import { MenuIcon } from '../components/MenuIcon.jsx'
import { useAuthSignIn } from '../../src/lib/useAuthSignIn.js'
import { useWeTonight, weAskCount, weQuestion } from '../../src/lib/did-we.js'
import { didYouAsk } from '../../src/lib/link-preview.js'
import { AuthEmailCard } from '../components/AuthEmailCard.jsx'
import { QrCode } from '../components/QrCode.jsx'
import { friendQrLink, savePendingScan, scanFromText } from '../../src/lib/qr-links.js'
import * as Clipboard from 'expo-clipboard'
import { canScan } from './ScanScreen.jsx'
import { WeHomeList } from './we.jsx'
import { Reveal, pressFx } from '../lib/motion.jsx'

function ScreenShell({ book, title, children, colors }) {
  const live = book || currentBook(readShelf())
  const date = formatBoardDate(boardDate(new Date(), live.dayFoldHour))
  return (
    <BoardShell book={live} title={title} date={date} colors={colors}>
      {children}
    </BoardShell>
  )
}

// Paste: a friend ID or family code as copied, or the did-i.app link it came
// in (did-i.app/f/ID, /j/CODE), so nobody retypes it.
async function pastedCode(kind) {
  const text = await Clipboard.getStringAsync().catch(() => '')
  const found = scanFromText(text)
  if (kind === 'friend') return /^friend:(\d{12})$/.exec(found)?.[1] || (cleanFriendId(text).length === 12 ? cleanFriendId(text) : '')
  const family = /^family:([A-Z0-9]{6}|[A-Z0-9]{10})$/.exec(found)?.[1]
  if (family) return family
  const bare = String(text || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  return familyCodeOk(bare) ? bare : ''
}

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

function Miss({ children, colors, onRetry }) {
  if (!children) return null
  return (
    <>
      <Text style={[styles.miss, { color: colors.miss }]}>{children}</Text>
      {onRetry ? <KeyButton colors={colors} label={t('gift.retry')} onPress={onRetry} /> : null}
    </>
  )
}

function FriendMenu({ name, items, colors, onClose }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          accessible={false}
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.popKicker, { color: colors.on }]}>{name}</Text>
          {items.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => {
                onClose()
                item.onPress()
              }}
              style={({ pressed }) => [
                styles.menuRow,
                { borderColor: colors.lineSoft, backgroundColor: pressed ? colors.panel2 : 'transparent' },
              ]}
            >
              <Text style={[styles.menuRowText, { color: item.danger ? colors.miss : colors.ink }]}>{item.label}</Text>
            </Pressable>
          ))}
          <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function BlockModal({ person, colors, onClose, onDone }) {
  // undefined while reading; [] or null (read failed) means block only.
  const [fams, setFams] = useState(undefined)
  useEffect(() => {
    let live = true
    sharedFamilies(person.user_id).then(
      (rows) => live && setFams(rows),
      () => live && setFams(null),
    )
    return () => {
      live = false
    }
  }, [person.user_id])
  const shared = fams?.length ? fams : null
  const name = personName(person) || t('people.someone')
  const block = (why, part) =>
    once('block:' + person.user_id, async () => {
      onClose()
      const out = await blockPerson(person.user_id, why)
      if (out.miss) return onDone(out.miss)
      if (!part) return onDone('', why ? t('confirm.blockedReported') : '')
      onDone((await partFamilies(shared, person.user_id)).miss, why ? t('confirm.blockedReported') : '')
    })
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
        <Pressable
          accessible={false}
          style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
          onPress={(event) => event.stopPropagation()}
        >
          <Text style={[styles.popKicker, { color: colors.on }]}>{t('block.block')}</Text>
          <Text style={[styles.popTitle, { color: colors.ink }]}>
            {t('block.title', { name })}
          </Text>
          <Meta colors={colors}>{t('block.body')}</Meta>
          {shared ? (
            <Meta colors={colors}>{t('block.family', { name, families: shared.map((fam) => fam.name).join(', ') })}</Meta>
          ) : null}
          <View style={styles.personActions}>
            {fams === undefined ? null : shared ? (
              <>
                <DidButton
                  colors={colors}
                  small
                  label={t(shared.every((fam) => fam.parent) ? 'block.andRemove' : 'block.andLeave')}
                  onPress={() => block('', true)}
                />
                <KeyButton colors={colors} label={t('block.only')} onPress={() => block('', false)} />
              </>
            ) : (
              <DidButton colors={colors} small label={t('block.yes')} onPress={() => block('', false)} />
            )}
            {fams === undefined ? null : (
              <KeyButton colors={colors} label={t('block.andReport')} onPress={() => block('reported from friends', false)} />
            )}
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// Ask before a friend action that can not be taken back with one tap.
function askFirst(colors, title, body, goLabel, onGo) {
  publishSheet({
    title,
    body,
    goLabel,
    closeLabel: t('settings.neverMind'),
    colors,
    onClose: () => publishSheet(null),
    onGo: async () => {
      publishSheet(null)
      await onGo()
    },
  })
}

function PreviewRow({ icon, title, body, colors }) {
  return (
    <View style={[styles.previewRow, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={[styles.previewIcon, { backgroundColor: colors.panel2 }]}>
        <MenuIcon name={icon} color={colors.on} size={18} stroke />
      </View>
      <View style={styles.previewCopy}>
        <Text style={[styles.previewTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.previewBody, { color: colors.inkDim }]}>{body}</Text>
      </View>
    </View>
  )
}

// A new friend is the moment a Did we makes sense: offer one, once per person.
function offerWeWith(person, colors) {
  const id = person?.user_id
  if (!id) return
  const key = 'did-i-we-offered'
  let seen = []
  try {
    seen = JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    seen = []
  }
  if (seen.includes(id)) return
  try {
    localStorage.setItem(key, JSON.stringify([...seen, id].slice(-200)))
  } catch {
    // ok
  }
  const name = personName(person) || t('people.someone')
  publishSheet({
    // The friend is added already; this only offers a Did we. "Never mind"
    // read like undoing the friend, so the way out says not now.
    title: t('we.friendTitle', { name }),
    body: t('we.friendBoth'),
    goLabel: t('we.startWith', { name }),
    closeLabel: t('we.friendLater'),
    colors,
    onClose: () => publishSheet(null),
    onGo: () => {
      publishSheet(null)
      goHash('/we/new', { id })
    },
  })
}

// Signed out, People was a dead end. A preview of what it does, then the
// full sign-in (Apple, Google and email) right here.
function NeedAccount({ kicker, title, colors }) {
  const auth = useAuthSignIn({})
  const account = useAccount()
  // Still checking for a saved sign-in: loading, not the sign-in prompt.
  if (!account.ready) {
    return (
      <ScreenShell title={title} colors={colors}>
        <LateMeta colors={colors}>{t('family.loading')}</LateMeta>
      </ScreenShell>
    )
  }
  return (
    <ScreenShell title={title} colors={colors}>
      <Meta colors={colors}>{t('people.outBody')}</Meta>
      <Meta colors={colors}>{t('people.outComesAlong')}</Meta>
      <View style={styles.previewList}>
        <PreviewRow
          icon="people"
          title={t('people.previewCheerTitle')}
          body={t('people.previewCheerBody')}
          colors={colors}
        />
        <PreviewRow
          icon="home"
          title={t('people.previewFamilyTitle')}
          body={t('people.previewFamilyBody')}
          colors={colors}
        />
      </View>
      <AuthEmailCard colors={colors} auth={auth} body="" />
      <View style={styles.previewOther}>
        <KeyButton colors={colors} label={t('people.goAccount')} onPress={() => goHash('/account')} />
      </View>
    </ScreenShell>
  )
}

function CloudOff({ colors }) {
  return (
    <ScreenShell title={t('people.offTitle')} colors={colors}>
      <Meta colors={colors}>{t('people.offBody')}</Meta>
    </ScreenShell>
  )
}

function PersonRow({ title, note, colors, children, highlight, person }) {
  return (
    <View
      style={[
        styles.personRow,
        { borderColor: colors.line, backgroundColor: colors.panel },
        highlight ? styles.askRow : null,
      ]}
    >
      <View style={person ? styles.personHead : null}>
        {person ? <Avatar person={person} colors={colors} size={36} /> : null}
        <View style={[styles.personCopy, person ? styles.personCopyFlex : null]}>
          <Text style={[styles.personTitle, { color: colors.ink }]}>{title}</Text>
          {note ? <Text style={[styles.personNote, { color: colors.inkDim }]}>{note}</Text> : null}
        </View>
      </View>
      {children ? <View style={styles.personActions}>{children}</View> : null}
    </View>
  )
}

// The pill already says done tonight; the line under the name adds the streak.
function streakOnly(person) {
  const n = friendStreak(person)
  return n ? t('people.streakN', { n }) : ''
}

// What you sent: finished items you cleared stay hidden on this phone.
function readSentHidden(uid) {
  try {
    const list = JSON.parse(localStorage.getItem(`did-i-sent-hidden:${uid}`) || '[]')
    return Array.isArray(list) ? list.map(String) : []
  } catch {
    return []
  }
}

function keepSentHidden(uid, list) {
  try {
    if (list.length) localStorage.setItem(`did-i-sent-hidden:${uid}`, JSON.stringify(list.slice(-500)))
    else localStorage.removeItem(`did-i-sent-hidden:${uid}`)
  } catch {
    // Cleared items come back next time.
  }
}

function sentState(state, name, answers) {
  // Kept: how they answered it lately, when they share that.
  if (state === 'kept') return sendAnswerLine(answers) || t('sent.kept')
  if (state === 'passed') return t('sent.passed')
  // On a friend's own page the line has no "To {name}" before it, so it names them.
  if (name !== undefined) return name ? t('sent.waitingName', { name }) : t('sent.waitingNone')
  return t('sent.waiting')
}

function streakLine(row) {
  if (row.streak > 0) return t(row.streak === 1 ? 'all.streakOne' : 'all.streakN', { n: row.streak })
  return t('all.noStreak')
}

function Tile({ label, value, note, lit, onPress, colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[label, value, note].filter(Boolean).join(', ')}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed ? colors.panel2 : lit ? colors.panel3 : colors.panel,
          borderColor: lit ? colors.on : colors.line,
        },
      ]}
    >
      <View style={styles.tileTop}>
        <Text style={[styles.tileLabel, { color: lit ? colors.on : colors.inkDim }]}>{label}</Text>
        <Text style={[styles.tileChev, { color: lit ? colors.on : colors.inkDim }]}>›</Text>
      </View>
      <Text style={[styles.tileValue, { color: colors.ink }]} numberOfLines={2}>
        {value}
      </Text>
      {note ? (
        <Text style={[styles.tileNote, { color: colors.inkDim }]} numberOfLines={2}>
          {note}
        </Text>
      ) : null}
    </Pressable>
  )
}

// A join code box that sits right under the family list, so joining a
// second or third family does not mean hunting through Connect.
function familyCodeMiss(why) {
  if (why === 'code') return t('people.codeShort')
  if (why === 'nofamily') return t('people.noFamily')
  if (why === 'full') return t('people.familyFull')
  if (why === 'tooManyFamilies') return t('people.tooManyFamilies')
  if (why === 'tooMany') return t('friendId.tooMany')
  if (why === 'needName') return t('friendAsk.nameFirst')
  return tMiss(why)
}

// Look the code up first: "Join {family}? 3 people are in it." Nothing
// changes until Join.
// onScan closes the popup it sits in before the camera opens.
function JoinFamilyCard({ colors, bare = false, scanned = '', onScan }) {
  const [code, setCode] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  const [found, setFound] = useState(null)
  // A scanned family QR code: fill the box and look it up, same as Find.
  useEffect(() => {
    if (!scanned) return
    setCode(cleanCode(scanned))
    look(cleanCode(scanned))
  }, [scanned])
  async function look(typed = code) {
    setBusy(true)
    let result
    try {
      result = await lookUpFamily(typed)
    } catch {
      result = { miss: 'off' }
    } finally {
      setBusy(false)
    }
    if (result.miss) return setMiss(familyCodeMiss(result.miss))
    // A full family says so before Join, not after.
    setMiss(!result.already && result.members >= 20 ? t('people.familyFull') : '')
    return setFound(result)
  }
  async function join() {
    setBusy(true)
    let out
    try {
      out = await joinFamily(found.code)
    } catch {
      out = { miss: 'off' }
    } finally {
      setBusy(false)
    }
    const { miss: why, id } = out
    if (why) return setMiss(familyCodeMiss(why))
    setCode('')
    setMiss('')
    setFound(null)
    confirmDone(t('confirm.joinedFamily', { name: found.name || t('people.familyOne') }))
    return goHash('/family', { id })
  }
  if (found) {
    const name = found.name || t('people.familyOne')
    return (
      <View style={bare ? styles.joinBare : [styles.famCard, { borderColor: colors.on, backgroundColor: colors.panel }]}>
        <Text style={[styles.popKicker, { color: colors.on }]}>{t('familyJoin.kicker')}</Text>
        <Text style={[styles.confirmName, { color: colors.ink }]}>{name}</Text>
        <Text style={[styles.confirmLine, { color: colors.inkSoft }]}>
          {found.already
            ? t('familyJoin.already', { name })
            : [
                found.members === 1 ? t('familyJoin.membersOne') : t('familyJoin.members', { n: found.members }),
                t('familyJoin.confirm', { name }),
                t('familyJoin.asKid'),
              ].join(' ')}
        </Text>
        <Miss colors={colors}>{miss}</Miss>
        {found.already ? (
          <DidButton colors={colors} small label={t('familyJoin.open')} onPress={() => goHash('/family', { id: found.id })} />
        ) : (
          <DidButton colors={colors} small label={t('people.join')} disabled={busy || found.members >= 20} onPress={() => once('join-family', join)} />
        )}
        <KeyButton
          colors={colors}
          label={found.already ? t('friendAsk.back') : t('familyJoin.dontJoin')}
          onPress={() => {
            setFound(null)
            setMiss('')
          }}
        />
      </View>
    )
  }
  return (
    <View style={bare ? styles.joinBare : [styles.famCard, styles.joinCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <View style={bare ? null : styles.joinField}>
        <Field
          colors={colors}
          label={t('people.joinCode')}
          value={code}
          onChangeText={(value) => setCode(cleanCode(value))}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => !busy && familyCodeOk(code) && look()}
        />
        <Miss colors={colors}>{miss}</Miss>
      </View>
      <DidButton
        colors={colors}
        small
        label={t('friendId.find')}
        disabled={busy || !familyCodeOk(code)}
        onPress={() => look()}
      />
      {familyCodeOk(code) ? null : (
        <KeyButton
          colors={colors}
          label={t('invite.paste')}
          onPress={async () => {
            const pasted = await pastedCode('family')
            if (pasted) setCode(pasted)
          }}
        />
      )}
      {canScan() ? (
        <KeyButton
          colors={colors}
          label={t('qr.scan')}
          onPress={() => {
            onScan?.()
            goHash('/scan')
          }}
        />
      ) : null}
    </View>
  )
}

// A small popup for the plus next to a section title.
function AddPop({ kicker, colors, onClose, children, noClose = false }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardLift>
        <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={onClose}>
          <Pressable
            accessible={false}
            style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[styles.popKicker, { color: colors.on }]}>{kicker}</Text>
            {children}
            {noClose ? null : <KeyButton colors={colors} label={t('settings.close')} onPress={onClose} />}
          </Pressable>
        </Pressable>
      </KeyboardLift>
    </Modal>
  )
}

// "2 did you", "1 Did we invite", or "3 waiting" when both are there.
function inboxTileValue(didYous, weInvites) {
  if (didYous && weInvites) return t('people.waitingAll', { n: didYous + weInvites })
  if (didYous) return t('people.waiting', { n: didYous })
  if (weInvites) return weInvites === 1 ? t('people.weInviteOne') : t('people.weInvites', { n: weInvites })
  return t('people.inboxQuiet')
}

function yesNameCopy(person) {
  return {
    title: t('friendYes.nameTitle'),
    body: t('friendYes.nameBody', { name: personName(person) || t('people.someone') }),
    go: t('friendYes.save'),
    back: t('account.stay'),
  }
}

function nudgeNameCopy() {
  return {
    kicker: t('people.you'),
    title: t('friendYes.nameTitle'),
    body: t('people.nameNudgeSub'),
    go: t('settings.save'),
    back: t('account.stay'),
  }
}

function friendIdMiss(why) {
  if (why === 'badId') return t('friendId.bad')
  if (why === 'nobody') return t('friendId.nobody')
  if (why === 'tooMany') return t('friendId.tooMany')
  return tMiss(why)
}

// Look a friend ID up first, then ask "Send a friend request to ...?".
// Nothing is sent until Send. Returns what both add screens need.
function useFriendAsk(onAsked) {
  const [found, setFound] = useState(null)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  // No name yet: the request would say "Someone", so ask for one first.
  const [needName, setNeedName] = useState(false)
  const [name, setName] = useState('')
  async function look(code) {
    setMiss('')
    setBusy(true)
    try {
      const mine = await myFriendId().catch(() => ({ id: '' }))
      if (mine.id && cleanFriendId(code) === cleanFriendId(mine.id)) return setMiss(t('friendId.own'))
      const [result, nameless] = await Promise.all([lookUpFriendId(code), needsName().catch(() => false)])
      if (result.miss) return setMiss(friendIdMiss(result.miss))
      setNeedName(nameless)
      return setFound({ ...result, code })
    } catch {
      return setMiss(t('people.reach'))
    } finally {
      setBusy(false)
    }
  }
  async function send() {
    if (!found) return
    setMiss('')
    setBusy(true)
    try {
      const { miss: why, person, friends } = await askByFriendId(found.code, needName ? name : '')
      if (why === 'needName') setNeedName(true)
      if (why) return setMiss(friendIdMiss(why))
      setFound(null)
      setNeedName(false)
      const who = personName(person || found.person) || t('people.someone')
      // They had asked you too: that is a yes, so you are friends now.
      onAsked(friends ? t('confirm.nowFriends', { name: who }) : t('people.asked', { name: who }))
    } catch {
      setMiss(t('people.reach'))
    } finally {
      setBusy(false)
    }
  }
  return { found, busy, miss, needName, name, setName, look, send, cancel: () => { setFound(null); setMiss('') } }
}

function FriendConfirm({ ask, colors, onDone }) {
  const { found, busy, miss } = ask
  const name = personName(found.person) || t('people.someone')
  const state = found.state
  const line =
    state === 'friends'
      ? t('friendAsk.already', { name })
      : state === 'asked'
        ? t('friendAsk.pending', { name })
        : state === 'asksYou'
          ? t('friendAsk.asksYou', { name })
          : t('friendAsk.confirm', { name })
  return (
    <AddPop kicker={t('friendAsk.kicker')} colors={colors} onClose={ask.cancel} noClose>
      <View style={styles.confirmWho}>
        <Avatar person={found.person} colors={colors} size={52} />
        <View style={styles.confirmCopy}>
          <Text style={[styles.confirmName, { color: colors.ink }]} numberOfLines={1}>{name}</Text>
          <Text style={[styles.friendId, styles.friendIdSmall, { color: colors.inkDim }]}>{formatFriendId(found.code)}</Text>
        </View>
      </View>
      <Text style={[styles.confirmLine, { color: colors.inkSoft }]}>{line}</Text>
      {state === '' && ask.needName ? (
        <>
          <Text style={[styles.confirmLine, { color: colors.inkSoft }]}>{t('friendAsk.nameFirst')}</Text>
          <Field
            colors={colors}
            label={t('people.name')}
            placeholder={t('people.namePh')}
            value={ask.name}
            onChangeText={ask.setName}
            maxLength={40}
            autoCapitalize="words"
          />
        </>
      ) : null}
      <Miss colors={colors}>{miss}</Miss>
      {state === '' ? (
        <DidButton
          colors={colors}
          label={ask.needName ? t('friendAsk.saveSend') : t('friendAsk.send')}
          disabled={busy || (ask.needName && !ask.name.trim())}
          onPress={ask.send}
        />
      ) : null}
      {state === 'asksYou' ? (
        <DidButton
          colors={colors}
          label={t('friendAsk.seeRequest')}
          onPress={() => {
            ask.cancel()
            onDone?.()
            goHash('/friends')
          }}
        />
      ) : null}
      <KeyButton colors={colors} label={state === '' ? t('friendAsk.dontSend') : t('friendAsk.back')} onPress={ask.cancel} />
    </AddPop>
  )
}

// Add by friend ID.
function AddFriendPop({ colors, onClose, onAsked }) {
  const [draft, setDraft] = useState('')
  const [myId, setMyId] = useState('')
  const [idMiss, setIdMiss] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const ask = useFriendAsk((words) => {
    onClose()
    onAsked(words)
  })
  useEffect(() => {
    let alive = true
    myFriendId().then((out) => {
      if (!alive) return
      setMyId(out.id || '')
      setIdMiss(!out.id)
    }).catch(() => {
      if (alive) setIdMiss(true)
    })
    return () => {
      alive = false
    }
  }, [])
  if (ask.found) return <FriendConfirm ask={ask} colors={colors} onDone={onClose} />
  return (
    <AddPop kicker={t('people.addOne')} colors={colors} onClose={onClose}>
      {/* Side by side: they scan yours, or you type or scan theirs. */}
      {idMiss ? <Miss colors={colors}>{t('friendId.codeMiss')}</Miss> : null}
      {myId ? (
        <KeyButton
          colors={colors}
          label={showQr ? t('qr.hideMine') : t('qr.showMine')}
          onPress={() => setShowQr((on) => !on)}
        />
      ) : null}
      {showQr ? (
        <Reveal style={styles.qrBox}>
          <QrCode value={friendQrLink(myId)} size={180} label={t('qr.friendLabel')} />
          <Text selectable style={[styles.friendId, { color: colors.ink }]}>{formatFriendId(myId)}</Text>
        </Reveal>
      ) : null}
      <Field
        colors={colors}
        label={t('friendId.add')}
        placeholder={t('friendId.addPh')}
        value={formatFriendId(draft)}
        onChangeText={(value) => setDraft(cleanFriendId(value))}
        keyboardType="number-pad"
        returnKeyType="search"
        onSubmitEditing={() => !ask.busy && draft.length === 12 && ask.look(draft)}
      />
      <Miss colors={colors}>{ask.miss}</Miss>
      <DidButton
        colors={colors}
        label={t('friendId.find')}
        disabled={ask.busy || draft.length !== 12}
        onPress={() => ask.look(draft)}
      />
      {draft.length === 12 ? null : (
        <KeyButton
          colors={colors}
          label={t('invite.paste')}
          onPress={async () => {
            const id = await pastedCode('friend')
            if (!id) return
            setDraft(id)
            ask.look(id)
          }}
        />
      )}
      {canScan() ? (
        <KeyButton
          colors={colors}
          label={t('qr.scan')}
          onPress={() => {
            onClose()
            goHash('/scan')
          }}
        />
      ) : null}
    </AddPop>
  )
}

export function PeopleScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  // The strip line teaches a tap; regulars know it.
  const newHere = useMemo(() => isNewShelf(readShelf().boards), [])
  const [mine, setMine] = useKept(`people.mine:${account.user?.id}`, null, KEEP)
  const [links, setLinks] = useKept(`people.links:${account.user?.id}`, { friends: [], asked: [], sent: [] }, KEEP)
  const [families, setFamilies] = useKept(`people.families:${account.user?.id}`, [], KEEP)
  const [waiting, setWaiting] = useKept(`people.waiting:${account.user?.id}`, 0, KEEP)
  // Did we invites open from the same Did you inbox, so the tile counts them too.
  const [weWaiting, setWeWaiting] = useKept(`people.weWaiting:${account.user?.id}`, 0, KEEP)
  const [ready, setReady] = useKept(`people.ready:${account.user?.id}`, false, KEEP)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [sheet, setSheet] = useState(null)
  const [tab, setTab] = useState('friends')
  const peopleTour = useTourTarget('people')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [who, friendRows, famRows, count, weCount] = await Promise.all([
        readMine(),
        listFriends(),
        listFamilies(),
        inboxCount(),
        weAskCount().catch(() => 0),
      ])
      setMine(who)
      // Not awaited: it only fills a missing name, and waiting on it held the
      // lists back by a whole round trip.
      syncDisplayName(book.keeperName).catch(() => {})
      // A failed list keeps the rows we had and says so.
      if (!friendRows.miss) setLinks(friendRows)
      if (!famRows.miss) setFamilies(famRows)
      setWaiting(count)
      setWeWaiting(weCount)
      setMiss(friendRows.miss || famRows.miss ? t('people.reach') : '')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user, book.keeperName])

  // The menu badge counts live; reload when a did you or friend ask comes or goes.
  const pulse = usePeoplePulse(account.user)
  useEffect(() => {
    load()
  }, [load, pulse.inbox, pulse.asks, pulse.friends, pulse.families])

  // A Did we card changed while this is open: the invite tile count reads again.
  useEffect(() => onSocialLive((kinds) => {
    if (kinds.has('we') || kinds.has('weMembers')) load()
  }), [load])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  function answerAsk(id, yes, person) {
    return once(`ask:${id}`, () => answerAskNow(id, yes, person))
  }

  async function answerAskNow(id, yes, person) {
    if (yes && !(await nameFirst(colors, yesNameCopy(person)))) return undefined
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why === 'friends.askChanged') load()
    if (why) return setMiss(tMiss(why))
    if (yes) {
      say(t('confirm.nowFriends', { name: personName(person) || t('people.someone') }))
      offerWeWith(person, colors)
    } else say(t('confirm.askRemoved'))
    return load()
  }

  async function addName() {
    if (await nameFirst(colors, nudgeNameCopy())) load()
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('people.title')} colors={colors}>
        <LateMeta colors={colors}>{t('family.loading')}</LateMeta>
      </ScreenShell>
    )
  }

  const today = isoDate(new Date())
  // Only friends who share their streak can show done, so only they count.
  const sharing = links.friends.filter((row) => row.person?.share_streak !== false)
  const doneCount = sharing.filter((row) => doneTonight(row.person, today)).length

  return (
    <ScreenShell title={t('people.title')} colors={colors}>
      <OfflineLine colors={colors} />

      {links.asked.length || weWaiting || waiting ? (
        <SetCard colors={colors}>
          {[
            links.asked.length ? { key: 'friends', label: t('people.waitFriends'), n: links.asked.length, go: () => setTab('friends') } : null,
            weWaiting ? { key: 'we', label: t('people.waitWe'), n: weWaiting, go: () => goHash('/inbox') } : null,
            waiting ? { key: 'inbox', label: t('people.waitInbox'), n: waiting, go: () => goHash('/inbox') } : null,
          ]
            .filter(Boolean)
            .map((row, i, all) => (
              <SetRow key={row.key} colors={colors} label={row.label} value={String(row.n)} chevron last={i === all.length - 1} onPress={row.go} />
            ))}
        </SetCard>
      ) : null}

      <View style={styles.tiles}>
        <Tile
          colors={colors}
          lit={waiting + weWaiting > 0}
          label={t('people.inboxTile')}
          value={inboxTileValue(waiting, weWaiting)}
          note={waiting ? t('people.waitingSub') : weWaiting ? t('people.weWaitingSub') : ''}
          onPress={() => goHash('/inbox')}
        />
        <Tile
          colors={colors}
          label={t('sent.kicker')}
          value={t('sent.tileValue')}
          note={t('sent.rowSub')}
          onPress={() => goHash('/sent')}
        />
      </View>

      <View style={styles.friendTabs} {...peopleTour}>
        <KitSegment
          items={[
            {
              id: 'friends',
              label: links.asked.length ? t('people.tabFriendsAsks', { n: links.asked.length }) : t('people.friends'),
            },
            { id: 'families', label: t('people.families') },
            { id: 'we', label: t('we.title') },
          ]}
          selected={tab}
          onSelect={setTab}
          colors={colors}
        />
      </View>

      {tab === 'friends' && mine && !mine.display_name?.trim() && (links.friends.length || links.sent.length) ? (
        <EmptyCard colors={colors} title={t('people.nameNudge')} body={t('people.nameNudgeSub')}>
          <DidButton colors={colors} small label={t('people.nameNudgeGo')} onPress={addName} />
        </EmptyCard>
      ) : null}

      {tab === 'friends' && links.asked.length ? (
        <Reveal key="asks" layout={false} style={styles.tabBody}>
          <SectionHead colors={colors} label={t('people.askBanner', { n: links.asked.length })} />
          {links.asked.map((row) => (
            <PersonCard
              key={row.id}
              colors={colors}
              highlight
              person={row.person}
              name={friendAskTitle(row.person) || t('people.someone')}
              line={friendAskNote(row.person)}
              actions={
                <>
                  <DidButton colors={colors} small label={t('people.yes')} onPress={() => answerAsk(row.id, true, row.person)} />
                  <KeyButton colors={colors} label={t('people.no')} onPress={() => askFirst(colors, t('people.noTitle', { name: friendAskTitle(row.person) || t('people.someone') }), t('people.noBody'), t('people.no'), () => answerAsk(row.id, false))} />
                </>
              }
            />
          ))}
        </Reveal>
      ) : null}

      {tab === 'friends' ? (
        <Reveal key="friends" layout={false} style={styles.tabBody}>
      <SectionHead
        colors={colors}
        label={t('people.friends')}
        count={links.friends.length || null}
        link={t('people.seeAll')}
        onLink={() => goHash('/friends')}
        onAdd={() => setSheet({ kind: 'friend' })}
        addLabel={t('people.addOne')}
      />
      {links.friends.length ? (
        <>
          <Text style={[styles.glance, { color: colors.inkSoft }]}>
            {sharing.length ? `${doneCount ? t(sharing.length === 1 ? 'people.doneOfOne' : 'people.doneOf', { done: doneCount, n: sharing.length }) : t('together.noneYet')} ` : ''}
            {newHere ? t('people.stripHint') : ''}
          </Text>
          <FadeScroll fade={colors.bg} contentContainerStyle={styles.strip}>
            {links.friends.map((row) => {
              const done = doneTonight(row.person, today)
              return (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${personName(row.person) || t('people.noName')}, ${friendLine(row.person)}`}
                  onPress={() => goHash('/friend', { id: row.person.user_id })}
                  style={styles.stripItem}
                >
                  <Avatar person={row.person} done={done} colors={colors} size={52} />
                  <Text style={[styles.stripName, { color: colors.ink }]} numberOfLines={personName(row.person) ? 1 : 2}>
                    {personName(row.person) || t('people.noName')}
                  </Text>
                  <Text style={[styles.stripLine, { color: done ? colors.on : colors.inkDim }]} numberOfLines={1}>
                    {done ? t('people.doneTonightShort') : ''}
                  </Text>
                </Pressable>
              )
            })}
          </FadeScroll>
        </>
      ) : (
        <EmptyCard colors={colors} title={t('people.noFriendsTitle')} body={t('people.noFriendsBody')}>
          <DidButton colors={colors} small label={t('people.addOne')} onPress={() => setSheet({ kind: 'friend' })} />
        </EmptyCard>
      )}
        </Reveal>
      ) : null}

      {tab === 'families' ? (
        <Reveal key="families" layout={false} style={styles.tabBody}>
      <SectionHead
        colors={colors}
        label={t('people.families')}
        count={families.length || null}
        onAdd={families.length ? () => setSheet({ kind: 'family' }) : undefined}
        addLabel={t('people.join')}
      />
      {families.length ? (
        families.map((fam) => (
          <Pressable
            key={fam.id}
            accessibilityRole="button"
            onPress={() => goHash('/family', { id: fam.id })}
            style={({ pressed }) => [
              styles.famCard,
              { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel },
            ]}
          >
            <Avatar person={{ display_name: fam.name }} colors={colors} />
            <View style={styles.famCopy}>
              <Text style={[styles.famName, { color: colors.ink }]} numberOfLines={1}>
                {fam.name}
              </Text>
              <Text style={[styles.famLine, { color: colors.inkDim }]}>
                {fam.role === 'parent' ? t('people.parent') : t('people.kid')}
              </Text>
            </View>
            <Text style={[styles.chev, { color: colors.inkDim }]}>›</Text>
          </Pressable>
        ))
      ) : (
        <EmptyCard colors={colors} title={t('people.noFamiliesTitle')} body={t('people.noFamiliesBody')}>
          <DidButton colors={colors} small label={t('people.startFamily')} onPress={() => goHash('/people/connect')} />
        </EmptyCard>
      )}
      {families.length ? null : <JoinFamilyCard colors={colors} />}
        </Reveal>
      ) : null}

      {tab === 'we' ? (
        <Reveal key="we" layout={false} style={styles.tabBody}>
      {/* The tab already says Did we; no second header. */}
      <WeHomeList book={book} onChange={onChange} />
        </Reveal>
      ) : null}

      {/* You: only on the Friends tab, so it does not repeat on every tab. */}
      {tab === 'friends' ? (
        <Reveal key="you" layout={false} style={styles.tabBody}>
      <SectionHead colors={colors} label={t('people.you')} />
      <Row
        colors={colors}
        label={t('people.name')}
        note={mine?.display_name || book.keeperName || keptProfileName() || t('people.nameInAccount')}
        onPress={() => goHash('/account')}
      />
      <Row
        colors={colors}
        label={t('friendId.yours')}
        note={mine?.friend_id ? undefined : t('friendId.shareSub')}
        // With an ID, Copy and Share sit inside this card; without one, go get it.
        onPress={mine?.friend_id ? undefined : () => goHash('/people/connect')}
      >
      {mine?.friend_id ? (
        <Text selectable style={[styles.friendId, { color: colors.ink }]}>{formatFriendId(mine.friend_id)}</Text>
      ) : null}
      {mine?.friend_id ? (
        <View style={styles.idButtons}>
          <KeyButton
            colors={colors}
            label={t('friendId.copy')}
            onPress={async () => {
              if (await copyText(formatFriendId(mine.friend_id))) confirmDone(t('friendId.copied'))
              else confirmMiss(t('confirm.miss'))
            }}
          />
          <KeyButton
            colors={colors}
            label={t('friendId.share')}
            onPress={async () => {
              const id = mine.friend_id
              const how = await passAlong(t('friendId.shareText', { id: formatFriendId(id), link: friendQrLink(id) }), t('friendId.title'))
              if (how === 'copied') confirmDone(t('friendId.copied'))
              else if (!how) confirmMiss(t('confirm.shareMiss'))
            }}
          />
        </View>
      ) : null}
      </Row>
      <Row
        colors={colors}
        label={t('people.connect')}
        note={t('people.connectSub')}
        onPress={() => goHash('/people/connect')}
      />
      {/* Invites sit here, beside Connect, not as a card over the lists. */}
      <Row
        colors={colors}
        label={t('people.referRow')}
        note={t('invite.cardBody', { max: INVITE_GEMS_CAP })}
        bright
        onPress={() => goHash('/people/refer')}
      />
      <Row
        colors={colors}
        label={t('people.pingsGo')}
        note={t('people.pingsGoSub')}
        onPress={() => goHash('/pings', { id: 'friends' })}
      />

        </Reveal>
      ) : null}
      {links.sent.length ? (
        <Meta colors={colors}>
          {t('people.outstanding', {
            names: links.sent.map((row) => personName(row.person)).filter(Boolean).join(', '),
          })}
        </Meta>
      ) : null}

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}

      {sheet?.kind === 'send' ? (
        <SendSheet book={book} person={sheet.person} colors={colors} onClose={() => setSheet(null)} onSent={say} />
      ) : null}
      {sheet?.kind === 'friend' ? (
        <AddFriendPop colors={colors} onClose={() => setSheet(null)} onAsked={(words) => { say(words); load() }} />
      ) : null}
      {sheet?.kind === 'family' ? (
        <AddPop kicker={t('people.join')} colors={colors} onClose={() => setSheet(null)}>
          <JoinFamilyCard colors={colors} bare onScan={() => setSheet(null)} />
        </AddPop>
      ) : null}
    </ScreenShell>
  )
}

export function PeopleReferScreen({ book, onChange, route }) {
  const colors = useHallColors()
  // Opened from a scanned invite QR code: the code box comes filled in.
  const scannedInvite = cleanInvite(route?.id || '')
  const [showQr, setShowQr] = useState(false)
  // Frames show in your look, as on your card.
  const frameColors = useLookColors(activeLook(book))
  const account = useAccount()
  const [invite, setInvite] = useKept(`refer.invite:${account.user?.id}`, '', KEEP)
  const [joined, setJoined] = useKept(`refer.joined:${account.user?.id}`, 0, KEEP)
  const [gemsPaid, setGemsPaid] = useKept(`refer.gems:${account.user?.id}`, 0, KEEP)
  const [ready, setReady] = useKept(`refer.ready:${account.user?.id}`, false, KEEP)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [code, who] = await Promise.all([myInvite(), readMine()])
      setInvite(code)
      setGemsPaid(Number(who?.invite_gems_paid) || 0)
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  const payOut = useCallback(async () => {
    if (!account.user) return
    try {
      const won = await claimInvites()
      setJoined(won.joined)
      const who = await readMine()
      setGemsPaid(Number(who?.invite_gems_paid) || 0)
      const next = applyInvitePayout(book, won)
      if (next !== book && onChange) onChange(next)
      if (!won.gems && !won.looks.length) return
      setSaid(invitePayoutNote(won))
    } catch {
      setMiss(t('people.reach'))
    }
  }, [account.user, book, onChange])

  useEffect(() => {
    load()
    payOut()
  }, [load, payOut])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.refer')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('people.refer')} colors={colors}>
        <LateMeta colors={colors}>{t('family.loading')}</LateMeta>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('people.refer')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('people.referBody')}</Meta>

      {scannedInvite.length === INVITE_CODE_LEN ? (
        <View style={[styles.groupCard, styles.groupPad, { borderColor: colors.on, backgroundColor: colors.panel }]}>
          <InviteCodeSection key={scannedInvite} colors={colors} book={book} onChange={onChange} hideBar start={scannedInvite} />
        </View>
      ) : null}

      <View style={[styles.groupCard, styles.groupPad, styles.friendIdCard, { borderColor: colors.on, backgroundColor: colors.panel }]}>
        <Text style={[styles.tileNote, { color: colors.inkDim }]}>{t('invite.yours')}</Text>
        <Text selectable style={[styles.friendId, { color: colors.ink }]}>
          {invite ? formatInvite(invite) : t('family.loading')}
        </Text>
        <DidButton
          colors={colors}
          label={t('invite.send')}
          disabled={!invite}
          onPress={async () => {
            const how = await shareInvite(invite)
            if (how) say(t(how === 'copied' ? 'people.copied' : 'people.shared'))
            else setMiss(t('confirm.shareMiss'))
          }}
        />
        <View style={styles.idButtons}>
          <KeyButton
            colors={colors}
            label={t('friendId.copy')}
            disabled={!invite}
            onPress={async () => {
              if (await copyInviteLink(invite)) confirmDone(t('people.copied'))
              else confirmMiss(t('confirm.miss'))
            }}
          />
          <KeyButton
            colors={colors}
            label={showQr ? t('qr.hideMine') : t('qr.showMine')}
            disabled={!invite}
            onPress={() => setShowQr((on) => !on)}
          />
        </View>
        {showQr && invite ? (
          <Reveal style={styles.qrBox}>
            <QrCode value={inviteLink(invite)} size={200} label={t('invite.yours')} />
            <Meta colors={colors}>{t('invite.qrHint')}</Meta>
          </Reveal>
        ) : null}
      </View>

      <ReferLadder colors={colors} frameColors={frameColors} joined={joined} book={book} onChange={onChange} />

      {scannedInvite.length === INVITE_CODE_LEN ? null : (
        <InviteCodeSection colors={colors} book={book} onChange={onChange} gemsPaid={gemsPaid} joined={joined} hideBar />
      )}

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
    </ScreenShell>
  )
}

export function PeopleConnectScreen({ book, onChange, route }) {
  const colors = useHallColors()
  const account = useAccount()
  const [famDraft, setFamDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  // Everyone has a friend ID; it is the main way to add someone.
  const [myId, setMyId] = useState('')
  const [idMiss, setIdMiss] = useState(false)
  const [idDraft, setIdDraft] = useState('')
  const [showQr, setShowQr] = useState(false)
  const friendIdTour = useTourTarget('friendId')
  const idAsk = useFriendAsk((words) => {
    setIdDraft('')
    say(words)
  })
  // Opened from a scanned QR code: route.id is friend:123456789012 or family:ABC123.
  const scan = String(route?.id || '')
  const scannedFriend = /^friend:(\d{12})$/.exec(scan)?.[1] || ''
  const scannedFamily = /^family:([A-Z0-9]{6}|[A-Z0-9]{10})$/i.exec(scan)?.[1] || ''

  // Signed out: keep the scan, and the first signed-in open comes back here.
  useEffect(() => {
    if (scan && !account.user) savePendingScan(scan)
  }, [scan, account.user])

  useEffect(() => {
    if (!scannedFriend || !account.user) return
    setIdDraft(scannedFriend)
    idAsk.look(scannedFriend)
  }, [scannedFriend, route, account.user])

  useEffect(() => {
    if (!account.user) return undefined
    let alive = true
    myFriendId().then((out) => {
      if (!alive) return
      setMyId(out.id || '')
      setIdMiss(!out.id)
    }).catch(() => {
      if (alive) setIdMiss(true)
    })
    return () => {
      alive = false
    }
  }, [account.user])

  function say(words) {
    setMiss('')
    setSaid(words)
  }


  async function shareId() {
    const how = await passAlong(t('friendId.shareText', { id: formatFriendId(myId), link: friendQrLink(myId) }), t('friendId.title'))
    if (how === 'copied') say(t('friendId.copied'))
    else if (how === 'shared') say(t('people.shared'))
    else setMiss(t('confirm.shareMiss'))
  }

  async function copyId() {
    if (await copyText(formatFriendId(myId))) confirmDone(t('friendId.copied'))
    else confirmMiss(t('confirm.miss'))
  }

  async function newFamily() {
    const name = famDraft || t('people.familyOne')
    const { miss: why, id } = await makeFamily(name)
    if (why) return setMiss(tMiss(why))
    setFamDraft('')
    confirmDone(t('confirm.madeFamily', { name }))
    return goHash('/family', { id })
  }


  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.connect')} title={t('people.outTitle')} colors={colors} />
  }

  return (
    <ScreenShell title={t('people.connect')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('people.connectBody')}</Meta>
      {/* A scanned family code: the Join box comes up top so it is not missed. */}
      {scannedFamily ? <JoinFamilyCard key={scan} colors={colors} scanned={scannedFamily} /> : null}

      <InviteCard colors={colors} />

      <Cap colors={colors}>{t('people.addOne')}</Cap>
      <View style={[styles.groupCard, styles.groupPad, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <Field
          colors={colors}
          label={t('friendId.add')}
          placeholder={t('friendId.addPh')}
          value={formatFriendId(idDraft)}
          onChangeText={(value) => setIdDraft(cleanFriendId(value))}
          keyboardType="number-pad"
          returnKeyType="search"
          onSubmitEditing={() => !idAsk.busy && idDraft.length === 12 && idAsk.look(idDraft)}
        />
        <Miss colors={colors}>{idAsk.found ? '' : idAsk.miss}</Miss>
        <DidButton
          colors={colors}
          label={t('friendId.find')}
          disabled={idAsk.busy || idDraft.length !== 12}
          onPress={() => idAsk.look(idDraft)}
        />
        {idDraft.length === 12 ? null : (
          <KeyButton
            colors={colors}
            label={t('invite.paste')}
            onPress={async () => {
              const id = await pastedCode('friend')
              if (!id) return
              setIdDraft(id)
              idAsk.look(id)
            }}
          />
        )}
        {canScan() ? (
          <KeyButton colors={colors} label={t('qr.scan')} onPress={() => goHash('/scan')} />
        ) : null}
      </View>
      {idAsk.found ? <FriendConfirm ask={idAsk} colors={colors} /> : null}

      {/* Someone who joined without their friend's link can still use the code
          here, where they come to add that friend. Gone once one is used. */}
      <InviteCodeSection colors={colors} book={book} onChange={onChange} hideBar hideDone />

      <View {...friendIdTour} style={[styles.groupCard, styles.groupPad, styles.friendIdCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <Text style={[styles.tileNote, { color: colors.inkDim }]}>{t('friendId.yours')}</Text>
        <Text selectable style={[styles.friendId, { color: colors.ink }]}>
          {myId ? formatFriendId(myId) : t('family.loading')}
        </Text>
        {idMiss ? <Miss colors={colors}>{t('friendId.codeMiss')}</Miss> : null}
        <View style={styles.idButtons}>
          <KeyButton colors={colors} label={t('friendId.copy')} disabled={!myId} onPress={copyId} />
          <KeyButton colors={colors} label={t('friendId.share')} disabled={!myId} onPress={shareId} />
        </View>
        {myId ? (
          <KeyButton
            colors={colors}
            label={showQr ? t('qr.hideMine') : t('qr.showMine')}
            onPress={() => setShowQr((on) => !on)}
          />
        ) : null}
        {showQr ? (
          <Reveal style={styles.qrBox}>
            <QrCode value={friendQrLink(myId)} label={t('qr.friendLabel')} />
            <Meta colors={colors}>{t('qr.friendHint')}</Meta>
          </Reveal>
        ) : null}
      </View>

      <Cap colors={colors}>{t('people.startFamily')}</Cap>
      <Field
        colors={colors}
        label={t('people.newFamily')}
        value={famDraft}
        onChangeText={setFamDraft}
        // The server takes 1 to 60 characters (hardening.sql).
        maxLength={60}
        autoCapitalize="words"
        returnKeyType="done"
        onSubmitEditing={() => once('make-family', newFamily)}
      />
      <DidButton colors={colors} label={t('people.makeFamily')} onPress={() => once('make-family', newFamily)} />
      <JoinFamilyCard colors={colors} bare />

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
    </ScreenShell>
  )
}

export function FriendsScreen({ book, onChange, highlightAsk = '' }) {
  const colors = useHallColors()
  const account = useAccount()
  const purse = normalizePurse(book)
  const [links, setLinks] = useKept(`friends.links:${account.user?.id}`, { friends: [], asked: [], sent: [] }, KEEP)
  const [blocks, setBlocks] = useKept(`friends.blocks:${account.user?.id}`, [], KEEP)
  const [autoAdds, setAutoAdds] = useKept(`friends.auto:${account.user?.id}`, () => new Set())
  const noted = useNoted(account.user?.id)
  const [ready, setReady] = useKept(`friends.ready:${account.user?.id}`, false, KEEP)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [stock, setStock] = useState(null)
  // A friend request push lands on Requests.
  const [tab, setTab] = useState(highlightAsk ? 'requests' : '')
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [got, setGot] = useState({ rows: [], miss: '', ready: false })
  const cheersLeft = stock == null ? purse.friendCheers : stock

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [friendRows, blockRows, serverCheers, autoRows, gotRows] = await Promise.all([
        listFriends(),
        listBlocks(),
        readFriendCheers(),
        listAutoAdds(),
        listCheersGot().catch(() => ({ miss: 'people.reach', rows: [] })),
      ])
      setGot({ rows: gotRows.rows, miss: gotRows.miss ? tMiss(gotRows.miss) : '', ready: true })
      if (!friendRows.miss) setLinks(friendRows)
      setBlocks(blockRows)
      setAutoAdds(autoRows)
      if (typeof serverCheers === 'number') setStock(serverCheers)
      setMiss(friendRows.miss ? t('people.reach') : '')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  // Someone removing you (or adding you) shows up without leaving the screen.
  const pulse = usePeoplePulse(account.user)
  useEffect(() => {
    load()
  }, [load, pulse.friends, pulse.asks])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  function answerAsk(id, yes, person) {
    return once(`ask:${id}`, () => answerAskNow(id, yes, person))
  }

  async function answerAskNow(id, yes, person) {
    setMiss('')
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why === 'friends.askChanged') load()
    if (why) return setMiss(tMiss(why))
    if (yes) {
      say(t('confirm.nowFriends', { name: personName(person) || t('people.someone') }))
      offerWeWith(person, colors)
    } else say(t('confirm.askRemoved'))
    return load()
  }

  // Asks back and forth are dropped with the friendship; shared Did wes
  // stay until one of you leaves (we_on_unfriend).
  function cut(person) {
    setMiss('')
    askRemoveFriend({
      person,
      colors,
      onMiss: setMiss,
      onDone: (words) => {
        setSaid(words)
        load()
      },
    })
  }

  // A sent request can be taken back until they answer it.
  function unsend(row) {
    const name = personName(row.person) || t('people.someone')
    publishSheet({
      title: t('friends.unsendTitle', { name }),
      body: t('friends.unsendBody'),
      goLabel: t('friends.unsend'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: async () => {
        publishSheet(null)
        setMiss('')
        const { miss: why } = await unsendAsk(row.id)
        if (why === 'friends.askChanged') load()
        if (why) return setMiss(tMiss(why))
        setSaid(t('friends.unsent', { name }))
        return load()
      },
    })
  }

  async function flipAuto(person) {
    const id = person.user_id
    const on = !autoAdds.has(id)
    // Show it at once; put it back if the save does not land.
    setAutoAdds((live) => {
      const next = new Set(live)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
    const { miss: why } = await setAutoAdd(id, on)
    if (!why) return
    setAutoAdds((live) => {
      const next = new Set(live)
      if (on) next.delete(id)
      else next.add(id)
      return next
    })
    setMiss(why === 'off' || why === 'out' ? tMiss(why) : t('friends.autoAddMiss'))
  }

  function cheerWith(person, cheerId) {
    if (cheersLeft >= 1) return once(`cheer:${person.user_id}`, () => cheer(person, cheerId))
    if (purse.gems < FRIEND_CHEER_GEMS) return offerMoreGems(colors)
    return confirmFriendCheers(colors, () => once('buy-cheers', async () => {
      if (await buyNowOnce()) await cheer(person, cheerId)
    }))
  }

  function startCheer(person) {
    if (cheersLeft < 1 && cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP) return confirmMiss(t('friends.cheerCap', { n: FRIEND_CHEER_CAP }))
    return pickCheer(colors, { name: personName(person) || t('people.someone'), purse, onGo: (id) => cheerWith(person, id) })
  }

  async function cheer(person, cheerId) {
    const sent = await cheerFriend(book, person.user_id, cheerId)
    const known = friendCheerMissKey(sent.miss)
    if (known) return confirmMiss(t(known.key, known.vars))
    if (sent.miss) return confirmMiss(tMiss(sent.miss))
    setStock(normalizePurse(sent.book).friendCheers)
    if (onChange) onChange(sent.book)
    fireCheer(cheerId, 1)
    return confirmDone(t('family.cheerSent', { name: personName(person) || t('people.someone') }))
  }

  function gift(person) {
    goHash('/gift', { id: person.user_id })
  }

  function buyMore() {
    if (purse.gems < FRIEND_CHEER_GEMS) {
      offerMoreGems(colors)
      return
    }
    confirmFriendCheers(colors, buyNow)
  }

  function buyNow() {
    return once('buy-cheers', async () => {
      if (await buyNowOnce()) confirmDone(t('confirm.cheersBought', { n: FRIEND_CHEERS_PER_GEM }))
    })
  }

  async function buyNowOnce() {
    const bought = await buyCheers(book)
    if (bought.miss === 'gems') {
      offerMoreGems(colors)
      return false
    }
    const known = friendCheerMissKey(bought.miss)
    if (known) { confirmMiss(t(known.key, known.vars)); return false }
    if (bought.miss) { confirmMiss(tMiss(bought.miss)); return false }
    setStock(normalizePurse(bought.book).friendCheers)
    if (onChange) onChange(bought.book)
    return true
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.friends')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('friends.title', { n: 0 })} colors={colors}>
        <LateMeta colors={colors}>{t('family.loading')}</LateMeta>
      </ScreenShell>
    )
  }

  const today = isoDate(new Date())
  // Only friends who share their streak can show done, so only they count.
  const sharing = links.friends.filter((row) => row.person?.share_streak !== false)
  const doneCount = sharing.filter((row) => doneTonight(row.person, today)).length
  const requestCount = links.asked.length + links.sent.length
  const shown = tab || (links.asked.length ? 'requests' : 'friends')

  return (
    <ScreenShell title={t('friends.title', { n: links.friends.length })} colors={colors}>
      <OfflineLine colors={colors} />

      {sharing.length ? (
        <Text style={[styles.glance, { color: colors.inkSoft }]}>
          {doneCount ? t(sharing.length === 1 ? 'people.doneOfOne' : 'people.doneOf', { done: doneCount, n: sharing.length }) : t('together.noneYet')}
        </Text>
      ) : null}

      <View style={styles.friendTabs}>
        <KitSegment
          items={[
            { id: 'friends', label: t('people.friends') },
            {
              id: 'requests',
              label: requestCount ? t('friends.tabRequests', { n: requestCount }) : t('friends.requests'),
            },
          ]}
          selected={shown}
          onSelect={setTab}
          colors={colors}
        />
      </View>

      {shown === 'requests' ? (
        <>
      {requestCount ? null : <EmptyCard colors={colors} title={t('friends.noRequests')} body={t('friends.manage')} />}
      {links.asked.length ? (
        <>
          <SectionHead colors={colors} label={t('people.askBanner', { n: links.asked.length })} />
          {links.asked.map((row) => (
            <PersonCard
              key={row.id}
              colors={colors}
              highlight={highlightAsk ? row.id === highlightAsk : true}
              person={row.person}
              name={friendAskTitle(row.person) || t('people.someone')}
              line={friendAskNote(row.person)}
              actions={
                <>
                  <DidButton colors={colors} small label={t('people.yes')} onPress={() => answerAsk(row.id, true, row.person)} />
                  <KeyButton colors={colors} label={t('people.no')} onPress={() => askFirst(colors, t('people.noTitle', { name: friendAskTitle(row.person) || t('people.someone') }), t('people.noBody'), t('people.no'), () => answerAsk(row.id, false))} />
                </>
              }
            />
          ))}
        </>
      ) : null}

      {links.sent.length ? (
        <>
          <SectionHead colors={colors} label={t('friends.waiting')} count={links.sent.length} />
          {links.sent.map((row) => (
            <PersonCard
              key={row.id}
              colors={colors}
              person={row.person}
              name={personName(row.person) || t('people.noName')}
              line={[t('friends.notYet'), gotDay(row.madeAt), t('friends.unsendNote')].filter(Boolean).join(' · ')}
              actions={<KeyButton colors={colors} label={t('friends.unsend')} onPress={() => unsend(row)} />}
            />
          ))}
        </>
      ) : null}
        </>
      ) : null}

      {shown === 'friends' ? (
        <>
      <View style={[styles.stockBar, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <View style={styles.stockCopy}>
          <Text style={[styles.stockValue, { color: colors.ink }]}>{t('friends.cheerStock', { n: cheersLeft })}</Text>
          <Text style={[styles.tileNote, { color: colors.inkDim }]}>{t('friends.cheerNote')}</Text>
        </View>
        <KeyButton
          colors={colors}
          disabled={cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP}
          label={t('friends.cheerBuyShort')}
          onPress={buyMore}
        />
      </View>

      <SectionHead colors={colors} label={t('people.friends')} count={links.friends.length || null} />
      {links.friends.length ? (
        links.friends.map((row) => {
          const done = doneTonight(row.person, today)
          const auto = autoAdds.has(row.person.user_id)
          return (
            <PersonCard
              key={row.id}
              colors={colors}
              person={row.person}
              done={done}
              name={personName(row.person) || t('people.noName')}
              line={[done ? streakOnly(row.person) : friendLine(row.person), auto ? t('people.autoOnChip') : '']
                .filter(Boolean)
                .join(' · ')}
              pill={done ? t('people.doneTonightShort') : ''}
              pillOn={done}
              noted={noted.has(row.person.user_id)}
              onOpen={() => goHash('/friend', { id: row.person.user_id })}
              actions={
                <>
                  <DidButton
                    colors={colors}
                    small
                    label={t('friend.sendDidYou')}
                    onPress={() => setSheet({ person: row.person })}
                  />
                  <KeyButton
                    colors={colors}
                    label={t('friends.cheerUse')}
                    onPress={() => startCheer(row.person)}
                  />
                </>
              }
              more={
                <>
                  <SetSwitch
                    colors={colors}
                    label={t('friends.autoAdd')}
                    sub={auto ? t('friends.autoAddOn') : t('friends.autoAddOff')}
                    on={auto}
                    onPress={() => flipAuto(row.person)}
                  />
                  <View style={styles.personActions}>
                    <KeyButton
                      colors={colors}
                      label={t('gift.button')}
                      onPress={() => gift(row.person)}
                    />
                    <KeyButton colors={colors} label={t('people.drop')} onPress={() => cut(row.person)} />
                    <KeyButton colors={colors} label={t('block.block')} onPress={() => setConfirm(row.person)} />
                  </View>
                </>
              }
            />
          )
        })
      ) : (
        <EmptyCard colors={colors} title={t('people.noFriendsTitle')} body={t('people.noFriendsBody')}>
          <DidButton colors={colors} small label={t('people.connect')} onPress={() => goHash('/people/connect')} />
        </EmptyCard>
      )}
        </>
      ) : null}

      {links.friends.length ? (
        <DidButton colors={colors} label={t('people.connect')} onPress={() => goHash('/people/connect')} />
      ) : null}
      <KeyButton colors={colors} label={t('people.back')} onPress={() => goHash('/people')} />

      {blocks.length ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: blockedOpen }}
            onPress={() => setBlockedOpen((open) => !open)}
            style={({ pressed }) => [
              styles.famCard,
              { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel },
            ]}
          >
            <View style={styles.famCopy}>
              <Text style={[styles.famName, { color: colors.ink }]}>{t('block.list')} · {blocks.length}</Text>
              <Text style={[styles.famLine, { color: colors.inkDim }]}>{t('block.cannotReach')}</Text>
            </View>
            <Text style={[styles.chev, { color: colors.inkDim }]}>{blockedOpen ? '⌄' : '›'}</Text>
          </Pressable>
          {blockedOpen ? blocks.map((row) => (
            <Reveal key={row.user_id}>
            <PersonCard
              colors={colors}
              person={row}
              name={row.display_name || t('people.noName')}
              line={t('block.cannotReach')}
              actions={
                <KeyButton
                  colors={colors}
                  label={t('block.unblock')}
                  onPress={() =>
                    askFirst(colors, t('block.unblockTitle', { name: row.display_name || t('people.someone') }), t('block.unblockBody'), t('block.unblock'), async () => {
                      const { miss: why } = await unblockPerson(row.user_id)
                      if (why) setMiss(tMiss(why))
                      load()
                    })
                  }
                />
              }
            />
            </Reveal>
          )) : null}
        </>
      ) : null}

      {got.ready ? (
        <>
          <SectionHead colors={colors} label={t('cheersGot.title')} />
          {got.miss ? <Miss colors={colors} onRetry={load}>{got.miss}</Miss> : null}
          {!got.miss && !got.rows.length ? <Meta colors={colors}>{t('cheersGot.empty')}</Meta> : null}
          {got.rows.map((row) => {
            const sender = links.friends.find((f) => f.person.user_id === row.from_id)
            return (
              <View key={row.id}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => (row.cheer_id ? fireCheer(row.cheer_id, 1) : undefined)}
                >
                  <PersonRow
                    colors={colors}
                    title={t('cheersGot.from', { name: row.display_name || t('people.someone') })}
                    note={[t(cheerText(row.cheer_id, 'name')), row.note, gotDay(row.made_at)].filter(Boolean).join(' · ')}
                  />
                </Pressable>
                {sender ? <KeyButton colors={colors} label={t('cheersGot.back')} onPress={() => startCheer(sender.person)} /> : null}
              </View>
            )
          })}
        </>
      ) : null}

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}

      {sheet ? (
        <SendSheet book={book} person={sheet.person} colors={colors} onClose={() => setSheet(null)} onSent={say} />
      ) : null}
      {confirm ? (
        <BlockModal
          person={confirm}
          colors={colors}
          onClose={() => setConfirm(null)}
          onDone={(why, done) => {
            if (why) setMiss(tMiss(why))
            else say(done || t('confirm.blocked', { name: personName(confirm) || t('people.someone') }))
            load()
          }}
        />
      ) : null}
    </ScreenShell>
  )
}

// Today, Yesterday, then the date.
function gotDay(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  if (days <= 0) return t('time.today')
  if (days === 1) return t('time.yesterday')
  return d.toLocaleDateString(dateTag())
}

function FamilyListScreen({ colors }) {
  const account = useAccount()
  const [families, setFamilies] = useKept(`people.families:${account.user?.id}`, [], KEEP)
  const [pop, setPop] = useState(false)
  const [ready, setReady] = useKept(`families.ready:${account.user?.id}`, false, KEEP)
  const [miss, setMiss] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    const rows = await listFamilies()
    // A failed read keeps the families we had and says so.
    if (!rows.miss) setFamilies(rows)
    setMiss(rows.miss ? t('people.reach') : '')
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])
  useLiveReload(['family', 'familyInfo'], load)

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('family.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('people.families')} colors={colors}>
        <LateMeta colors={colors}>{t('family.loading')}</LateMeta>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('people.families')} colors={colors}>
      <OfflineLine colors={colors} />
      <Miss colors={colors}>{miss}</Miss>
      <SectionHead
        colors={colors}
        label={t('people.families')}
        count={families.length || null}
        onAdd={families.length ? () => setPop(true) : undefined}
        addLabel={t('people.join')}
      />
      {families.length ? (
        families.map((fam) => (
          <Pressable
            key={fam.id}
            accessibilityRole="button"
            onPress={() => goHash('/family', { id: fam.id })}
            style={({ pressed }) => [
              styles.famCard,
              { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel },
            ]}
          >
            <Avatar person={{ display_name: fam.name }} colors={colors} />
            <View style={styles.famCopy}>
              <Text style={[styles.famName, { color: colors.ink }]} numberOfLines={1}>
                {fam.name}
              </Text>
              <Text style={[styles.famLine, { color: colors.inkDim }]}>
                {fam.role === 'parent' ? t('people.parent') : t('people.kid')}
              </Text>
            </View>
            <Text style={[styles.chev, { color: colors.inkDim }]}>›</Text>
          </Pressable>
        ))
      ) : (
        <EmptyCard colors={colors} title={t('people.noFamiliesTitle')} body={t('people.noFamiliesBody')}>
          <DidButton colors={colors} small label={t('people.startFamily')} onPress={() => goHash('/people/connect')} />
        </EmptyCard>
      )}
      {families.length ? null : <JoinFamilyCard colors={colors} />}
      {pop ? (
        <AddPop kicker={t('people.join')} colors={colors} onClose={() => setPop(false)}>
          <JoinFamilyCard colors={colors} bare onScan={() => setPop(false)} />
        </AddPop>
      ) : null}
      <KeyButton colors={colors} label={t('family.back')} onPress={() => goHash('/people')} />
    </ScreenShell>
  )
}

// One friend or family member: did yous both ways and the Did wes you
// share. Opened by tapping their card on Friends or in a family.
// A friend's card, small and still, in their look and frame.
function FriendCardArt({ person, size }) {
  const look = LOOK_IDS.includes(person.look_on) ? person.look_on : 'lime'
  const colors = useLookColors(look)
  const frame = FRAME_IDS.has(person.frame_on) ? person.frame_on : ''
  return <FramePreview id={frame} colors={colors} size={size} buddy={BUDDY_IDS.has(person.buddy_on) ? person.buddy_on : ''} />
}

// "Lime look, Frost frame": what the card in the sheet is wearing.
function friendCardLine(person) {
  const look = t(lookText(LOOK_IDS.includes(person.look_on) ? person.look_on : 'lime', 'name'))
  const frame = FRAME_IDS.has(person.frame_on) ? person.frame_on : ''
  return frame ? t('friend.cardLook', { look, frame: t(frameText(frame, 'name')) }) : t('friend.cardLookNone', { look })
}

// A tap shows the card bigger, still, in a sheet.
function FriendCardPreview({ person, name, colors }) {
  const label = t('friend.cardA11y', { name })
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() =>
        publishSheet({
          preview: (
            <View style={styles.cardBig}>
              <FriendCardArt person={person} size={180} />
            </View>
          ),
          title: label,
          body: friendCardLine(person),
          closeLabel: t('settings.close'),
          colors,
          onClose: () => publishSheet(null),
        })
      }
      style={({ pressed }) => pressFx(pressed)}
    >
      <FriendCardArt person={person} size={56} />
    </Pressable>
  )
}

// A private note about this friend. Kept on the phone too, so it shows at
// once and offline; the account copy wins once it loads.
// Questions this person asked you to check on. You can stop any of them.
// From their push (face 'checkon') the Did you opens with the words in.
function CheckOnsFrom({ ownerId, name, face, colors, onAsk }) {
  const [rows, setRows] = useState([])
  const [miss, setMiss] = useState('')
  const opened = useRef(false)
  const [tries, setTries] = useState(0)
  useEffect(() => {
    let live = true
    setMiss('')
    checkOnsFrom(ownerId)
      .then((list) => {
        if (!live) return
        setRows(list)
        if (face === 'checkon' && list.length && !opened.current) {
          opened.current = true
          onAsk(list[0].question)
        }
      })
      .catch(() => live && setMiss(t('people.reach')))
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, face, tries])
  async function stop(row) {
    const res = await stopCheckOn(row.id)
    if (res.miss) return setMiss(tMiss(res.miss))
    setRows((list) => list.filter((item) => item.id !== row.id))
    confirmDone(t('checkOn.stopped'))
  }
  if (!rows.length && !miss) return null
  return (
    <View style={[styles.groupCard, styles.groupPad, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <Text style={[styles.tileNote, { color: colors.inkDim }]}>{t('checkOn.fromTitle', { name })}</Text>
      {rows.map((row) => (
        <View key={row.id} style={styles.checkOnRow}>
          <Text style={[styles.tileNote, { color: colors.ink }]}>{row.question}</Text>
          <Text style={[styles.friendSmall, { color: colors.inkDim }]}>{t('checkOn.fromAt', { time: minuteClock(row.at_minute) })}</Text>
          <View style={styles.checkOnKeys}>
            <KeyButton colors={colors} label={t('friend.sendDidYou')} onPress={() => onAsk(row.question)} />
            <KeyButton colors={colors} label={t('checkOn.stop')} onPress={() => once(`check-on:${row.id}`, () => stop(row))} />
          </View>
        </View>
      ))}
      <Miss colors={colors} onRetry={() => setTries((n) => n + 1)}>{miss}</Miss>
    </View>
  )
}

function FriendNote({ friendId, name, colors }) {
  const account = useAccount()
  const [saved, setSaved] = useKept(`friend.note:${account.user?.id}:${friendId}`, '', KEEP)
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const [miss, setMiss] = useState('')
  useEffect(() => {
    let live = true
    readFriendNote(friendId)
      .then((note) => live && setSaved(note))
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId])
  const editing = draft != null
  async function save() {
    setBusy(true)
    setMiss('')
    const res = await saveFriendNote(friendId, draft)
    setBusy(false)
    if (res.miss) {
      setMiss(tMiss(res.miss))
      return
    }
    setSaved(res.note)
    setDraft(null)
    confirmDone(res.note ? t('friendNote.saved') : t('friendNote.cleared'))
  }
  return (
    <View style={[styles.groupCard, styles.groupPad, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      <Text style={[styles.tileNote, { color: colors.inkDim }]}>{t('friendNote.title')}</Text>
      {editing ? (
        <>
          <Field
            colors={colors}
            label={t('friendNote.label', { name })}
            value={draft}
            onChangeText={(value) => setDraft(value.slice(0, FRIEND_NOTE_MAX))}
            placeholder={t('friendNote.ph')}
            multiline
          />
          <Meta colors={colors}>{t('friendNote.private', { name })}</Meta>
          <Miss colors={colors}>{miss}</Miss>
          <DidButton colors={colors} small label={t('friendNote.save')} disabled={busy} onPress={save} />
          <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => { setDraft(null); setMiss('') }} />
        </>
      ) : saved ? (
        <Pressable onPress={() => setDraft(saved)} accessibilityRole="button" accessibilityHint={t('friendNote.editHint')}>
          <Text selectable style={[styles.friendNoteText, { color: colors.ink }]}>{saved}</Text>
          <Text style={[styles.friendSmall, { color: colors.on }]}>{t('friendNote.edit')}</Text>
        </Pressable>
      ) : (
        <>
          <Meta colors={colors}>{t('friendNote.empty', { name })}</Meta>
          <KeyButton colors={colors} label={t('friendNote.add')} onPress={() => setDraft('')} />
        </>
      )}
    </View>
  )
}

export function FriendScreen({ book, onChange, route }) {
  const colors = useHallColors()
  const account = useAccount()
  const otherId = route?.id || ''
  const purse = normalizePurse(book)
  const [stock, setStock] = useState(null)
  const cheersLeft = stock == null ? purse.friendCheers : stock
  const [person, setPerson] = useKept(`friend.person:${otherId}`, { user_id: otherId }, KEEP)
  // Kept between visits so a revisit opens on the last tab and counts at once.
  const [sends, setSends] = useKept(`friend.sends:${account.user?.id}:${otherId}`, { mine: [], theirs: [], miss: '' }, KEEP)
  const [keptLinks, setKeptLinks] = useKept(`friend.links:${account.user?.id}:${otherId}`, [], KEEP)
  const [ready, setReady] = useKept(`friend.ready:${account.user?.id}:${otherId}`, false, KEEP)
  const [sheet, setSheet] = useState(null)
  const [said, setSaid] = useState('')
  const [bigPhoto, setBigPhoto] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [menu, setMenu] = useState(false)
  // No longer friends or family (removed, or an old notification).
  const [gone, setGone] = useState(false)
  const [tab, setTab] = useState('')
  const [week, setWeek] = useKept(`friend.week:${account.user?.id}:${otherId}`, [], KEEP)
  // Notes they chose to share in the last few nights.
  const [notes, setNotes] = useState([])
  const [loadMiss, setLoadMiss] = useState('')
  const [weekMiss, setWeekMiss] = useState(false)
  const { cards } = useWeTonight(account.user)

  const load = useCallback(async () => {
    if (!account.user || !otherId) return
    let got
    try {
      got = await Promise.all([
        personById(otherId),
        sendsWith(otherId),
        stillLinked(otherId),
        myDidYouLinks().catch(() => []),
        readFriendCheers().catch(() => null),
        friendWeek(otherId, boardDate(new Date())).catch(() => null),
        sharedNotesFrom(otherId).catch(() => []),
      ])
    } catch {
      setLoadMiss(t('people.reach'))
      setReady(true)
      return
    }
    const [who, both, linked, made, serverCheers, nights, shared] = got
    setNotes(shared)
    if (typeof serverCheers === 'number') setStock(serverCheers)
    setWeekMiss(serverCheers === null || nights === null)
    if (Array.isArray(nights)) setWeek(nights)
    setKeptLinks(made.filter((link) => link.kept.some((row) => row.user_id === otherId)))
    // A failed or nameless read keeps the name and photo we already show.
    setPerson((was) => (!who?.miss && personName(who) ? who : was?.user_id ? was : who))
    // A failed read keeps the did yous we had and says so.
    if (both.miss) setLoadMiss(t('people.reach'))
    else {
      setSends(both)
      setLoadMiss('')
    }
    setGone(linked === false)
    setReady(true)
  }, [account.user, otherId])

  useEffect(() => {
    load()
  }, [load])
  useLiveReload(['send', 'sendMoved', 'friend'], load)

  // Same path and limits as the Friends list: one stored cheer per tap,
  // bought five for a gem. Family members go through the family cheer.
  // `about` is a shared note's question when the cheer is for that note.
  function cheer(about) {
    if (cheersLeft < 1 && cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP) return confirmMiss(t('friends.cheerCap', { n: FRIEND_CHEER_CAP }))
    const name = personName(person) || t('people.someone')
    return pickCheer(colors, { name, purse, onGo: (id) => cheerWith(about, id) })
  }

  function cheerWith(about, cheerId) {
    if (cheersLeft < 1) {
      if (purse.gems < FRIEND_CHEER_GEMS) return offerMoreGems(colors)
      // Buying is for this cheer: once the five land, this one goes.
      return confirmFriendCheers(colors, () => once('buy-cheers', async () => {
        if (await buyCheersNow()) await cheerNow(typeof about === 'string' ? about : '', cheerId)
      }))
    }
    return once(`cheer:${otherId}`, () => cheerNow(typeof about === 'string' ? about : '', cheerId))
  }

  async function cheerNow(about = '', cheerId = purse.cheerOn) {
    let sent = await cheerFriend(book, otherId, cheerId, about)
    if (sent.miss === 'notFriend') sent = await cheerFamily(book, otherId, '', cheerId)
    const known = friendCheerMissKey(sent.miss)
    if (known) return setSaid(t(known.key, known.vars))
    if (sent.miss) return setSaid(tMiss(sent.miss))
    setStock(normalizePurse(sent.book).friendCheers)
    if (onChange) onChange(sent.book)
    fireCheer(cheerId, 1)
    setSaid('')
    return confirmDone(t('family.cheerSent', { name: personName(person) || t('people.someone') }))
  }

  // True once the five cheers are bought.
  async function buyCheersNow() {
    const bought = await buyCheers(book)
    if (bought.miss === 'gems') {
      offerMoreGems(colors)
      return false
    }
    const known = friendCheerMissKey(bought.miss)
    if (known || bought.miss) {
      setSaid(known ? t(known.key, known.vars) : tMiss(bought.miss))
      return false
    }
    setStock(normalizePurse(bought.book).friendCheers)
    if (onChange) onChange(bought.book)
    return true
  }

  if (!account.user) return <NeedAccount kicker={t('people.friends')} title={t('people.outTitle')} colors={colors} />
  const name = personName(person) || t('people.someone')
  const shownName = personName(person) || t('people.noName')
  const together = (cards || []).filter((card) =>
    (card.people || []).some((p) => p.id === otherId && p.state !== 'left'),
  )

  // No tab until the sends are in, so it does not open on one and jump.
  const shown = !ready
    ? ''
    : tab ||
    (sends.theirs.some((send) => send.state === 'sent')
      ? 'theirs'
      : sends.theirs.length
        ? 'theirs'
        : sends.mine.length || keptLinks.length
          ? 'mine'
          : together.length
            ? 'we'
            : 'theirs')

  if (gone) {
    return (
      <ScreenShell title={shownName} colors={colors}>
        <EmptyCard colors={colors} title={t('friend.goneTitle', { name })} body={t('friend.goneBody', { name })}>
          <DidButton colors={colors} small label={t('people.seeAll')} onPress={() => goHash('/friends')} />
        </EmptyCard>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={shownName} colors={colors}>
      <OfflineLine colors={colors} />
      <View style={[styles.confirmWho, styles.friendCard, { backgroundColor: colors.panel, borderColor: colors.line }]}>
        <Pressable
          disabled={!person?.avatar_url}
          onPress={() => setBigPhoto(true)}
          accessibilityRole="imagebutton"
          accessibilityLabel={t('friend.photoBig', { name })}
        >
          <Avatar person={person} done={doneTonight(person)} colors={colors} size={52} />
        </Pressable>
        <View style={styles.confirmCopy}>
          <Text style={[styles.tileNote, { color: colors.inkDim }]}>{friendLine(person)}</Text>
          {week.length === 7 && week.some((night) => night.cleared) ? (
            <View
              style={styles.friendWeek}
              accessible
              accessibilityLabel={t('friend.weekA11y', { name, n: week.filter((night) => night.cleared).length })}
            >
              {week.map((night) => (
                <View
                  key={night.night}
                  style={[styles.friendWeekDot, { backgroundColor: night.cleared ? colors.on : colors.open }]}
                />
              ))}
            </View>
          ) : weekMiss ? (
            <Text style={[styles.tileNote, { color: colors.inkDim }]}>{t('people.reach')}</Text>
          ) : null}
        </View>
        {typeof person?.look_on === 'string' ? <FriendCardPreview person={person} name={name} colors={colors} /> : null}
        <Pressable
          onPress={() => setMenu(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('friend.more', { name })}
          style={({ pressed }) => [styles.moreBtn, { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel }]}
        >
          <Text style={[styles.moreText, { color: colors.inkSoft }]}>⋯</Text>
        </Pressable>
      </View>
      {bigPhoto && person?.avatar_url ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setBigPhoto(false)}>
          <Pressable
            style={[styles.veil, styles.photoVeil, { backgroundColor: colors.veil }]}
            onPress={() => setBigPhoto(false)}
            accessibilityRole="button"
            accessibilityLabel={t('settings.close')}
          >
            <Image source={{ uri: person.avatar_url }} style={styles.bigPhoto} resizeMode="cover" />
            <Text style={[styles.confirmName, { color: colors.ink }]}>{name}</Text>
          </Pressable>
        </Modal>
      ) : null}
      <View style={styles.friendPrimary}>
        <DidButton colors={colors} label={t('friend.sendDidYou')} onPress={() => setSheet({ person })} />
        <Text style={[styles.friendHint, { color: colors.inkDim }]}>{t('friend.didYouHint', { name })}</Text>
      </View>
      <View style={styles.friendWeRow}>
        <KeyButton colors={colors} label={t('friend.startDidWe')} onPress={() => goHash('/we/new', { id: otherId })} />
      </View>
      <View style={styles.friendMinor}>
        <View style={styles.friendAction}>
          <KeyButton
            colors={colors}
            label={cheersLeft < 1 ? t('friends.cheerBuyShort') : t('friends.cheerUse')}
            disabled={cheersLeft < 1 && cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP}
            onPress={cheer}
          />
          {cheersLeft > 0 ? (
            <Text style={[styles.friendSmall, { color: colors.inkDim }]}>{t('friend.cheersLeft', { n: cheersLeft })}</Text>
          ) : (
            <Text style={[styles.friendSmall, { color: colors.inkDim }]}>{t('friend.noCheersLeft')}</Text>
          )}
        </View>
        <View style={styles.friendAction}>
          <KeyButton colors={colors} label={t('gift.button')} onPress={() => goHash('/gift', { id: otherId })} />
        </View>
      </View>
      {notes.length ? (
        <View style={[styles.sharedList, { borderColor: colors.lineSoft }]}>
          <Cap colors={colors}>{t('sharedNote.fromFriend', { name })}</Cap>
          {notes.map((row) => (
            <View key={`${row.lamp_id}:${row.period_key}`} style={styles.sharedNote}>
              <Text style={[styles.friendSmall, styles.sharedNoteText, { color: colors.ink }]}>
                {row.question ? `${row.question}: ` : ''}
                {row.note}
              </Text>
              <KeyButton colors={colors} label={t('sharedNote.cheer')} onPress={() => cheer(row.question || '')} />
            </View>
          ))}
        </View>
      ) : null}
      <FriendNote friendId={otherId} name={name} colors={colors} />
      <CheckOnsFrom
        ownerId={otherId}
        name={name}
        face={route?.face || ''}
        colors={colors}
        onAsk={(question) => setSheet({ person, question })}
      />
      {said ? <Meta colors={colors}>{said}</Meta> : null}
      {menu ? (
        <FriendMenu
          name={name}
          colors={colors}
          onClose={() => setMenu(false)}
          items={[
            {
              key: 'drop',
              label: t('people.drop'),
              onPress: () =>
                askRemoveFriend({
                  person,
                  colors,
                  onMiss: setSaid,
                  onDone: (words) => {
                    confirmDone(words)
                    refreshPeople()
                    swapHash('/friends')
                  },
                }),
            },
            { key: 'block', label: t('block.block'), danger: true, onPress: () => setBlocking(true) },
            ...(person.avatar_url
              ? [
                  {
                    key: 'photo',
                    label: t('avatar.report'),
                    danger: true,
                    onPress: () =>
                      publishSheet({
                        title: t('avatar.reportTitle', { name }),
                        body: t('avatar.reportBody'),
                        goLabel: t('avatar.report'),
                        closeLabel: t('settings.neverMind'),
                        colors,
                        onClose: () => publishSheet(null),
                        onGo: () =>
                          once('block:' + otherId, async () => {
                            publishSheet(null)
                            const { miss: why } = await blockPerson(otherId, 'photo')
                            if (why) return confirmMiss(tMiss(why))
                            confirmDone(t('confirm.blocked', { name }))
                            refreshPeople()
                            return swapHash('/friends')
                          }),
                      }),
                  },
                ]
              : []),
          ]}
        />
      ) : null}
      {blocking ? (
        <BlockModal
          person={person}
          colors={colors}
          onClose={() => setBlocking(false)}
          onDone={(why, done) => {
            if (why && why !== 'block.familyMiss') return setSaid(tMiss(why))
            confirmDone(why ? tMiss(why) : done || t('confirm.blocked', { name }))
            refreshPeople()
            return swapHash('/friends')
          }}
        />
      ) : null}

      {!ready ? <LateMeta colors={colors}>{t('family.loading')}</LateMeta> : null}
      <Miss colors={colors}>{loadMiss}</Miss>
      {ready ? (
      <View style={styles.friendTabs}>
        <KitSegment
          items={[
            { id: 'theirs', label: t('friend.tabTheirs', { n: sends.theirs.length }) },
            { id: 'mine', label: t('friend.tabMine', { n: sends.mine.length + keptLinks.length }) },
            { id: 'we', label: t('friend.tabWe', { n: together.length }) },
          ]}
          selected={shown}
          onSelect={setTab}
          colors={colors}
        />
      </View>
      ) : null}
      {shown === 'theirs' ? (
        <>
      {sends.theirs.length ? (
        sends.theirs.map((send) => (
          <PersonRow
            key={send.id}
            colors={colors}
            title={askShown(send.question)}
            note={[repeatLabel(send.repeat), sendLastLine(send.repeat, send.last_did_on, boardDate()), theirSendState(send.state)].filter(Boolean).join(' · ')}
          >
            {send.state === 'sent' ? (
              <KeyButton colors={colors} label={t('inbox.kicker')} onPress={() => goHash('/inbox')} />
            ) : null}
          </PersonRow>
        ))
      ) : (
        <>
          <Meta colors={colors}>{ready ? t('friend.theySentNone', { name }) : t('family.loading')}</Meta>
        </>
      )}

        </>
      ) : null}
      {shown === 'mine' ? (
        <>
      {sends.mine.length || keptLinks.length ? (
        [...keptLinks.map((link) => (
          <PersonRow key={link.code} colors={colors} title={askShown(link.question)} note={t('friend.linkKept')} />
        )), ...sends.mine.map((send) => (
          <PersonRow
            key={send.id}
            colors={colors}
            title={askShown(send.question)}
            note={[repeatLabel(send.repeat), sendLastLine(send.repeat, send.last_did_on, boardDate()), sentState(send.state, personName(person) || '', send.answers)].filter(Boolean).join(' · ')}
          >
            {send.state === 'sent' ? (
              <KeyButton
                colors={colors}
                label={t('sent.takeBack')}
                onPress={() => once(`take-back:${send.id}`, async () => {
                  const { miss: why } = await takeBack(send.id)
                  setSaid(why ? tMiss(why) : '')
                  if (!why) confirmDone(t('confirm.takenBack'))
                  load()
                })}
              />
            ) : null}
          </PersonRow>
        ))]
      ) : (
        <>
          <Meta colors={colors}>{ready ? t('friend.youSentNone', { name }) : t('family.loading')}</Meta>
        </>
      )}
        </>
      ) : null}
      {shown === 'we' ? (
        <>
      {together.length ? (
        together.map((card) => (
          <Row
            key={card.id}
            colors={colors}
            label={card.question}
            note={card.myState === 'asked' ? t('we.asked') : ''}
            onPress={() => goHash('/we', { id: card.id })}
          />
        ))
      ) : (
        <Meta colors={colors}>{t('friend.togetherNone', { name })}</Meta>
      )}
        </>
      ) : null}

      {sheet?.person ? (
        <SendSheet book={book}
          person={sheet.person}
          initialQuestion={sheet.question || ''}
          colors={colors}
          onClose={() => setSheet(null)}
          onSent={(words) => {
            setSaid(words)
            load()
          }}
        />
      ) : null}
    </ScreenShell>
  )
}

// A did you they sent you, from your side.
function theirSendState(state) {
  if (state === 'kept') return t('friend.youKept')
  if (state === 'passed') return t('friend.youPassed')
  return t('friend.waitingOnYou')
}

export function FamilyScreen({ book, onChange, route }) {
  const colors = useHallColors()
  const familyId = route?.id || ''
  if (familyId) {
    return (
      <BoardShell book={book} title={t('family.kicker')} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>
        <FamilyDetailScreen book={book} onChange={onChange} familyId={familyId} colors={colors} />
      </BoardShell>
    )
  }
  return <FamilyListScreen colors={colors} />
}

export function InboxScreen({ book, onChange, onKeep, route }) {
  const colors = useHallColors()
  const account = useAccount()
  const [rows, setRows] = useKept(`inbox.rows:${account.user?.id}`, [], KEEP)
  const [ready, setReady] = useKept(`inbox.ready:${account.user?.id}`, false, KEEP)
  const [miss, setMiss] = useState('')
  const [menu, setMenu] = useState(null)
  const [sending, setSending] = useState(false)
  // Keep or Pass tapped on the notification: keep:<send id> or pass:<send id>.
  const fromPush = /^(keep|pass):([0-9a-f-]{36})$/.exec(String(route?.id || ''))
  // The push answered last, so a second notification tap on an open inbox still runs.
  const pushDone = useRef('')
  const reloading = useRef('')
  const routeId = useRef(route?.id)
  routeId.current = route?.id
  // The push whose own load finished: the rows before it can be older.
  const [loaded, setLoaded] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      // Family did yous and allowed friends go onto tonight first.
      await refreshPeople()
      const inbox = await listInbox()
      // A failed read keeps the rows we had.
      if (inbox.miss) throw new Error(inbox.miss)
      setRows(inbox)
      setMiss('')
      dismissReadPushes(inbox.map((row) => row.id))
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
    setLoaded(String(routeId.current || ''))
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])
  useLiveReload(['ask', 'gift'], load)

  useEffect(() => {
    if (!fromPush || pushDone.current === route.id || !ready) return
    const row = rows.find((item) => item.id === fromPush[2])
    // Not in the inbox (added, answered on another phone, taken back): answer
    // it anyway, so the tap says already or gone instead of nothing.
    if (!row && loaded !== route.id) {
      if (ready && reloading.current !== route.id) {
        reloading.current = route.id
        load()
      }
      return
    }
    // The inbox did not load: a Keep now would land on the account but not
    // on this phone. Wait for a working load (the miss line has Retry).
    if (!row && miss && fromPush[1] === 'keep') return
    pushDone.current = route.id
    answer(row || { id: fromPush[2] }, fromPush[1] === 'keep')
  }, [rows, ready, loaded, route?.id, miss])

  // A cheer plays once when its row shows up, not on Thanks. Several play one
  // after another (the burst shows one at a time), at most three.
  const played = useRef(new Set())
  const cheerTimers = useRef([])
  const cheerAt = useRef(0)
  const cheerCount = useRef(0)
  useEffect(() => () => cheerTimers.current.forEach(clearTimeout), [])
  useEffect(() => {
    if (!ready) return
    let wait = Math.max(0, cheerAt.current - Date.now())
    for (const row of rows) {
      if (row.kind !== 'cheer' || !row.cheer_id || played.current.has(row.id)) continue
      played.current.add(row.id)
      if (cheerCount.current >= 3) continue
      cheerCount.current += 1
      const kind = row.cheer_id
      cheerTimers.current.push(setTimeout(() => fireCheer(kind, 1), wait))
      wait += holdFor(kind, 1) + 260
    }
    cheerAt.current = Date.now() + wait
  }, [rows, ready])

  // One answer at a time per row, so a double tap cannot keep it twice.
  const answering = useRef(new Set())
  const [sendingId, setSendingId] = useState(null)
  async function answer(row, keep) {
    if (answering.current.has(row.id)) return
    answering.current.add(row.id)
    setSendingId(row.id)
    setMiss('')
    let res
    try {
      res = await answerSend(row.id, keep)
    } catch {
      res = { miss: 'confirm.miss' }
    } finally {
      answering.current.delete(row.id)
      setSendingId(null)
    }
    const { miss: why, already } = res
    if (why) {
      setMiss(tMiss(why))
      return why === 'sent.gone' ? load() : undefined
    }
    if (already) {
      // Kept elsewhere, but the question never landed on this shelf.
      if (keep && row.kind === 'todo' && onKeep && keptButMissing(res, row.id)) onKeep(row)
      return load()
    }
    if (keep && row.kind === 'todo' && onKeep) onKeep(row)
    if (row.kind === 'todo') confirmDone(keep ? t('didYouLink.added') : t('confirm.passed'))
    return load()
  }

  const cheerRows = rows.filter((row) => row.kind === 'cheer')
  const [thanking, setThanking] = useState(false)
  async function thankAll() {
    if (thanking) return
    setThanking(true)
    setMiss('')
    let why = ''
    try {
      for (const row of cheerRows) {
        if (answering.current.has(row.id)) continue
        answering.current.add(row.id)
        const res = await answerSend(row.id, true).catch(() => ({ miss: 'confirm.miss' }))
        answering.current.delete(row.id)
        if (res?.miss && res.miss !== 'sent.gone') {
          why = res.miss
          break
        }
      }
    } finally {
      setThanking(false)
    }
    await load()
    if (why) setMiss(tMiss(why))
  }

  // Filed with the question and taken out of the inbox. Blocking stays on
  // the person's sheet.
  function report(row) {
    publishSheet({
      title: t('we.reportTitle'),
      body: t('we.reportBody'),
      goLabel: t('we.report'),
      closeLabel: t('settings.neverMind'),
      colors,
      onClose: () => publishSheet(null),
      onGo: () =>
        once('we-report:' + row.id, async () => {
          publishSheet(null)
          const { miss: why } = await reportSend(row.id).catch(() => ({ miss: 'people.reach' }))
          if (why) setMiss(tMiss(why))
          else confirmDone(t('we.reported'))
          load()
        }),
    })
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('inbox.kicker')} title={t('inbox.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('inbox.title')} colors={colors}>
        <LateMeta colors={colors}>{t('family.loading')}</LateMeta>
      </ScreenShell>
    )
  }
  if (!rows.length && miss) {
    return (
      <ScreenShell title={t('inbox.title')} colors={colors} onRefresh={load}>
        <Miss colors={colors} onRetry={load}>{miss}</Miss>
      </ScreenShell>
    )
  }
  if (!rows.length) {
    return (
      <ScreenShell title={t('inbox.emptyTitle')} colors={colors} onRefresh={load}>
        <WeAsks colors={colors} />
        <Meta colors={colors}>{t('inbox.emptyBody')}</Meta>
        <Meta colors={colors}>{t('inbox.autoNote')}</Meta>
        <DidButton colors={colors} label={t('friend.sendDidYou')} onPress={() => setSending(true)} />
        <KeyButton colors={colors} label={t('people.addOne')} onPress={() => goHash('/people/connect')} />
        {sending ? (
          <SendSheet book={book} person={null} pick colors={colors} onClose={() => setSending(false)} onSent={(words) => confirmDone(words)} />
        ) : null}
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('inbox.title')} colors={colors} onRefresh={load}>
      <OfflineLine colors={colors} />
      <WeAsks colors={colors} />
      {rows.some((row) => row.kind === 'todo') ? <Meta colors={colors}>{t('inbox.hintAll')}</Meta> : null}
      {/* Above the cards so a failed Keep is seen on a long inbox. */}
      <Miss colors={colors} onRetry={load}>{miss}</Miss>
      {cheerRows.length > 1 ? (
        <DidButton colors={colors} label={t('inbox.thanksAll', { n: cheerRows.length })} disabled={thanking} onPress={thankAll} />
      ) : null}
      {rows.map((row) => (
        <Reveal key={row.id}>
        <View pointerEvents={sendingId === row.id ? 'none' : 'auto'} accessibilityState={{ busy: sendingId === row.id }} style={sendingId === row.id ? { opacity: 0.5 } : null}>
        <PersonRow
          colors={colors}
          person={row.person}
          title={row.kind === 'cheer' ? cheerTitle(row) : askShown(row.question)}
          note={[t('inbox.from', { name: personName(row.person) || t('people.someone') }), repeatLabel(row.repeat), sendLastLine(row.repeat, row.last_did_on, boardDate()), row.wants_photo ? t('proof.pleaseMark') : '', row.note]
            .filter(Boolean)
            .join(' · ')}
        >
          <DidButton
            colors={colors}
            small
            label={row.kind === 'cheer' ? t('inbox.thanks') : t('inbox.keep')}
            onPress={() => answer(row, true)}
          />
          {/* Both choices on the card, so No thanks is a real button and not hidden in a menu. */}
          {row.kind === 'todo' ? <KeyButton colors={colors} label={t('inbox.pass')} onPress={() => answer(row, false)} /> : null}
          {row.kind === 'todo' && !row.appSend ? (
            <Pressable
              onPress={() => setMenu(row)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('inbox.more')}
              style={({ pressed }) => [styles.moreBtn, { borderColor: colors.line, backgroundColor: pressed ? colors.panel2 : colors.panel }]}
            >
              <Text style={[styles.moreText, { color: colors.inkSoft }]}>⋯</Text>
            </Pressable>
          ) : null}
        </PersonRow>
        </View>
        </Reveal>
      ))}
      <KeyButton colors={colors} label={t('people.pingsGo')} onPress={() => goHash('/pings', { id: 'friends' })} />
      {menu ? (
        <FriendMenu
          name={menu.question}
          colors={colors}
          onClose={() => setMenu(null)}
          items={[{ key: 'report', label: t('we.report'), danger: true, onPress: () => report(menu) }]}
        />
      ) : null}
    </ScreenShell>
  )
}

export function SentScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [rows, setRows] = useKept(`sent.rows:${account.user?.id}`, [], KEEP)
  const [links, setLinks] = useKept(`sent.links:${account.user?.id}`, [], KEEP)
  // Photos the people you asked added to their Did, one read for the screen.
  const [proofs, setProofs] = useState([])
  const [ready, setReady] = useKept(`sent.ready:${account.user?.id}`, false, KEEP)
  const [miss, setMiss] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  // Link Did you's are kept here, so texting one starts here too.
  const [texting, setTexting] = useState(false)
  const [hidden, setHidden] = useState(() => readSentHidden(account.user?.id))
  useEffect(() => {
    setHidden(readSentHidden(account.user?.id))
  }, [account.user?.id])
  const hiddenSet = new Set(hidden)
  const shownRows = rows.filter((row) => !hiddenSet.has(`s:${row.id}`))
  const shownLinks = links.filter((link) => !hiddenSet.has(`l:${link.code}`))
  const finished = [
    ...shownRows.filter((row) => row.state === 'kept' || row.state === 'passed').map((row) => `s:${row.id}`),
    ...shownLinks.filter((link) => link.ended).map((link) => `l:${link.code}`),
  ]
  const clearedCount = rows.length + links.length - shownRows.length - shownLinks.length

  function setHiddenKept(next) {
    setHidden(next)
    keepSentHidden(account.user?.id, next)
  }

  async function saveEdit() {
    if (busy || !editing) return
    const { text, miss: why } = cleanSentEdit(editing.text)
    if (why) {
      setMiss(t(why))
      return
    }
    setBusy(true)
    setMiss('')
    const out = await editSend(editing.id, text)
    setBusy(false)
    if (out.miss) setMiss(tMiss(out.miss))
    else {
      setEditing(null)
      confirmDone(t('sent.edited'))
    }
    load()
  }

  function askStopLink(link) {
    askFirst(colors, t('sent.stopTitle'), t('sent.stopBody'), t('sent.stopLink'), async () => {
      setMiss('')
      const out = await endDidYouLink(link.code)
      if (out.miss) setMiss(tMiss(out.miss))
      else confirmDone(t('sent.linkStopped'))
      load()
    })
  }

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [sent, made] = await Promise.all([listSent(), myDidYouLinks()])
      if (!sent.miss) {
        setRows(sent)
        const kept = sent.filter((row) => row.state === 'kept' && row.kind === 'todo').map((row) => row.id)
        loadProofs({ sendIds: kept })
          .then((out) => {
            if (!out.miss) setProofs(out.rows)
          })
          .catch(() => {})
      }
      setLinks(made)
      setMiss(sent.miss ? t('people.reach') : '')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])
  useLiveReload(['send', 'sendMoved'], load)

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('sent.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('sent.title')} colors={colors} onRefresh={load}>
        <LateMeta colors={colors}>{t('family.loading')}</LateMeta>
      </ScreenShell>
    )
  }
  if (!shownRows.length && !shownLinks.length) {
    return (
      <ScreenShell title={t('sent.title')} colors={colors} onRefresh={load}>
        <View style={styles.sentTop}>
          <KeyButton colors={colors} label={t('didYouLink.textTitle')} onPress={() => setTexting(true)} />
        </View>
        <EmptyCard colors={colors} title={t('sent.emptyTitle')} body={t('sent.emptyBody')}>
          <DidButton colors={colors} small label={t('sent.goFriends')} onPress={() => goHash('/friends')} />
          {clearedCount ? (
            <KeyButton colors={colors} label={t('sent.bringBack', { n: clearedCount })} onPress={() => setHiddenKept([])} />
          ) : null}
        </EmptyCard>
        <Miss colors={colors} onRetry={load}>{miss}</Miss>
        {texting ? (
          <SendSheet book={book} person={null} colors={colors} onClose={() => { setTexting(false); load() }} onSent={(words) => confirmDone(words)} />
        ) : null}
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('sent.title')} colors={colors} onRefresh={load}>
      <OfflineLine colors={colors} />
      <View style={styles.sentTop}>
        <KeyButton colors={colors} label={t('didYouLink.textTitle')} onPress={() => setTexting(true)} />
      </View>
      {texting ? (
        <SendSheet book={book} person={null} colors={colors} onClose={() => { setTexting(false); load() }} onSent={(words) => confirmDone(words)} />
      ) : null}
      <View style={[styles.groupCard, styles.groupPad, { borderColor: colors.line, backgroundColor: colors.panel }]}>
        <Text style={[styles.famName, { color: colors.ink }]}>{t('sent.count', { n: shownRows.length + shownLinks.length })}</Text>
        <Text style={[styles.famLine, { color: colors.inkDim }]}>{t('sent.hint')}</Text>
        {finished.length || clearedCount ? (
          <View style={styles.personActions}>
            {finished.length ? (
              <KeyButton
                colors={colors}
                label={t('sent.clearFinished', { n: finished.length })}
                onPress={() => {
                  setHiddenKept([...hidden, ...finished])
                  confirmDone(t('sent.cleared', { n: finished.length }))
                }}
              />
            ) : null}
            {clearedCount ? (
              <KeyButton colors={colors} label={t('sent.bringBack', { n: clearedCount })} onPress={() => setHiddenKept([])} />
            ) : null}
          </View>
        ) : null}
      </View>
      {shownRows.length ? (
      <View style={[styles.groupCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
      {shownRows.map((row, at) => (
        <Reveal key={row.id} style={[styles.sentRow, at ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line } : null]}>
          <View style={styles.personHead}>
          <Avatar person={row.person} colors={colors} size={36} />
          <View style={[styles.personCopy, styles.personCopyFlex]}>
            <Text style={[styles.personTitle, { color: colors.ink }]}>{row.kind === 'cheer' ? t('inbox.aCheer') : askShown(row.question)}</Text>
            <Text style={[styles.personNote, { color: colors.inkDim }]}>
              {[t('sent.to', { name: personName(row.person) || t('people.someone') }), repeatLabel(row.repeat), sendLastLine(row.repeat, row.last_did_on, boardDate()), row.wants_photo ? t('proof.pleaseMark') : '', sentState(row.state, undefined, row.answers)]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          </View>
          {proofs
            .filter((proof) => proof.send_id === row.id)
            .slice(0, 3)
            .map((proof) => (
              <ProofRow
                key={proof.id}
                row={proof}
                name={personName(row.person) || t('people.someone')}
                day={formatBoardDate(proof.night)}
                colors={colors}
                onOpen={() => openProofView({ row: proof, mine: false, name: personName(row.person) || t('people.someone'), colors, onGone: load })}
              />
            ))}
          {canEditSent(row) || row.state === 'sent' ? (
          <View style={styles.personActions}>
          {canEditSent(row) ? (
            <KeyButton colors={colors} label={t('sent.edit')} onPress={() => {
              setMiss('')
              setEditing({ id: row.id, text: row.question })
            }} />
          ) : null}
          {row.state === 'sent' ? (
            <KeyButton
              colors={colors}
              label={t('sent.takeBack')}
              onPress={() => askFirst(colors, t('sent.takeBack'), t('sent.takeBackBody'), t('sent.takeBack'), () => once(`take-back:${row.id}`, async () => {
                setMiss('')
                const { miss: why } = await takeBack(row.id)
                if (why) setMiss(tMiss(why))
                else confirmDone(t('confirm.takenBack'))
                load()
              }))}
            />
          ) : null}
          </View>
          ) : null}
        </Reveal>
      ))}
      </View>
      ) : null}
      {shownLinks.length ? (
        <>
          <Cap colors={colors}>{t('sent.linksCap')}</Cap>
          <View style={[styles.groupCard, { borderColor: colors.line, backgroundColor: colors.panel }]}>
            {shownLinks.map((link, at) => (
              <Reveal key={link.code} style={[styles.sentRow, at ? { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.line } : null]}>
                <View style={styles.personCopy}>
                  <Text style={[styles.personTitle, { color: colors.ink }]}>{askShown(link.question)}</Text>
                  <Text style={[styles.personNote, { color: colors.inkDim }]}>
                    {link.ended ? `${linkKeptLine(link)} · ${t('sent.stoppedNote')}` : linkKeptLine(link)}
                  </Text>
                </View>
                {link.ended ? null : (
                  <View style={styles.personActions}>
                    <KeyButton colors={colors} label={t('sent.stopLink')} onPress={() => askStopLink(link)} />
                  </View>
                )}
              </Reveal>
            ))}
          </View>
        </>
      ) : null}
      {editing ? null : <Miss colors={colors} onRetry={load}>{miss}</Miss>}
      {editing ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditing(null)}>
          <Pressable accessible={false} style={[styles.veil, { backgroundColor: colors.veil }]} onPress={() => setEditing(null)}>
            <KeyboardLift style={styles.editLift}>
              <Pressable
                accessible={false}
                style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]}
                onPress={(event) => event.stopPropagation()}
              >
                <Text style={[styles.popKicker, { color: colors.on }]}>{t('sent.editTitle')}</Text>
                <Field
                  colors={colors}
                  label={t('people.sendWhat')}
                  value={editing.text}
                  maxLength={200}
                  autoFocus
                  onChangeText={(text) => setEditing({ ...editing, text })}
                  returnKeyType="done"
                  onSubmitEditing={busy ? undefined : saveEdit}
                />
                <Miss colors={colors}>{miss}</Miss>
                <View style={styles.personActions}>
                  <DidButton colors={colors} small label={t('sent.editSave')} disabled={busy} onPress={saveEdit} />
                  <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setEditing(null)} />
                </View>
              </Pressable>
            </KeyboardLift>
          </Pressable>
        </Modal>
      ) : null}
    </ScreenShell>
  )
}

// Who kept a Did you you shared as a link.
function linkKeptLine(link) {
  if (!link.kept.length) return t('sent.keptNone')
  return t('sent.keptBy', { names: link.kept.map((row) => row.name || t('sent.keptAnon')).join(', ') })
}

// A Did you shown on its own reads as the whole question: "Did you call mom?"
function askShown(question) {
  return weQuestion(didYouAsk(question, t('people.sendWhat')))
}

const styles = StyleSheet.create({
  // A tab body: the page gap does not reach inside a wrapper, so it keeps its own.
  tabBody: { gap: 12 },
  // The 180 preview tile is 216 tall around a ~143 tall card; the box fits the
  // card plus frame overhang so the sheet has no empty band under it.
  cardBig: { width: '100%', height: 184, alignItems: 'center', justifyContent: 'center' },
  groupCard: { borderWidth: 1, borderRadius: radius.rSm, overflow: 'hidden', marginBottom: 12 },
  groupPad: { padding: 14, gap: 8 },
  editLift: { justifyContent: 'center' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  // Text wraps full width; buttons sit on their own line under it.
  sentRow: { gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  previewList:{ gap: 8, marginTop: 12, marginBottom: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: radius.rSm, padding: 12 },
  previewIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewCopy: { flex: 1, minWidth: 0, gap: 2 },
  previewTitle: { fontFamily: fonts.uiSemi, fontSize: 14 },
  previewBody: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 },
  previewOther: { marginTop: 14 },
  joinCard: { alignItems: 'flex-end' },
  joinBare: { gap: 4 },
  joinField: { flex: 1 },
  cap: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  personRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 8,
  },
  askRow: {
    borderWidth: 2,
  },
  personCopy: { gap: 4 },
  personHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personCopyFlex: { flex: 1 },
  personTitle: { fontFamily: fonts.uiSemi, fontSize: 15 },
  personNote: { fontFamily: fonts.ui, fontSize: 13 },
  personActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moreBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fonts.uiBold, fontSize: 20, lineHeight: 22 },
  menuRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 8 },
  menuRowText: { fontFamily: fonts.uiSemi, fontSize: 16 },
  wallRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  wallCopy: { flex: 1, gap: 4 },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lineLabel: { fontFamily: fonts.ui, fontSize: 13, flex: 1 },
  flagBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  cheerTally: { fontFamily: fonts.ui, fontSize: 13 },
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  confirmWho: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  friendCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 16 },
  friendPrimary: { marginBottom: 14 },
  friendMinor: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  friendWeRow: { marginBottom: 8 },
  checkOnRow: { gap: 4 },
  checkOnKeys: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sentTop: { alignSelf: 'flex-end' },
  friendSmall: { fontFamily: fonts.ui, fontSize: 12, textAlign: 'center', marginTop: 6 },
  friendWeek: { flexDirection: 'row', gap: 5, marginTop: 6 },
  friendWeekDot: { width: 8, height: 8, borderRadius: 4 },
  friendAction: { flex: 1, flexBasis: 0 },
  sharedList: { gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  sharedNote: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sharedNoteText: { flex: 1, textAlign: 'left', marginTop: 0 },
  friendTabs: { marginBottom: 12 },
  friendHint: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8, paddingHorizontal: 4 },
  confirmCopy: { flex: 1, minWidth: 0, gap: 2 },
  confirmName: { fontFamily: fonts.uiBold, fontSize: 18 },
  confirmLine: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4, minHeight: 96 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileChev: { fontFamily: fonts.ui, fontSize: 20, lineHeight: 20 },
  tileLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  tileValue: { fontFamily: fonts.uiBold, fontSize: 16, lineHeight: 21 },
  tileNote: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  friendNoteText: { fontFamily: fonts.ui, fontSize: 15, lineHeight: 21 },
  friendIdCard: { gap: 6, alignItems: 'flex-start' },
  idButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoVeil: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  bigPhoto: { width: 280, height: 280, borderRadius: 140 },
  qrBox: { alignSelf: 'stretch', alignItems: 'center', gap: 8, paddingVertical: 8 },
  friendId: { fontFamily: fonts.mono, fontSize: 22, letterSpacing: 1 },
  friendIdSmall: { fontSize: 15 },
  glance: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  strip: { gap: 14, paddingRight: 8, paddingBottom: 4 },
  stripItem: { width: 64, alignItems: 'center', gap: 4 },
  stripName: { fontFamily: fonts.uiSemi, fontSize: 12, maxWidth: 64, textAlign: 'center' },
  stripLine: { fontFamily: fonts.ui, fontSize: 11, maxWidth: 64 },
  famCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  famCopy: { flex: 1, minWidth: 0, gap: 3 },
  famName: { fontFamily: fonts.uiBold, fontSize: 16 },
  famLine: { fontFamily: fonts.ui, fontSize: 13 },
  chev: { fontFamily: fonts.ui, fontSize: 22 },
  stockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  stockCopy: { flex: 1, minWidth: 0, gap: 3 },
  stockValue: { fontFamily: fonts.uiBold, fontSize: 16 },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
})
