import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import { useAccount } from '../../src/lib/account.js'
import { soundsTogether } from '../../src/lib/did-we.js'
import { t } from '../../src/lib/i18n.js'
import { LeadPicker } from '../components/LeadPicker.jsx'
import { SheetHost } from '../components/SheetHost.jsx'
import { TourHost } from '../components/TourHost.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { tourAddClosed } from '../lib/tour.js'
import { HangScreen, Pill } from './questions.jsx'
import { WeNewScreen } from './we.jsx'
import { DidYouScreen } from './you.jsx'

// One Add screen for all three: tap the first words ("Did I") to switch
// between your own question, a Did we, and a Did you. The words you typed
// come along. Editing an existing question stays plain Did I.
export function AddScreen({ book, boards, onChange, onSaveTo, route, mode: startMode = 'i' }) {
  const account = useAccount()
  const colors = useHallColors(book)
  // An Add sheet closed mid-step must not leave a tour step nobody can see.
  useEffect(() => tourAddClosed, [])
  const editing = Boolean(route?.id) && startMode === 'i'
  const [mode, setMode] = useState(startMode)
  const [picking, setPicking] = useState(false)
  // Add another starts over with a blank question on the same screen.
  const [round, setRound] = useState(0)
  const words = useRef(startMode === 'i' ? '' : route?.start || '')
  // The whole Did I draft, so a trip to Did we and back keeps schedule, time, folder and priority.
  const draftRef = useRef(null)
  const tagRef = useRef('')
  // Did I words that sound shared offer Did we, once, without switching.
  const [together, setTogether] = useState(false)
  // A Did we or Did you from a person's card keeps that person picked.
  const withId = startMode === 'i' ? '' : route?.id || ''

  if (editing) {
    return <HangScreen book={book} boards={boards} onChange={onChange} onSaveTo={onSaveTo} route={route} />
  }

  const shared = {
    onBlankChange: (value) => {
      words.current = value
      setTogether(soundsTogether(value))
    },
    onLeadPress: () => setPicking(true),
    // Signed out, Did we and Did you only offer sign in, so give a way back.
    onBackToI: () => setMode('i'),
  }

  return (
    <>
      {mode === 'we' ? (
        <WeNewScreen key="we" book={book} start={words.current} withId={withId} {...shared} />
      ) : mode === 'you' ? (
        <DidYouScreen key="you" book={book} start={words.current} withId={withId} {...shared} />
      ) : (
        <HangScreen
          key={`i${round}`}
          book={book}
          boards={boards}
          onChange={onChange}
          onSaveTo={onSaveTo}
          route={route}
          initialBlank={words.current}
          initialDraft={draftRef.current}
          initialTag={tagRef.current}
          onDraftChange={(draft, tag) => {
            draftRef.current = draft
            tagRef.current = tag
          }}
          onAnother={() => {
            words.current = ''
            draftRef.current = null
            tagRef.current = ''
            setTogether(false)
            setRound((n) => n + 1)
          }}
          below={
            together && account.user ? (
              <Pill
                label={t('lead.makeWe')}
                onPress={() => {
                  setTogether(false)
                  setMode('we')
                }}
                colors={{ ...colors, ink: colors.we || colors.ink }}
              />
            ) : null
          }
          {...shared}
        />
      )}
      {/* Add is a native sheet on iPhone and covers the app-wide SheetHost.
          Did I mounts its own; Did we and Did you need one too, or When opens behind. */}
      {Platform.OS === 'ios' && mode !== 'i' ? <SheetHost /> : null}
      {/* The tour draws its Add steps here on iPhone, where the sheet covers the app shell. */}
      {Platform.OS === 'ios' ? <TourHost scope="add" /> : null}
      {picking ? (
        <LeadPicker
          value={mode}
          colors={colors}
          signedIn={Boolean(account.user)}
          onClose={() => setPicking(false)}
          onPick={(next) => {
            setPicking(false)
            setMode(next)
          }}
        />
      ) : null}
    </>
  )
}
