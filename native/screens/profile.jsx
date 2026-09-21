import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { t } from '../../src/lib/i18n.js'
import {
  LOCALE_IDS,
  THEME_IDS,
  usePrefs,
  writePrefs,
} from '../../src/lib/prefs.js'
import { useAccount } from '../../src/lib/account.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { legalEmail } from '../../src/lib/legal.js'
import { shareShelf } from '../../src/lib/native.js'
import { mergeShelves } from '../../src/lib/shelf-merge.js'
import { clearPin, closeSession, hasPin, setPin } from '../../src/lib/session.js'
import { zoneWords } from '../../src/lib/zone.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { ChipRow, DidButton, Field, KeyButton, Meta, Row } from '../components/ui.jsx'

function foldAtWords() {
  return t('settings.foldAt')
}

function Cap({ children, colors }) {
  return <Text style={[styles.cap, { color: colors.inkDim }]}>{children}</Text>
}

export function ProfileScreen({ book, onChange, onImport, onStartEmpty, onSendCopy }) {
  const colors = useHallColors(book)
  const prefs = usePrefs()
  const account = useAccount()
  const [keeperDraft, setKeeperDraft] = useState(book?.keeperName || '')
  const [noteDraft, setNoteDraft] = useState(book?.inkNote || '')
  const [pinDraft, setPinDraft] = useState('')
  const [pinMiss, setPinMiss] = useState('')
  const [pinOn, setPinOn] = useState(hasPin)
  const [confirm, setConfirm] = useState(null)
  const [loadNote, setLoadNote] = useState('')

  useEffect(() => {
    setKeeperDraft(book?.keeperName || '')
    setNoteDraft(book?.inkNote || '')
    setPinOn(hasPin)
  }, [book?.keeperName, book?.inkNote])

  useEffect(() => {
    if (!book || !onChange) return undefined
    const keeperName = keeperDraft.trim()
    if (keeperName === (book.keeperName || '')) return undefined
    const timer = setTimeout(() => onChange({ ...book, keeperName }), 400)
    return () => clearTimeout(timer)
  }, [keeperDraft, book, onChange])

  useEffect(() => {
    if (!book || !onChange) return undefined
    const inkNote = noteDraft.trim()
    if (inkNote === (book.inkNote || '')) return undefined
    const timer = setTimeout(() => onChange({ ...book, inkNote }), 400)
    return () => clearTimeout(timer)
  }, [noteDraft, book, onChange])

  const foldLabel = foldAtWords()

  async function pickFile() {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json' })
      if (picked.canceled || !picked.assets?.[0]?.uri) return
      const response = await fetch(picked.assets[0].uri)
      const parsed = JSON.parse(await response.text())
      const shelf = parsed?.shelf?.boards ? parsed.shelf : parsed?.boards ? parsed : null
      const one = !shelf && parsed?.lamps ? { currentId: parsed.id, boards: [parsed] } : null
      const coming = shelf || one
      if (!coming) {
        setLoadNote(t('settings.loadMiss'))
        return
      }
      const before = readShelf()
      const merged = mergeShelves(before, coming, '', new Date().toISOString())
      if (onImport) onImport(merged)
      const was = before.boards.reduce((n, b) => n + (b.lamps || []).length, 0)
      const now = merged.boards.reduce((n, b) => n + (b.lamps || []).length, 0)
      setLoadNote(t('settings.loadOk', { n: Math.max(0, now - was) }))
    } catch {
      setLoadNote(t('settings.loadMiss'))
    }
  }

  function saveLock() {
    if (!setPin(pinDraft)) {
      setPinMiss(t('settings.pinDigits'))
      return
    }
    setPinMiss('')
    setPinDraft('')
    setPinOn(true)
  }

  if (confirm) {
    return (
      <BoardShell book={book} title={confirm.title} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>
        <Meta colors={colors}>{confirm.body}</Meta>
        <View style={styles.popRow}>
          <DidButton
            small
            label={confirm.yes}
            colors={colors}
            onPress={() => {
              const go = confirm.go
              setConfirm(null)
              if (typeof go === 'function') go()
            }}
          />
          <KeyButton label={t('settings.neverMind')} onPress={() => setConfirm(null)} colors={colors} />
        </View>
      </BoardShell>
    )
  }

  return (
    <BoardShell book={book} title={t('settings.kicker')} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>
      <Cap colors={colors}>{t('account.kicker')}</Cap>
      <Row
        colors={colors}
        label={t('settings.account')}
        note={
          account.email
            ? `${account.email} · ${t('settings.accountSub')}`
            : `${t('settings.accountOff')} · ${t('settings.accountOffSub')}`
        }
        onPress={() => goHash('/account')}
      />
      <Row colors={colors} label={t('people.kicker')} note={t('people.rowSub')} onPress={() => goHash('/people')} />

      <Cap colors={colors}>{t('settings.look')}</Cap>
      <Text style={[styles.pickLabel, { color: colors.inkSoft }]}>{t('settings.theme')}</Text>
      <ChipRow
        colors={colors}
        items={THEME_IDS.map((id) => ({ id, label: t(`theme.${id}`) }))}
        value={prefs.theme}
        onPick={(id) => writePrefs({ theme: id })}
      />
      <Text style={[styles.pickLabel, { color: colors.inkSoft }]}>{t('settings.language')}</Text>
      <ChipRow
        colors={colors}
        items={LOCALE_IDS.map((id) => ({ id, label: t(`lang.${id}`) }))}
        value={prefs.locale}
        onPick={(id) => writePrefs({ locale: id })}
      />
      <Row
        colors={colors}
        label={t('settings.lessMotion')}
        note={prefs.lessMotion ? t('pings.on') : t('settings.soundOff')}
        onPress={() => writePrefs({ lessMotion: !prefs.lessMotion })}
      />

      <Cap colors={colors}>{t('settings.title')}</Cap>
      <Field colors={colors} label={t('settings.name')} value={keeperDraft} onChangeText={setKeeperDraft} />
      <Field
        colors={colors}
        label={t('settings.note')}
        value={noteDraft}
        onChangeText={setNoteDraft}
        placeholder={t('settings.notePh')}
        multiline
      />
      <Field
        colors={colors}
        label={pinOn ? t('settings.newNumber') : t('settings.number')}
        value={pinDraft}
        onChangeText={setPinDraft}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
      />
      <Row
        colors={colors}
        label={pinOn ? t('settings.changeNumber') : t('settings.lockPhone')}
        onPress={saveLock}
      />
      {pinOn ? (
        <Row
          colors={colors}
          label={t('settings.removeLock')}
          onPress={() => {
            clearPin()
            setPinDraft('')
            setPinMiss('')
            setPinOn(false)
          }}
        />
      ) : null}
      {pinMiss ? <Text style={[styles.miss, { color: colors.miss }]}>{pinMiss}</Text> : null}

      <Cap colors={colors}>{t('settings.tonight')}</Cap>
      <View style={styles.readOnly}>
        <Text style={[styles.readLabel, { color: colors.inkSoft }]}>{t('settings.fold')}</Text>
        <Text style={[styles.readValue, { color: colors.ink }]}>{foldLabel}</Text>
        <Meta colors={colors}>{t('settings.foldSub', { zone: zoneWords() })}</Meta>
      </View>
      <Row colors={colors} label={t('settings.reminders')} onPress={() => goHash('/pings')} />
      <Row
        colors={colors}
        label={t('settings.soundOn')}
        note={book?.clickSound ? t('pings.on') : t('settings.soundOff')}
        onPress={() => onChange?.({ ...book, clickSound: !book.clickSound })}
      />
      <Row
        colors={colors}
        label={t('settings.hideMarks')}
        note={book?.quietMode ? t('pings.on') : t('settings.soundOff')}
        onPress={() => onChange?.({ ...book, quietMode: !book.quietMode })}
      />

      <Cap colors={colors}>{t('tags.aria')}</Cap>
      <Row colors={colors} label={t('tags.aria')} note={t('tags.openHint')} onPress={() => goHash('/me')} />
      <Row colors={colors} label={t('marks.kicker')} onPress={() => goHash('/marks')} />

      <Cap colors={colors}>{t('settings.help')}</Cap>
      {onSendCopy ? (
        <Row colors={colors} label={t('settings.sendCopy')} note={t('settings.sendCopySub')} onPress={onSendCopy} />
      ) : (
        <Row colors={colors} label={t('settings.sendCopy')} note={t('settings.sendCopySub')} onPress={() => shareShelf(readShelf())} />
      )}
      <Row colors={colors} label={t('settings.loadCopy')} note={t('settings.loadCopySub')} onPress={pickFile} />
      {loadNote ? <Meta colors={colors}>{loadNote}</Meta> : null}
      <Row colors={colors} label={t('settings.how')} onPress={() => goHash('/help')} />
      <Row colors={colors} label={t('settings.ideas')} onPress={() => goHash('/ideas')} />
      <Row colors={colors} label={t('settings.what')} onPress={() => goHash('/about')} />
      <Row colors={colors} label={t('settings.intro')} onPress={() => goHash('/welcome')} />

      <Cap colors={colors}>{t('settings.legal')}</Cap>
      <Row colors={colors} label={t('settings.privacy')} onPress={() => goHash('/privacy')} />
      <Row colors={colors} label={t('settings.terms')} onPress={() => goHash('/terms')} />
      {!legalEmail() ? <Meta colors={colors}>{t('legal.operatorWarn')}</Meta> : null}

      <Cap colors={colors}>{t('settings.danger')}</Cap>
      {onStartEmpty ? (
        <Row
          colors={colors}
          label={t('settings.emptyBoard')}
          onPress={() =>
            setConfirm({
              kicker: t('settings.startOver'),
              title: t('settings.clearTitle'),
              body: t('settings.clearBody'),
              yes: t('settings.clearYes'),
              go: onStartEmpty,
            })
          }
        />
      ) : null}
      <Row
        colors={colors}
        label={t('settings.leaveBoard')}
        onPress={() => {
          closeSession()
          goHash('/enter')
        }}
      />
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  cap: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  pickLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  readOnly: { gap: 4, marginBottom: 4 },
  readLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  readValue: { fontFamily: fonts.ui, fontSize: 16, fontWeight: '600' },
  miss: { fontFamily: fonts.ui, fontSize: 14 },
  veil: { flex: 1, justifyContent: 'center', padding: 20 },
  pop: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700' },
  popRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
})
