import { useEffect, useState } from 'react'
import { Linking, Platform, StyleSheet, Text, View } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { t } from '../../src/lib/i18n.js'
import { setShareDiagnostics } from '../../src/lib/diagnostics.js'
import {
  LOCALE_IDS,
  THEME_IDS,
  usePrefs,
  writePrefs,
} from '../../src/lib/prefs.js'
import { useAccount } from '../../src/lib/account.js'
import { readShelf } from '../../src/lib/board-shelf.js'
import { feedbackMailto } from '../../src/lib/feedback.js'
import { legalEmail } from '../../src/lib/legal.js'
import { shareShelf } from '../../src/lib/native.js'
import { mergeShelves } from '../../src/lib/shelf-merge.js'
import { closeSession, hasPin } from '../../src/lib/session.js'
import { zoneWords } from '../../src/lib/zone.js'
import { useHallColors } from '../hooks/useHallColors.js'
import { goHash } from '../navigation/hash.js'
import { fonts } from '../theme.js'
import { boardDate, formatBoardDate } from '../../src/lib/recurrence.js'
import { BoardShell } from '../components/BoardShell.jsx'
import { SavableSetField } from '../components/SavableSetField.jsx'
import { DidButton, KeyButton } from '../components/ui.jsx'
import {
  PageTitle,
  SetCap,
  SetCard,
  SetNote,
  SetPick,
  SetRow,
  SetSheet,
  SetSwitch,
} from '../components/SetBits.jsx'

export function PhoneSettingsScreen({ book, onChange }) {
  const colors = useHallColors(book)
  const [keeperDraft, setKeeperDraft] = useState(book?.keeperName || '')
  const [noteDraft, setNoteDraft] = useState(book?.inkNote || '')

  useEffect(() => {
    setKeeperDraft(book?.keeperName || '')
    setNoteDraft(book?.inkNote || '')
  }, [book?.keeperName, book?.inkNote])

  return (
    <BoardShell book={book} title={t('settings.title')} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>
      <PageTitle colors={colors}>{t('settings.title')}</PageTitle>
      <SetNote colors={colors}>{t('settings.phoneBody')}</SetNote>

      <SetCap colors={colors}>{t('settings.title')}</SetCap>
      <SetCard colors={colors}>
        <SavableSetField
          colors={colors}
          label={t('settings.name')}
          value={keeperDraft}
          savedValue={book?.keeperName || ''}
          onChangeText={setKeeperDraft}
          onSave={(keeperName) => {
            setKeeperDraft(keeperName)
            onChange({ ...book, keeperName })
          }}
        />
        <SavableSetField
          colors={colors}
          label={t('settings.note')}
          value={noteDraft}
          savedValue={book?.inkNote || ''}
          onChangeText={setNoteDraft}
          placeholder={t('settings.notePh')}
          multiline
          onSave={(inkNote) => {
            setNoteDraft(inkNote)
            onChange({ ...book, inkNote })
          }}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.danger')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          label={t('settings.signOut')}
          note={hasPin() ? t('settings.signOutSubPin') : t('settings.signOutSub')}
          danger
          onPress={() => {
            closeSession()
            goHash('/enter')
          }}
        />
      </SetCard>

      <KeyButton colors={colors} label={t('settings.back')} onPress={() => goHash('/settings')} />
    </BoardShell>
  )
}

export function ProfileScreen({ book, onChange, onImport, onStartEmpty, onSendCopy }) {
  const colors = useHallColors(book)
  const prefs = usePrefs()
  const account = useAccount()
  const [confirm, setConfirm] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [loadNote, setLoadNote] = useState('')

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

  if (confirm) {
    return (
      <BoardShell book={book} title={confirm.title} date={formatBoardDate(boardDate(new Date(), book.dayFoldHour))} colors={colors}>
        <Text style={[styles.popKicker, { color: colors.on }]}>{confirm.kicker}</Text>
        <Text style={[styles.popTitle, { color: colors.ink }]}>{confirm.title}</Text>
        <SetNote colors={colors}>{confirm.body}</SetNote>
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
      <PageTitle colors={colors}>{t('settings.kicker')}</PageTitle>

      <SetCap colors={colors}>{t('account.kicker')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          label={t('settings.account')}
          sub={account.email ? t('settings.accountSub') : t('settings.accountOffSub')}
          value={account.email || t('settings.accountOff')}
          chevron
          onPress={() => goHash('/account')}
        />
        <SetRow
          colors={colors}
          label={t('people.kicker')}
          sub={t('people.rowSub')}
          chevron
          onPress={() => goHash('/people')}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.look')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          label={t('settings.theme')}
          value={t(`theme.${prefs.theme}`)}
          chevron
          onPress={() => setSheet('theme')}
        />
        <SetRow
          colors={colors}
          label={t('settings.language')}
          value={t(`lang.${prefs.locale}`)}
          chevron
          onPress={() => setSheet('lang')}
        />
        <SetSwitch
          colors={colors}
          label={t('settings.lessMotion')}
          on={prefs.lessMotion}
          onPress={() => writePrefs({ lessMotion: !prefs.lessMotion })}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.tonight')}</SetCap>
      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          label={t('settings.fold')}
          sub={t('settings.foldSub', { zone: zoneWords() })}
          value={t('settings.foldAt')}
        />
        <SetRow colors={colors} label={t('settings.reminders')} chevron onPress={() => goHash('/pings')} />
        <SetSwitch
          colors={colors}
          label={t('settings.soundOn')}
          on={Boolean(book?.clickSound)}
          onPress={() => onChange?.({ ...book, clickSound: !book.clickSound })}
        />
        <SetSwitch
          colors={colors}
          label={t('settings.hideMarks')}
          on={Boolean(book?.quietMode)}
          onPress={() => onChange?.({ ...book, quietMode: !book.quietMode })}
        />
      </SetCard>

      <SetCap colors={colors}>{t('tags.aria')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} label={t('tags.aria')} sub={t('tags.openHint')} chevron onPress={() => goHash('/me')} />
        <SetRow colors={colors} label={t('marks.kicker')} chevron onPress={() => goHash('/marks')} />
      </SetCard>

      <SetCard colors={colors}>
        <SetRow
          colors={colors}
          label={t('settings.title')}
          sub={t('settings.phoneSub')}
          chevron
          onPress={() => goHash('/settings/phone')}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.help')}</SetCap>
      <SetCard colors={colors}>
        {onSendCopy ? (
          <SetRow colors={colors} label={t('settings.sendCopy')} sub={t('settings.sendCopySub')} onPress={onSendCopy} />
        ) : (
          <SetRow
            colors={colors}
            label={t('settings.sendCopy')}
            sub={t('settings.sendCopySub')}
            onPress={() => shareShelf(readShelf())}
          />
        )}
        <SetRow colors={colors} label={t('settings.loadCopy')} sub={t('settings.loadCopySub')} onPress={pickFile} />
        <SetRow colors={colors} label={t('settings.how')} chevron onPress={() => goHash('/help')} />
        <SetRow
          colors={colors}
          label={t('feedback.send')}
          sub={t('feedback.sub')}
          onPress={() => {
            const url = feedbackMailto()
            if (url) Linking.openURL(url)
          }}
        />
        <SetRow colors={colors} label={t('settings.ideas')} chevron onPress={() => goHash('/ideas')} />
        <SetRow colors={colors} label={t('settings.what')} chevron onPress={() => goHash('/about')} />
        <SetRow colors={colors} label={t('settings.intro')} chevron onPress={() => goHash('/welcome')} />
      </SetCard>
      {loadNote ? <SetNote colors={colors}>{loadNote}</SetNote> : null}

      <SetCap colors={colors}>{t('settings.privacyChoices')}</SetCap>
      <SetCard colors={colors}>
        <SetSwitch
          colors={colors}
          label={t('settings.diagnostics')}
          sub={t('settings.diagnosticsSub')}
          on={Boolean(prefs.shareDiagnostics)}
          onPress={() => setShareDiagnostics(!prefs.shareDiagnostics)}
        />
        <SetRow
          colors={colors}
          label={t('settings.phonePrivacy')}
          sub={Platform.OS === 'android' ? t('settings.phonePrivacySubAndroid') : t('settings.phonePrivacySub')}
          chevron
          onPress={() => Linking.openSettings()}
        />
      </SetCard>

      <SetCap colors={colors}>{t('settings.legal')}</SetCap>
      <SetCard colors={colors}>
        <SetRow colors={colors} label={t('settings.privacy')} chevron onPress={() => goHash('/privacy')} />
        <SetRow colors={colors} label={t('settings.terms')} chevron onPress={() => goHash('/terms')} />
      </SetCard>
      {!legalEmail() ? <Text style={[styles.miss, { color: colors.miss }]}>{t('legal.operatorWarn')}</Text> : null}

      <SetCap colors={colors}>{t('settings.danger')}</SetCap>
      <SetCard colors={colors}>
        {onStartEmpty ? (
          <SetRow
            colors={colors}
            label={t('settings.emptyBoard')}
            danger
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
      </SetCard>

      {sheet === 'theme' ? (
        <SetSheet colors={colors} title={t('settings.theme')} onClose={() => setSheet(null)}>
          {THEME_IDS.map((id) => (
            <SetPick
              key={id}
              colors={colors}
              label={t(`theme.${id}`)}
              on={prefs.theme === id}
              onPress={() => {
                writePrefs({ theme: id })
                setSheet(null)
              }}
            />
          ))}
        </SetSheet>
      ) : null}

      {sheet === 'lang' ? (
        <SetSheet colors={colors} title={t('settings.language')} onClose={() => setSheet(null)}>
          {LOCALE_IDS.map((id) => (
            <SetPick
              key={id}
              colors={colors}
              label={t(`lang.${id}`)}
              on={prefs.locale === id}
              onPress={() => {
                writePrefs({ locale: id })
                setSheet(null)
              }}
            />
          ))}
        </SetSheet>
      ) : null}
    </BoardShell>
  )
}

const styles = StyleSheet.create({
  miss: { fontFamily: fonts.ui, fontSize: 14, marginHorizontal: 3, marginTop: 4 },
  popKicker: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  popTitle: { fontFamily: fonts.display, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  popRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
})
