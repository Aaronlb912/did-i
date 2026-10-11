import { useRef, useState } from 'react'
import { Keyboard, StyleSheet, Text, View } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { noteAsked } from '../../src/lib/did-we.js'
import { t, tMiss } from '../../src/lib/i18n.js'
import { sendDidI } from '../../src/lib/people.js'
import { makeDidYouLink, sharedDidYouLine } from '../../src/lib/did-you-links.js'
import { passAlong } from '../../src/lib/native.js'
import { repeatFrom, repeatLabel } from '../../src/lib/send-repeat.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { HangCard } from '../components/HangCard.jsx'
import { HangFold } from '../components/HangFold.jsx'
import { PickSheet } from '../components/PickSheet.jsx'
import { ScheduleTile, ScheduleTiles } from '../components/ScheduleTile.jsx'
import { SetCap, SetCard } from '../components/SetBits.jsx'
import { AppTextInput, DidButton, KeyButton, Meta } from '../components/ui.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { canGoBack, goBack, goHash, swapHash } from '../navigation/hash.js'
import { confirmDone } from '../lib/confirm.js'
import { fonts } from '../theme.js'
import { ScreenShell } from './more.jsx'
import { Pill, useAddFeel } from './questions.jsx'
import { usePeople } from './we.jsx'

// Did you: ask a friend or someone in your family if they did something.
// Laid out like the Add screen, and reached from it by tapping "Did I".
export function DidYouScreen({ book, start = '', withId = '', onBlankChange, onLeadPress, onBackToI }) {
  const account = useAccount()
  const colors = useHallColors(book)
  if (account.ready && !account.user) {
    return (
      <ScreenShell book={book} title={t('lead.you')} colors={colors}>
        <Meta colors={colors}>{t('lead.youNeedAccount')}</Meta>
        <DidButton colors={colors} label={t('we.signIn')} onPress={() => goHash('/account')} />
        {onBackToI ? <Pill label={t('lead.backToI')} onPress={onBackToI} colors={colors} /> : null}
      </ScreenShell>
    )
  }
  return <DidYouForm book={book} start={start} withId={withId} onBlankChange={onBlankChange} onLeadPress={onLeadPress} />
}

function DidYouForm({ book, start, withId, onBlankChange, onLeadPress }) {
  const colors = useHallColors(book)
  const inputRef = useRef(null)
  const people = usePeople()
  const [blank, setBlank] = useState(start)
  const [to, setTo] = useState(withId)
  const [note, setNote] = useState('')
  const [cadence, setCadence] = useState('once')
  const [days, setDays] = useState([])
  const [open, setOpen] = useState('')
  const [sheet, setSheet] = useState(false)
  const [focused, setFocused] = useState(false)
  const [shake, setShake] = useState(0)
  const feel = useAddFeel(book, inputRef)
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  // Sent: the screen is on its way out, so Send stays off.
  const [done, setDone] = useState(false)
  const [miss, setMiss] = useState('')
  const lead = t('lead.you')
  const question = blank.trim() ? `${lead} ${blank.trim()}` : ''
  const person = (people || []).find((p) => p.id === to)
  const repeat = repeatFrom(cadence, days)
  const ready = Boolean(question) && Boolean(to) && !busy && !done

  function fold(id) {
    feel.ease()
    setOpen((now) => (now === id ? '' : id))
    Keyboard.dismiss()
  }

  async function send() {
    if (feel.stamp) return
    if (!question) {
      feel.buzz()
      setMiss(t('people.sendBlank'))
      setShake((n) => n + 1)
      inputRef.current?.focus()
      return
    }
    if (!to) {
      feel.buzz()
      setMiss(t('we.missNobody'))
      if (open !== 'who') fold('who')
      return
    }
    if (cadence === 'weekly' && !days.length) {
      feel.buzz()
      setMiss(t('we.missDays'))
      setSheet(true)
      return
    }
    Keyboard.dismiss()
    setBusy(true)
    const { miss: why } = await sendDidI(to, question, note, undefined, repeat)
    setBusy(false)
    if (why) {
      feel.buzz()
      return setMiss(why === 'already' ? t('people.sendAlready') : tMiss(why))
    }
    noteAsked(to)
    setDone(true)
    feel.land(t('lead.sent'), () => swapHash('/sent'))
  }

  // The same question as a did-i.app link to text anyone, friend or not.
  // Nobody needs to be picked.
  async function shareLink() {
    setSaid('')
    if (!question) {
      feel.buzz()
      setMiss(t('people.sendBlank'))
      setShake((n) => n + 1)
      return
    }
    setMiss('')
    setBusy(true)
    const { code, miss: why } = await makeDidYouLink(question)
    setBusy(false)
    if (why === 'linkCap') return setMiss(t('didYouLink.cap'))
    if (why || !code) return setMiss(tMiss(why || 'people.reach'))
    const how = await passAlong(sharedDidYouLine(question, code, lead), t('didYouLink.share'))
    if (how === 'copied') setSaid(t('didYouLink.copied'))
    else if (how === 'shared') confirmDone(t('confirm.shared'))
  }

  const whenWords = repeatLabel(repeat) || (cadence === 'weekly' ? t('we.someDays') : t('hang.once'))

  return (
    <BoardShell
      book={book}
      title={t('lead.youTitle')}
      noTitle
      date={feel.date}
      colors={colors}
      back={false}
      leftAction={{ label: t('hang.cancel'), onPress: () => (canGoBack() ? goBack() : goHash('/people')) }}
      rightAction={{ label: t('we.sendShort'), onPress: send, disabled: !ready }}
    >
      <HangCard
        ref={inputRef}
        tag={person ? t('lead.toLine', { name: person.name }) : t('lead.you')}
        leadText={lead}
        blank={blank}
        onBlank={(value) => {
          setBlank(value)
          onBlankChange?.(value)
        }}
        onLeadPress={onLeadPress}
        placeholder={t('lead.youHint')}
        meta={whenWords}
        metaAction={{ label: t('checkOn.change'), a11y: `${t('we.when')}: ${whenWords}`, onPress: () => setSheet(true) }}
        wave={feel.wave}
        stamp={feel.stamp}
        shake={shake}
        focused={focused}
        onFocus={() => {
          setFocused(true)
          setOpen('')
        }}
        onBlur={() => setFocused(false)}
        autoFocus={false}
        colors={colors}
      />

      <View style={styles.settings}>
        <SetCard colors={colors}>
          <HangFold
            label={t('we.people')}
            value={person ? person.name : t('we.nobody')}
            icon="people"
            open={open === 'who'}
            onToggle={() => fold('who')}
            colors={colors}
          >
            {people === null ? (
              <Text style={[styles.hint, { color: colors.inkDim }]}>{t('we.loadingPeople')}</Text>
            ) : people.length ? (
              <View style={styles.pillRow} accessibilityRole="radiogroup">
                {people.map((p) => (
                  <Pill key={p.id} label={p.name} on={to === p.id} onPress={() => setTo(p.id)} colors={colors} radio />
                ))}
              </View>
            ) : (
              <>
                <Text style={[styles.hint, { color: colors.inkDim }]}>{t('we.noPeople')}</Text>
                <Pill label={t('we.findPeople')} onPress={() => goHash('/people')} colors={colors} />
              </>
            )}
          </HangFold>
          <HangFold
            label={t('people.sendNote')}
            value={note.trim() || t('hang.detailsNone')}
            icon="note"
            open={open === 'note'}
            onToggle={() => fold('note')}
            last
            colors={colors}
          >
            <AppTextInput
              colors={colors}
              value={note}
              onChangeText={setNote}
              placeholder={t('people.sendNotePh')}
              multiline
              maxLength={200}
              accessibilityLabel={t('people.sendNote')}
              style={[styles.noteInput, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.bg }]}
            />
          </HangFold>
        </SetCard>
      </View>

      <PickSheet open={sheet} title={t('we.when')} onClose={() => setSheet(false)} colors={colors}>
          <View style={styles.sheetBody}>
            <ScheduleTiles label={t('we.when')}>
              {[
                ['once', t('hang.once'), 'once_on'],
                ['daily', t('we.daily'), 'daily'],
                ['weekly', t('we.someDays'), 'weekly'],
              ].map(([id, label, sub]) => (
                <ScheduleTile key={id} label={label} sub={t(`hang.tileSub.${sub}`)} on={cadence === id} onPress={() => setCadence(id)} colors={colors} />
              ))}
            </ScheduleTiles>
            {cadence === 'weekly' ? (
              <View style={[styles.pillRow, styles.dayRow]}>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const on = days.includes(day)
                  return (
                    <Pill
                      key={day}
                      label={t(`we.day.${day}`)}
                      on={on}
                      onPress={() => setDays(on ? days.filter((d) => d !== day) : [...days, day].sort())}
                      colors={colors}
                    />
                  )
                })}
              </View>
            ) : null}
            <Text style={[styles.hint, { color: colors.inkDim }]}>
              {cadence === 'once' ? t('lead.youOnceHint') : t('lead.youRepeatHint')}
            </Text>
          </View>
      </PickSheet>

      <Text style={[styles.hint, { color: colors.inkDim }]}>{t('lead.youLead')}</Text>
      <KeyButton colors={colors} label={t('didYouLink.share')} disabled={busy || !question} onPress={shareLink} />
      <Text style={[styles.hint, { color: colors.inkDim }]}>{t('didYouLink.textHint')}</Text>
      {said ? <Meta colors={colors}>{said}</Meta> : null}
      {miss ? (
        <Text style={[styles.miss, { color: colors.miss }]} accessibilityRole="alert">
          {miss}
        </Text>
      ) : null}
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  sheetBody: { gap: 10, paddingBottom: 4 },
  settings: { marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  dayRow: { marginTop: 8 },
  hint: { fontFamily: fonts.ui, fontSize: 12, lineHeight: 17, marginTop: 8 },
  miss: { fontFamily: fonts.ui, fontSize: 13 },
  noteInput: { borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 70, fontSize: 15, textAlignVertical: 'top' },
})
