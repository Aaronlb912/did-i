import { useCallback, useEffect, useState } from 'react'
import { useKept } from '../hooks/useKept.js'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { passAlong } from '../../src/lib/native.js'
import {
  addFamilyLamp,
  answerFamilyLamp,
  dropFamilyLamp,
  dropMember,
  editFamilyLamp,
  familyHistory,
  familyLampMeta,
  leaveFamily,
  listFamilyLamps,
  personName,
  readFamily,
  buyCheers,
  cheerFamily,
  doneTonight,
  readFriendCheers,
  setRole,
} from '../../src/lib/people.js'
import {
  FRIEND_CHEER_CAP,
  FRIEND_CHEER_GEMS,
  FRIEND_CHEERS_PER_GEM,
  fireCheer,
  friendCheerMissKey,
  normalizePurse,
} from '../../src/lib/purse.js'
import { addDaysIso, boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { offerMoreGems } from '../components/SheetHost.jsx'
import { EmptyCard, PersonCard, SectionHead } from '../components/PersonCard.jsx'
import { SendSheet } from '../components/SendDidYou.jsx'
import { ChipRow, DidButton, Field, KeyButton, Meta } from '../components/ui.jsx'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { KeyboardLift } from '../components/KeyboardLift.jsx'

const EVERYONE = 'everyone'

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

export function FamilyDetailScreen({ book, onChange, familyId, colors }) {
  const account = useAccount()
  const purse = normalizePurse(book)
  const clock = new Date()
  const [fam, setFam] = useKept(`fam:${account.user?.id}:${familyId}`, null)
  const [lamps, setLamps] = useKept(`fam.lamps:${account.user?.id}:${familyId}`, [])
  const [answers, setAnswers] = useKept(`fam.answers:${account.user?.id}:${familyId}`, [])
  const [night, setNight] = useState(() => boardDate(clock, book.dayFoldHour))
  const [nights, setNights] = useState([])
  const [past, setPast] = useState([])
  const [edit, setEdit] = useState(null)
  const [ready, setReady] = useKept(`fam.ready:${account.user?.id}:${familyId}`, false)
  const [draft, setDraft] = useState('')
  const [forId, setForId] = useState(EVERYONE)
  const [miss, setMiss] = useState('')
  const [said, setSaid] = useState('')
  const [stock, setStock] = useState(null)
  const [codeOpen, setCodeOpen] = useState(false)
  const [sheet, setSheet] = useState(null)
  const cheersLeft = stock == null ? purse.friendCheers : stock

  const load = useCallback(async () => {
    if (!familyId || !account.user) {
      setReady(true)
      return
    }
    const row = await readFamily(familyId)
    setFam(row)
    if (row) {
      const key = boardDate(new Date(), row.fold_hour)
      setNight(key)
      const back = []
      for (let step = 6; step >= 0; step -= 1) back.push(addDaysIso(key, -step))
      setNights(back)
      const [tonightRows, pastRows, serverCheers] = await Promise.all([
        listFamilyLamps(familyId, key),
        familyHistory(familyId, back),
        readFriendCheers(),
      ])
      if (typeof serverCheers === 'number') setStock(serverCheers)
      setLamps(tonightRows.lamps)
      setAnswers(tonightRows.answers)
      setPast(pastRows)
    }
    setReady(true)
  }, [familyId, account.user])

  useEffect(() => {
    load()
  }, [load])

  function answerFor(lampId, userId) {
    return answers.find((row) => row.lamp_id === lampId && row.user_id === userId) || null
  }

  function whoFor(lamp) {
    if (!lamp.for_id) return t('family.everyone')
    const member = fam?.members.find((row) => row.user_id === lamp.for_id)
    if (!member) return t('family.someone')
    return member.you ? t('family.youAre') : personName(member.person) || t('family.someone')
  }

  function owing(lamp) {
    if (!fam) return []
    if (lamp.for_id) return fam.members.filter((row) => row.user_id === lamp.for_id)
    return fam.members
  }

  function mineToAnswer(lamp) {
    if (!fam) return false
    return !lamp.for_id || lamp.for_id === fam.youId
  }

  async function tap(lamp, status) {
    const { miss: why } = await answerFamilyLamp(fam.id, lamp.id, night, status)
    if (why) return setMiss(why)
    return load()
  }

  async function add() {
    if (!draft.trim()) return setMiss(t('family.blank'))
    const { miss: why } = await addFamilyLamp(
      fam.id,
      fam.tag?.id,
      draft,
      forId === EVERYONE ? null : forId,
    )
    if (why === 'notag') return setMiss(t('family.noTag'))
    if (why) return setMiss(why)
    setDraft('')
    setMiss('')
    return load()
  }

  if (!ready) {
    return <Meta colors={colors}>{t('family.loading')}</Meta>
  }

  if (!fam) {
    return (
      <>
        <Text style={[styles.title, { color: colors.ink }]}>{t('family.goneTitle')}</Text>
        <Meta colors={colors}>{t('family.goneBody')}</Meta>
        <DidButton colors={colors} label={t('family.back')} onPress={() => goHash('/people')} />
      </>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, styles.titleText, { color: colors.ink }]}>{fam.name}</Text>
        <Pressable
          onPress={() => setCodeOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('people.joinCode')}
        >
          {({ pressed }) => <Text style={[styles.plus, { color: colors.on, opacity: pressed ? 0.6 : 1 }]}>+</Text>}
        </Pressable>
      </View>

      <SectionHead
        colors={colors}
        label={t('family.people')}
        count={fam.members.length}
      />
      <Text style={[styles.glance, { color: colors.inkSoft }]}>
        {t('people.doneOf', {
          done: fam.members.filter((row) => doneTonight(row.person, night)).length,
          n: fam.members.length,
        })}
      </Text>
      {fam.members.map((row) => {
        const name = row.you ? t('family.youAre') : personName(row.person) || t('family.someone')
        const done = doneTonight(row.person, night)
        const week = nights.map((one) =>
          past.some(
            (item) => item.user_id === row.user_id && item.period_key === one && item.status !== 'skip',
          ),
        )
        return (
          <PersonCard
            key={row.user_id}
            colors={colors}
            person={row.you ? { display_name: personName(row.person) || name } : row.person}
            done={done}
            name={name}
            line={row.role === 'parent' ? t('people.parent') : t('people.kid')}
            pill={done ? t('people.doneTonightShort') : ''}
            pillOn={done}
            extra={
              <View style={styles.weekRow}>
                <View style={styles.dots}>
                  {week.map((on, at) => (
                    <View key={nights[at]} style={[styles.dot, { backgroundColor: on ? colors.on : colors.open }]} />
                  ))}
                </View>
                <Text style={[styles.weekCount, { color: colors.inkDim }]}>
                  {t('family.weekCount', { n: week.filter(Boolean).length })}
                </Text>
              </View>
            }
            actions={
              row.you ? null : (
                <>
                  <DidButton
                    colors={colors}
                    small
                    label={t('people.sendDidYou')}
                    onPress={() => setSheet({ person: row.person })}
                  />
                  {done ? (
                    <KeyButton
                      colors={colors}
                      disabled={cheersLeft < 1}
                      label={t('friends.cheerUse')}
                      onPress={async () => {
                        setMiss('')
                        setSaid('')
                        const sent = await cheerFamily(book, row.user_id, t('family.cheerNote'), purse.cheerOn)
                        const known = friendCheerMissKey(sent.miss)
                        if (known) return setMiss(t(known.key, known.vars))
                        if (sent.miss) return setMiss(tMiss(sent.miss))
                        setStock(normalizePurse(sent.book).friendCheers)
                        if (onChange) onChange(sent.book)
                        fireCheer(purse.cheerOn, 1)
                        return setSaid(t('family.cheerSent', { name }))
                      }}
                    />
                  ) : null}
                </>
              )
            }
            more={
              fam.parent && !row.you ? (
                <View style={styles.rowActions}>
                  <KeyButton
                    colors={colors}
                    label={row.role === 'parent' ? t('family.makeKid') : t('family.makeParent')}
                    onPress={async () => {
                      const { miss: why } = await setRole(fam.id, row.user_id, row.role === 'parent' ? 'kid' : 'parent')
                      if (why === 'lastparent') setMiss(t('family.lastParent'))
                      else if (why) setMiss(why)
                      load()
                    }}
                  />
                  <KeyButton
                    colors={colors}
                    label={t('family.remove')}
                    onPress={async () => {
                      const { miss: why } = await dropMember(fam.id, row.user_id)
                      if (why === 'lastparent') setMiss(t('family.lastParent'))
                      else if (why) setMiss(why)
                      load()
                    }}
                  />
                </View>
              ) : null
            }
          />
        )
      })}
      <Meta colors={colors}>
        {t('family.week')}: {t('family.weekFrom', { from: formatBoardDate(nights[0] || night), to: formatBoardDate(night) })}
      </Meta>
      {fam.members.length < 2 ? (
        <EmptyCard colors={colors} title={t('family.aloneTitle')} body={t('family.inviteHint', { code: fam.code })} />
      ) : null}

      <Cap colors={colors}>{t('family.tonight')}</Cap>
      {lamps.length ? (
        lamps.map((lamp) => {
          const crowd = owing(lamp)
          const done = crowd.filter((row) => {
            const answer = answerFor(lamp.id, row.user_id)
            return answer && answer.status !== 'skip'
          })
          const mine = mineToAnswer(lamp) ? answerFor(lamp.id, fam.youId) : null
          return (
            <View key={lamp.id} style={[styles.row, { borderColor: colors.line, backgroundColor: colors.panel }]}>
              <Text style={[styles.rowTitle, { color: colors.ink }]}>{lamp.question}</Text>
              <Text style={{ color: colors.inkDim, fontSize: 13 }}>
                {t('family.forWho', { who: whoFor(lamp) })}
                {lamp.cadence !== 'daily' ? ` · ${familyLampMeta(lamp)}` : ''}
                {' · '}
                {t('family.doneCount', { done: done.length, all: crowd.length })}
              </Text>
              {mineToAnswer(lamp) ? (
                <View style={styles.rowActions}>
                  <DidButton
                    small
                    colors={colors}
                    label={mine?.status === 'yes' ? t('family.did') : t('family.doIt')}
                    disabled={mine?.status === 'yes'}
                    onPress={() => tap(lamp, 'yes')}
                  />
                  <KeyButton colors={colors} label={t('family.nope')} onPress={() => tap(lamp, 'skip')} />
                </View>
              ) : (
                <Text style={{ color: colors.inkSoft }}>{done.length ? t('family.theirDone') : t('family.theirWait')}</Text>
              )}
              {fam.parent || lamp.made_by === fam.youId ? (
                <View style={styles.rowActions}>
                  <KeyButton colors={colors} label={t('family.edit')} onPress={() => setEdit({ id: lamp.id, text: lamp.question })} />
                  <KeyButton
                    colors={colors}
                    label={t('family.remove')}
                    onPress={async () => {
                      const { miss: why } = await dropFamilyLamp(lamp.id)
                      if (why) setMiss(why)
                      load()
                    }}
                  />
                </View>
              ) : null}
            </View>
          )
        })
      ) : (
        <Meta colors={colors}>{t('family.noLamps')}</Meta>
      )}

      <Cap colors={colors}>{fam.parent ? t('family.assign') : t('family.addYours')}</Cap>
      <Field colors={colors} label={t('family.what')} value={draft} onChangeText={setDraft} placeholder={t('family.whatPh')} />
      {fam.parent ? (
        <>
          <Text style={[styles.cap, { color: colors.inkDim }]}>{t('family.forWhoLabel')}</Text>
          <ChipRow
            colors={colors}
            value={forId}
            onPick={setForId}
            items={[
              { id: EVERYONE, label: t('family.everyone') },
              ...fam.members.map((row) => ({
                id: row.user_id,
                label: row.you ? t('family.youAre') : personName(row.person) || t('family.someone'),
              })),
            ]}
          />
        </>
      ) : null}
      <DidButton colors={colors} label={t('family.put')} onPress={add} />
      <Meta colors={colors}>{fam.parent ? t('family.assignHint') : t('family.kidHint')}</Meta>

      <Cap colors={colors}>{t('friends.cheerStock', { n: cheersLeft })}</Cap>
      <Meta colors={colors}>{t('friends.cheerNote')}</Meta>
      <KeyButton
        colors={colors}
        disabled={cheersLeft + FRIEND_CHEERS_PER_GEM > FRIEND_CHEER_CAP}
        label={t('friends.cheerBuy')}
        onPress={async () => {
          if (purse.gems < FRIEND_CHEER_GEMS) {
            offerMoreGems(colors)
            return
          }
          setMiss('')
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
        }}
      />

      <KeyButton
        colors={colors}
        label={t('family.leave')}
        onPress={async () => {
          const { miss: why } = await leaveFamily(fam.id)
          if (why === 'lastparent') return setMiss(t('family.lastParentLeave'))
          if (why) return setMiss(why)
          goHash('/people')
        }}
      />

      {said ? <Meta colors={colors}>{said}</Meta> : null}
      {miss ? <Text style={{ color: colors.miss }}>{tMiss(miss)}</Text> : null}
      <KeyButton colors={colors} label={t('family.back')} onPress={() => goHash('/family')} />

      {codeOpen ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setCodeOpen(false)}>
          <Pressable style={styles.veil} onPress={() => setCodeOpen(false)}>
            <Pressable style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.cap, { color: colors.on }]}>{t('people.joinCode')}</Text>
              <Text style={[styles.code, { color: colors.ink }]} selectable>
                {fam.code}
              </Text>
              <Meta colors={colors}>{t('family.inviteHint', { code: fam.code })}</Meta>
              <DidButton
                colors={colors}
                label={t('people.send')}
                onPress={async () => {
                  setMiss('')
                  setSaid('')
                  const how = await passAlong(t('family.codeInvite', { name: fam.name, code: fam.code }), fam.name)
                  setCodeOpen(false)
                  if (how === 'shared') setSaid(t('people.shared'))
                }}
              />
              <KeyButton colors={colors} label={t('settings.close')} onPress={() => setCodeOpen(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {sheet ? (
        <SendSheet
          family
          person={sheet.person}
          colors={colors}
          onClose={() => setSheet(null)}
          onSent={(words) => {
            setMiss('')
            setSaid(words)
          }}
        />
      ) : null}

      {edit ? (
      <Modal visible transparent animationType="fade" onRequestClose={() => setEdit(null)}>
        <KeyboardLift>
          <Pressable style={styles.veil} onPress={() => setEdit(null)}>
            <Pressable style={[styles.pop, { backgroundColor: colors.panel, borderColor: colors.line }]} onPress={(e) => e.stopPropagation()}>
              <Text style={[styles.cap, { color: colors.on }]}>{t('family.edit')}</Text>
              <Field colors={colors} label={t('family.what')} value={edit?.text || ''} onChangeText={(text) => setEdit((prev) => ({ ...prev, text }))} />
              <DidButton
                colors={colors}
                label={t('family.save')}
                onPress={async () => {
                  const { miss: why } = await editFamilyLamp(edit.id, edit.text)
                  if (why === 'blank') return setMiss(t('family.blank'))
                  if (why) setMiss(why)
                  setEdit(null)
                  load()
                }}
              />
              <KeyButton colors={colors} label={t('settings.neverMind')} onPress={() => setEdit(null)} />
            </Pressable>
          </Pressable>
        </KeyboardLift>
      </Modal>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  cap: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8 },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleText: { flex: 1 },
  plus: { fontFamily: fonts.ui, fontSize: 28, lineHeight: 30, fontWeight: '500' },
  code: { fontFamily: fonts.mono, fontSize: 32, fontWeight: '700', letterSpacing: 4, textAlign: 'center', paddingVertical: 6 },
  row: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8, marginBottom: 8 },
  rowTitle: { fontFamily: fonts.ui, fontSize: 15, fontWeight: '600' },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dots: { flexDirection: 'row', gap: 6 },
  glance: { fontFamily: fonts.ui, fontSize: 14, lineHeight: 20, marginBottom: 2 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weekCount: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  veil: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
})
