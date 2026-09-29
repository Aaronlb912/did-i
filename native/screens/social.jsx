import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { cloudSetUp, supabaseSqlUrl } from '../../src/lib/cloud.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { passAlong } from '../../src/lib/native.js'
import {
  INVITE_GEMS_CAP,
  INVITE_LOOK_AT,
  invitePayoutNote,
  answerSend,
  askFriend,
  blockPerson,
  claimInvites,
  cleanCode,
  cleanPhone,
  doneTonight,
  formatPhone,
  dropFriend,
  friendAskNote,
  friendAskTitle,
  giftCheer,
  inboxCount,
  joinFamily,
  listBlocks,
  listFamilies,
  listFriends,
  listAutoAdds,
  listInbox,
  listSent,
  makeFamily,
  syncDisplayName,
  myInvite,
  personName,
  readMine,
  refreshPeople,
  savePhone,
  sayNo,
  sayYes,
  sendCheer,
  buyCheers,
  cheerFriend,
  readFriendCheers,
  setAutoAdd,
  shareStreak,
  takeBack,
  unblockPerson,
} from '../../src/lib/people.js'
import {
  CHEER_GEMS,
  FRIEND_CHEER_CAP,
  FRIEND_CHEER_GEMS,
  FRIEND_CHEERS_PER_GEM,
  fireCheer,
  friendCheerMissKey,
  applyInvitePayout,
  normalizePurse,
  spendGems,
} from '../../src/lib/purse.js'
import { useKept } from '../hooks/useKept.js'
import { useOnline } from '../hooks/useOnline.js'
import { currentBook, readShelf } from '../../src/lib/board-shelf.js'
import { boardDate, formatBoardDate, isoDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { offerMoreGems } from '../components/SheetHost.jsx'
import { InviteCodeSection } from '../components/InviteCodeSection.jsx'
import { InviteRewardBar } from '../components/InviteRewardBar.jsx'
import { Avatar, EmptyCard, PersonCard, SectionHead } from '../components/PersonCard.jsx'
import { SendSheet } from '../components/SendDidYou.jsx'
import { SetSwitch } from '../components/SetBits.jsx'
import {
  DidButton,
  Field,
  KeyButton,
  Meta,
  Row,
} from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { FamilyDetailScreen } from './FamilyDetail.jsx'
import { inviteLink } from '../../src/lib/invite-link.js'
import { fonts } from '../theme.js'
import { KeyboardLift } from '../components/KeyboardLift.jsx'
import { MenuIcon } from '../components/MenuIcon.jsx'
import { Slot } from '../components/Slot.jsx'
import { useAuthSignIn } from '../../src/lib/useAuthSignIn.js'
import { AuthAppleSignIn } from '../components/AuthAppleSignIn.jsx'
import { AuthGoogleSignIn } from '../components/AuthGoogleSignIn.jsx'

function ScreenShell({ book, title, children, colors }) {
  const live = book || currentBook(readShelf())
  const date = formatBoardDate(boardDate(new Date(), live.dayFoldHour))
  return (
    <BoardShell book={live} title={title} date={date} colors={colors}>
      {children}
    </BoardShell>
  )
}

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

function Miss({ children, colors }) {
  if (!children) return null
  return <Text style={[styles.miss, { color: colors.miss }]}>{children}</Text>
}

function OfflineLine({ colors }) {
  const online = useOnline()
  if (online) return null
  return <Meta colors={colors}>{t('people.offline')}</Meta>
}

function BlockModal({ person, colors, onClose, onDone }) {
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
            {t('block.title', { name: personName(person) || t('people.someone') })}
          </Text>
          <Meta colors={colors}>{t('block.body')}</Meta>
          <View style={styles.personActions}>
            <DidButton
              colors={colors}
              small
              label={t('block.yes')}
              onPress={async () => {
                onClose()
                const { miss: why } = await blockPerson(person.user_id)
                onDone(why)
              }}
            />
            <KeyButton
              colors={colors}
              label={t('block.andReport')}
              onPress={async () => {
                onClose()
                const { miss: why } = await blockPerson(person.user_id, 'reported from friends')
                onDone(why)
              }}
            />
            <KeyButton colors={colors} label={t('settings.neverMind')} onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
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

// Signed out, People was a dead end. A preview of what it does, then Apple
// and Google sign-in right here instead of only a link to /account.
function NeedAccount({ kicker, title, colors }) {
  const auth = useAuthSignIn({})
  return (
    <ScreenShell title={title} colors={colors}>
      <Meta colors={colors}>{t('people.outBody')}</Meta>
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
      <Slot fallback={null}>
        <AuthAppleSignIn colors={colors} auth={auth} or={false} />
      </Slot>
      <Slot fallback={null}>
        <AuthGoogleSignIn colors={colors} auth={auth} or={false} />
      </Slot>
      {auth.miss ? <Text style={[styles.miss, { color: colors.miss }]}>{auth.miss}</Text> : null}
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

function PersonRow({ title, note, colors, children, highlight }) {
  return (
    <View
      style={[
        styles.personRow,
        { borderColor: colors.line, backgroundColor: colors.panel },
        highlight ? styles.askRow : null,
      ]}
    >
      <View style={styles.personCopy}>
        <Text style={[styles.personTitle, { color: colors.ink }]}>{title}</Text>
        {note ? <Text style={[styles.personNote, { color: colors.inkDim }]}>{note}</Text> : null}
      </View>
      {children ? <View style={styles.personActions}>{children}</View> : null}
    </View>
  )
}

function friendLine(person) {
  if (!person?.share_streak) return t('people.quiet')
  if (person.done_on === isoDate(new Date())) return t('people.doneTonight')
  if (person.streak > 0) return t('people.streakN', { n: person.streak })
  return t('people.noStreak')
}

// The pill already says done tonight; the line under the name adds the streak.
function streakOnly(person) {
  return person?.streak > 0 ? t('people.streakN', { n: person.streak }) : ''
}

function sentState(state) {
  if (state === 'kept') return t('sent.kept')
  if (state === 'passed') return t('sent.passed')
  return t('sent.waiting')
}

function streakLine(row) {
  if (row.streak > 0) return t('all.streakN', { n: row.streak })
  return t('all.noStreak')
}

function Tile({ label, value, note, lit, onPress, colors }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed ? colors.panel2 : lit ? colors.panel3 : colors.panel,
          borderColor: lit ? colors.on : colors.line,
        },
      ]}
    >
      <Text style={[styles.tileLabel, { color: lit ? colors.on : colors.inkDim }]}>{label}</Text>
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
function JoinFamilyCard({ colors, bare = false }) {
  const [code, setCode] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  async function join() {
    setBusy(true)
    const { miss: why, id } = await joinFamily(code)
    setBusy(false)
    if (why === 'code') return setMiss(t('people.codeShort'))
    if (why === 'nofamily') return setMiss(t('people.noFamily'))
    if (why) return setMiss(tMiss(why))
    setCode('')
    setMiss('')
    return goHash('/family', { id })
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
        />
        <Miss colors={colors}>{miss}</Miss>
      </View>
      <DidButton colors={colors} small label={t('people.join')} disabled={busy} onPress={join} />
    </View>
  )
}

// A small popup for the plus next to a section title.
function AddPop({ kicker, colors, onClose, children }) {
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
            <KeyButton colors={colors} label={t('settings.close')} onPress={onClose} />
          </Pressable>
        </Pressable>
      </KeyboardLift>
    </Modal>
  )
}

function AddFriendPop({ phone, colors, onClose, onAsked }) {
  const [draft, setDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [busy, setBusy] = useState(false)
  async function ask() {
    setBusy(true)
    const { miss: why, person } = await askFriend(draft)
    setBusy(false)
    if (why === 'short') return setMiss(t('people.phoneShort'))
    if (why === 'nophone') return setMiss(t('people.nophone'))
    if (why === 'nobody') return setMiss(t('people.noOne', { phone: cleanPhone(draft) }))
    if (why) return setMiss(tMiss(why))
    onClose()
    return onAsked(t('people.asked', { name: personName(person) }))
  }
  return (
    <AddPop kicker={t('people.addOne')} colors={colors} onClose={onClose}>
      {phone ? (
        <>
          <Field colors={colors} label={t('people.add')} value={draft} onChangeText={setDraft} keyboardType="phone-pad" />
          <Miss colors={colors}>{miss}</Miss>
          <DidButton colors={colors} label={t('people.askOne')} disabled={busy} onPress={ask} />
        </>
      ) : (
        <>
          <Meta colors={colors}>{t('people.nophone')}</Meta>
          <DidButton colors={colors} small label={t('people.phoneSave')} onPress={() => { onClose(); goHash('/people/connect') }} />
        </>
      )}
    </AddPop>
  )
}

export function PeopleScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [mine, setMine] = useKept(`people.mine:${account.user?.id}`, null)
  const [links, setLinks] = useKept(`people.links:${account.user?.id}`, { friends: [], asked: [], sent: [] })
  const [families, setFamilies] = useKept(`people.families:${account.user?.id}`, [])
  const [waiting, setWaiting] = useKept(`people.waiting:${account.user?.id}`, 0)
  const [phone, setPhone] = useKept(`people.phone:${account.user?.id}`, '')
  const [ready, setReady] = useKept(`people.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [sheet, setSheet] = useState(null)

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [who, friendRows, famRows, count] = await Promise.all([
        readMine(),
        listFriends(),
        listFamilies(),
        inboxCount(),
      ])
      setMine(who)
      setPhone(who?.phone || '')
      await syncDisplayName(book.keeperName)
      setLinks(friendRows)
      setFamilies(famRows)
      setWaiting(count)
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user, book.keeperName])

  useEffect(() => {
    load()
  }, [load])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  async function answerAsk(id, yes) {
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(tMiss(why))
    return load()
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('people.title')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }

  const today = isoDate(new Date())
  const doneCount = links.friends.filter((row) => doneTonight(row.person, today)).length

  return (
    <ScreenShell title={t('people.title')} colors={colors}>
      <OfflineLine colors={colors} />

      <View style={styles.tiles}>
        <Tile
          colors={colors}
          lit={waiting > 0}
          label={t('inbox.kicker')}
          value={waiting ? t('people.waiting', { n: waiting }) : t('people.inboxQuiet')}
          note={waiting ? t('people.waitingSub') : ''}
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

      {links.asked.length ? (
        <>
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
                  <DidButton colors={colors} small label={t('people.yes')} onPress={() => answerAsk(row.id, true)} />
                  <KeyButton colors={colors} label={t('people.no')} onPress={() => answerAsk(row.id, false)} />
                </>
              }
            />
          ))}
        </>
      ) : null}

      <SectionHead
        colors={colors}
        label={t('people.friends')}
        count={links.friends.length || null}
        link={t('people.seeAll')}
        onLink={() => goHash('/friends')}
        onAdd={links.friends.length ? () => setSheet({ kind: 'friend' }) : undefined}
        addLabel={t('people.addOne')}
      />
      {links.friends.length ? (
        <>
          <Text style={[styles.glance, { color: colors.inkSoft }]}>
            {t('people.doneOf', { done: doneCount, n: links.friends.length })} {t('people.stripHint')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {links.friends.map((row) => {
              const done = doneTonight(row.person, today)
              return (
                <Pressable
                  key={row.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${personName(row.person) || t('people.someone')}, ${friendLine(row.person)}`}
                  onPress={() => setSheet({ kind: 'send', person: row.person })}
                  style={styles.stripItem}
                >
                  <Avatar person={row.person} done={done} colors={colors} size={52} />
                  <Text style={[styles.stripName, { color: colors.ink }]} numberOfLines={1}>
                    {personName(row.person) || t('people.someone')}
                  </Text>
                  <Text style={[styles.stripLine, { color: done ? colors.on : colors.inkDim }]} numberOfLines={1}>
                    {done ? t('people.doneTonightShort') : t('people.notYet')}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </>
      ) : (
        <EmptyCard colors={colors} title={t('people.noFriendsTitle')} body={t('people.noFriendsBody')}>
          <DidButton colors={colors} small label={t('people.connect')} onPress={() => goHash('/people/connect')} />
        </EmptyCard>
      )}

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

      <SectionHead colors={colors} label={t('people.you')} />
      <Row
        colors={colors}
        label={t('people.name')}
        note={mine?.display_name || t('people.nameInAccount')}
        onPress={() => goHash('/account')}
      />
      <Row
        colors={colors}
        label={t('people.phone')}
        note={phone ? formatPhone(phone) : t('people.phoneMissing')}
        onPress={() => goHash('/account')}
      />
      <Row
        colors={colors}
        label={t('people.connect')}
        note={t('people.connectSub')}
        onPress={() => goHash('/people/connect')}
      />

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
        <SendSheet person={sheet.person} colors={colors} onClose={() => setSheet(null)} onSent={say} />
      ) : null}
      {sheet?.kind === 'friend' ? (
        <AddFriendPop phone={phone} colors={colors} onClose={() => setSheet(null)} onAsked={(words) => { say(words); load() }} />
      ) : null}
      {sheet?.kind === 'family' ? (
        <AddPop kicker={t('people.join')} colors={colors} onClose={() => setSheet(null)}>
          <JoinFamilyCard colors={colors} bare />
        </AddPop>
      ) : null}
    </ScreenShell>
  )
}

export function PeopleReferScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [invite, setInvite] = useKept(`refer.invite:${account.user?.id}`, '')
  const [joined, setJoined] = useKept(`refer.joined:${account.user?.id}`, 0)
  const [gemsPaid, setGemsPaid] = useKept(`refer.gems:${account.user?.id}`, 0)
  const [ready, setReady] = useKept(`refer.ready:${account.user?.id}`, false)
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
      if (!won.gems && !won.looks.length) return
      if (onChange) onChange(applyInvitePayout(book, won))
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
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('people.refer')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('people.referBody')}</Meta>

      <InviteRewardBar colors={colors} gemsPaid={gemsPaid} joined={joined} />

      <Cap colors={colors}>{t('people.yourCode')}</Cap>
      <Row
        colors={colors}
        label={t('people.yourCode')}
        note={invite || '...'}
        onPress={
          invite
            ? async () => {
                const how = await passAlong(t('people.inviteLine', { code: invite, link: inviteLink(invite) }), t('people.invite'))
                if (how) say(t(how === 'copied' ? 'people.copied' : 'people.shared'))
              }
            : undefined
        }
      />
      <Meta colors={colors}>
        {joined >= INVITE_LOOK_AT
          ? t('people.lookWon')
          : t('people.lookLeft', { n: INVITE_LOOK_AT - joined })}
      </Meta>
      <Meta colors={colors}>{t('people.inviteHint', { max: INVITE_GEMS_CAP, n: INVITE_LOOK_AT })}</Meta>

      <InviteCodeSection colors={colors} book={book} onChange={onChange} gemsPaid={gemsPaid} joined={joined} hideBar />

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
    </ScreenShell>
  )
}

export function PeopleConnectScreen({ book }) {
  const colors = useHallColors()
  const account = useAccount()
  const [addDraft, setAddDraft] = useState('')
  const [famDraft, setFamDraft] = useState('')
  const [codeDraft, setCodeDraft] = useState('')
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  // Friends find each other by number, so asking needs yours first.
  // null while loading; '' when there is none on the account.
  const [myPhone, setMyPhone] = useState(null)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [phoneMiss, setPhoneMiss] = useState('')

  useEffect(() => {
    if (!account.user) return undefined
    let alive = true
    readMine()
      .then((mine) => {
        if (alive) setMyPhone(mine?.phone || '')
      })
      .catch(() => {
        if (alive) setMyPhone('')
      })
    return () => {
      alive = false
    }
  }, [account.user])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  async function keepPhone() {
    setPhoneMiss('')
    const out = await savePhone(phoneDraft)
    if (out.miss === 'short') return setPhoneMiss(t('people.phoneShort'))
    if (out.miss === 'taken') return setPhoneMiss(t('people.phoneTaken'))
    if (out.miss) return setPhoneMiss(tMiss(out.miss))
    setMyPhone(out.phone)
    setPhoneDraft('')
    say(t('people.phoneSaved'))
  }

  async function ask() {
    const { miss: why, person } = await askFriend(addDraft)
    if (why === 'short') return setMiss(t('people.phoneShort'))
    if (why === 'nophone') {
      setMyPhone('')
      return setMiss(t('people.nophone'))
    }
    if (why === 'nobody') return setMiss(t('people.noOne', { phone: cleanPhone(addDraft) }))
    if (why) return setMiss(tMiss(why))
    setAddDraft('')
    say(t('people.asked', { name: personName(person) }))
  }

  async function newFamily() {
    const { miss: why, id } = await makeFamily(famDraft || t('people.familyOne'))
    if (why) return setMiss(tMiss(why))
    setFamDraft('')
    return goHash('/family', { id })
  }

  async function join() {
    const { miss: why, id } = await joinFamily(codeDraft)
    if (why === 'code') return setMiss(t('people.codeShort'))
    if (why === 'nofamily') return setMiss(t('people.noFamily'))
    if (why) return setMiss(tMiss(why))
    setCodeDraft('')
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

      <Row
        colors={colors}
        label={t('people.refer')}
        note={t('people.referSub')}
        onPress={() => goHash('/people/refer')}
      />

      <Cap colors={colors}>{t('people.addOne')}</Cap>
      {myPhone === '' ? (
        <>
          <Meta colors={colors}>{t('people.phoneFirstTitle')}</Meta>
          <Meta colors={colors}>{t('people.phoneFirstBody')}</Meta>
          <Field
            colors={colors}
            label={t('account.phone')}
            value={phoneDraft}
            onChangeText={setPhoneDraft}
            keyboardType="phone-pad"
          />
          <Miss colors={colors}>{phoneMiss}</Miss>
          <DidButton colors={colors} label={t('people.phoneSave')} onPress={keepPhone} />
        </>
      ) : null}
      {myPhone ? (
        <>
          <Meta colors={colors}>{t('people.phoneYours', { phone: formatPhone(myPhone) })}</Meta>
          <Field
            colors={colors}
            label={t('people.add')}
            value={addDraft}
            onChangeText={setAddDraft}
            keyboardType="phone-pad"
          />
          <DidButton colors={colors} label={t('people.askOne')} onPress={ask} />
        </>
      ) : null}

      <Cap colors={colors}>{t('people.startFamily')}</Cap>
      <Field colors={colors} label={t('people.newFamily')} value={famDraft} onChangeText={setFamDraft} />
      <DidButton colors={colors} label={t('people.makeFamily')} onPress={newFamily} />
      <Field
        colors={colors}
        label={t('people.joinCode')}
        value={codeDraft}
        onChangeText={(value) => setCodeDraft(cleanCode(value))}
        autoCapitalize="characters"
      />
      <DidButton colors={colors} label={t('people.join')} onPress={join} />

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
    </ScreenShell>
  )
}

export function FriendsScreen({ book, onChange, highlightAsk = '' }) {
  const colors = useHallColors()
  const account = useAccount()
  const purse = normalizePurse(book)
  const [links, setLinks] = useKept(`friends.links:${account.user?.id}`, { friends: [], asked: [], sent: [] })
  const [blocks, setBlocks] = useKept(`friends.blocks:${account.user?.id}`, [])
  const [autoAdds, setAutoAdds] = useKept(`friends.auto:${account.user?.id}`, () => new Set())
  const [ready, setReady] = useKept(`friends.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [stock, setStock] = useState(null)
  const cheersLeft = stock == null ? purse.friendCheers : stock

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      const [friendRows, blockRows, serverCheers, autoRows] = await Promise.all([
        listFriends(),
        listBlocks(),
        readFriendCheers(),
        listAutoAdds(),
      ])
      setLinks(friendRows)
      setBlocks(blockRows)
      setAutoAdds(autoRows)
      if (typeof serverCheers === 'number') setStock(serverCheers)
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  function say(words) {
    setMiss('')
    setSaid(words)
  }

  async function answerAsk(id, yes) {
    setMiss('')
    const { miss: why } = yes ? await sayYes(id) : await sayNo(id)
    if (why) return setMiss(tMiss(why))
    return load()
  }

  async function cut(person) {
    setMiss('')
    const { miss: why } = await dropFriend(person.user_id)
    if (why) return setMiss(tMiss(why))
    setSaid(t('people.dropped', { name: personName(person) }))
    return load()
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

  async function cheer(person) {
    const sent = await cheerFriend(book, person.user_id, purse.cheerOn)
    const known = friendCheerMissKey(sent.miss)
    if (known) return setMiss(t(known.key, known.vars))
    if (sent.miss) return setMiss(tMiss(sent.miss))
    setStock(normalizePurse(sent.book).friendCheers)
    if (onChange) onChange(sent.book)
    fireCheer(purse.cheerOn, 1)
    return say(t('family.cheerSent', { name: personName(person) || t('people.someone') }))
  }

  async function gift(person) {
    if (purse.gems < CHEER_GEMS) {
      offerMoreGems(colors)
      return
    }
    const pick = purse.cheers.find((id) => id !== 'lime') || purse.cheerOn
    const spent = spendGems(book, CHEER_GEMS)
    if (spent.miss) {
      offerMoreGems(colors)
      return
    }
    const { miss: why } = await giftCheer(person.user_id, pick)
    if (why === 'giftCap') return setMiss(t('friends.giftCap'))
    if (why) return setMiss(tMiss(why))
    if (onChange) onChange(spent.book)
    say(t('friends.giftSent', { name: personName(person) || t('people.someone') }))
  }

  async function buyMore() {
    if (purse.gems < FRIEND_CHEER_GEMS) {
      offerMoreGems(colors)
      return
    }
    const bought = await buyCheers(book)
    if (bought.miss === 'gems') {
      offerMoreGems(colors)
      return
    }
    const known = friendCheerMissKey(bought.miss)
    if (known) return setMiss(t(known.key, known.vars))
    if (bought.miss) return setMiss(tMiss(bought.miss))
    setStock(normalizePurse(bought.book).friendCheers)
    if (onChange) onChange(bought.book)
    setMiss('')
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('people.friends')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('friends.title', { n: 0 })} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }

  const today = isoDate(new Date())
  const doneCount = links.friends.filter((row) => doneTonight(row.person, today)).length

  return (
    <ScreenShell title={t('friends.title', { n: links.friends.length })} colors={colors}>
      <OfflineLine colors={colors} />

      {links.friends.length ? (
        <Text style={[styles.glance, { color: colors.inkSoft }]}>
          {t('people.doneOf', { done: doneCount, n: links.friends.length })}
        </Text>
      ) : null}

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
                  <DidButton colors={colors} small label={t('people.yes')} onPress={() => answerAsk(row.id, true)} />
                  <KeyButton colors={colors} label={t('people.no')} onPress={() => answerAsk(row.id, false)} />
                </>
              }
            />
          ))}
        </>
      ) : null}

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
              name={personName(row.person) || t('people.someone')}
              line={[done ? streakOnly(row.person) : friendLine(row.person), auto ? t('people.autoOnChip') : '']
                .filter(Boolean)
                .join(' · ')}
              pill={done ? t('people.doneTonightShort') : ''}
              pillOn={done}
              actions={
                <>
                  <DidButton
                    colors={colors}
                    small
                    label={t('people.sendDidYou')}
                    onPress={() => setSheet({ person: row.person })}
                  />
                  <KeyButton
                    colors={colors}
                    disabled={cheersLeft < 1}
                    label={t('friends.cheerUse')}
                    onPress={() => cheer(row.person)}
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
                  {row.person?.phone ? (
                    <Text style={[styles.tileNote, { color: colors.inkDim }]}>{formatPhone(row.person.phone)}</Text>
                  ) : null}
                  <View style={styles.personActions}>
                    <KeyButton
                      colors={colors}
                      label={t('friends.gift', { n: CHEER_GEMS })}
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

      {links.sent.length ? (
        <>
          <SectionHead colors={colors} label={t('friends.waiting')} count={links.sent.length} />
          {links.sent.map((row) => (
            <PersonCard
              key={row.id}
              colors={colors}
              person={row.person}
              name={personName(row.person) || t('people.someone')}
              line={t('friends.notYet')}
            />
          ))}
        </>
      ) : null}

      {links.friends.length ? (
        <DidButton colors={colors} label={t('people.connect')} onPress={() => goHash('/people/connect')} />
      ) : null}
      <KeyButton colors={colors} label={t('people.back')} onPress={() => goHash('/people')} />

      {blocks.length ? (
        <>
          <SectionHead colors={colors} label={t('block.list')} count={blocks.length} />
          {blocks.map((row) => (
            <PersonCard
              key={row.user_id}
              colors={colors}
              person={row}
              name={row.display_name || formatPhone(row.phone) || t('people.someone')}
              line={t('block.cannotReach')}
              actions={
                <KeyButton
                  colors={colors}
                  label={t('block.unblock')}
                  onPress={async () => {
                    const { miss: why } = await unblockPerson(row.user_id)
                    if (why) setMiss(tMiss(why))
                    load()
                  }}
                />
              }
            />
          ))}
        </>
      ) : null}

      <Miss colors={colors}>{miss}</Miss>
      {said ? <Meta colors={colors}>{said}</Meta> : null}

      {sheet ? (
        <SendSheet person={sheet.person} colors={colors} onClose={() => setSheet(null)} onSent={say} />
      ) : null}
      {confirm ? (
        <BlockModal
          person={confirm}
          colors={colors}
          onClose={() => setConfirm(null)}
          onDone={(why) => {
            if (why) setMiss(tMiss(why))
            load()
          }}
        />
      ) : null}
    </ScreenShell>
  )
}

function FamilyListScreen({ colors }) {
  const account = useAccount()
  const [families, setFamilies] = useKept(`people.families:${account.user?.id}`, [])
  const [pop, setPop] = useState(false)
  const [ready, setReady] = useKept(`families.ready:${account.user?.id}`, false)

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    setFamilies(await listFamilies())
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('family.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('people.families')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('people.families')} colors={colors}>
      <OfflineLine colors={colors} />
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
          <JoinFamilyCard colors={colors} bare />
        </AddPop>
      ) : null}
      <KeyButton colors={colors} label={t('family.back')} onPress={() => goHash('/people')} />
    </ScreenShell>
  )
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

export function InboxScreen({ book, onChange, onKeep }) {
  const colors = useHallColors()
  const account = useAccount()
  const [rows, setRows] = useKept(`inbox.rows:${account.user?.id}`, [])
  const [ready, setReady] = useKept(`inbox.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      // Family did yous and allowed friends go onto tonight first.
      await refreshPeople()
      setRows(await listInbox())
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  async function answer(row, keep) {
    setMiss('')
    const { miss: why } = await answerSend(row.id, keep)
    if (why) return setMiss(tMiss(why))
    if (keep && row.kind === 'cheer' && row.cheer_id) fireCheer(row.cheer_id, 1)
    if (keep && row.kind === 'todo' && onKeep) onKeep(row.question)
    return load()
  }

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('inbox.kicker')} title={t('inbox.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('inbox.title')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }
  if (!rows.length) {
    return (
      <ScreenShell title={t('inbox.emptyTitle')} colors={colors}>
        <Meta colors={colors}>{t('inbox.emptyBody')}</Meta>
        <Meta colors={colors}>{t('inbox.autoNote')}</Meta>
        <DidButton colors={colors} label={t('inbox.goPeople')} onPress={() => goHash('/people')} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('inbox.title')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('inbox.hint')}</Meta>
      <Meta colors={colors}>{t('inbox.autoNote')}</Meta>
      {rows.map((row) => (
        <PersonRow
          key={row.id}
          colors={colors}
          title={row.kind === 'cheer' ? t('inbox.aCheer') : row.question}
          note={`${t('inbox.from', { name: personName(row.person) || t('people.someone') })}${row.note ? ` · ${row.note}` : ''}`}
        >
          <DidButton
            colors={colors}
            small
            label={row.kind === 'cheer' ? t('inbox.thanks') : t('inbox.keep')}
            onPress={() => answer(row, true)}
          />
          {row.kind === 'todo' ? (
            <KeyButton colors={colors} label={t('inbox.pass')} onPress={() => answer(row, false)} />
          ) : null}
        </PersonRow>
      ))}
      <Miss colors={colors}>{miss}</Miss>
    </ScreenShell>
  )
}

export function SentScreen({ book, onChange }) {
  const colors = useHallColors()
  const account = useAccount()
  const [rows, setRows] = useKept(`sent.rows:${account.user?.id}`, [])
  const [ready, setReady] = useKept(`sent.ready:${account.user?.id}`, false)
  const [miss, setMiss] = useState('')

  const load = useCallback(async () => {
    if (!account.user) {
      setReady(true)
      return
    }
    try {
      setRows(await listSent())
      setMiss('')
    } catch {
      setMiss(t('people.reach'))
    }
    setReady(true)
  }, [account.user])

  useEffect(() => {
    load()
  }, [load])

  if (!cloudSetUp()) return <CloudOff colors={colors} />
  if (!account.user) {
    return <NeedAccount kicker={t('sent.kicker')} title={t('people.outTitle')} colors={colors} />
  }
  if (!ready) {
    return (
      <ScreenShell title={t('sent.title')} colors={colors}>
        <Meta colors={colors}>{t('family.loading')}</Meta>
      </ScreenShell>
    )
  }
  if (!rows.length) {
    return (
      <ScreenShell title={t('sent.emptyTitle')} colors={colors}>
        <Meta colors={colors}>{t('sent.emptyBody')}</Meta>
        <DidButton colors={colors} label={t('sent.goFriends')} onPress={() => goHash('/friends')} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title={t('sent.title')} colors={colors}>
      <OfflineLine colors={colors} />
      <Meta colors={colors}>{t('sent.hint')}</Meta>
      {rows.map((row) => (
        <PersonRow
          key={row.id}
          colors={colors}
          title={row.kind === 'cheer' ? t('inbox.aCheer') : row.question}
          note={`${t('sent.to', { name: personName(row.person) || t('people.someone') })} · ${sentState(row.state)}`}
        >
          {row.state === 'sent' ? (
            <KeyButton
              colors={colors}
              label={t('sent.takeBack')}
              onPress={async () => {
                setMiss('')
                const { miss: why } = await takeBack(row.id)
                if (why) setMiss(tMiss(why))
                load()
              }}
            />
          ) : null}
        </PersonRow>
      ))}
      <Miss colors={colors}>{miss}</Miss>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  previewList: { gap: 8, marginTop: 12, marginBottom: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12 },
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
  personTitle: { fontFamily: fonts.uiSemi, fontSize: 15 },
  personNote: { fontFamily: fonts.ui, fontSize: 13 },
  personActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  tiles: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, gap: 4, minHeight: 96 },
  tileLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  tileValue: { fontFamily: fonts.uiBold, fontSize: 16, lineHeight: 21 },
  tileNote: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17 },
  glance: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  strip: { gap: 14, paddingRight: 8, paddingBottom: 4 },
  stripItem: { width: 64, alignItems: 'center', gap: 4 },
  stripName: { fontFamily: fonts.uiSemi, fontSize: 12, maxWidth: 64 },
  stripLine: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase', maxWidth: 64 },
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
