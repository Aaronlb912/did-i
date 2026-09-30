import { useRef, useState } from 'react'
import { useAccount } from '../../src/lib/account.js'
import { soundsTogether } from '../../src/lib/did-we.js'
import { t } from '../../src/lib/i18n.js'
import { LeadPicker } from '../components/LeadPicker.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { HangScreen, Pill } from './questions.jsx'
import { WeNewScreen } from './we.jsx'
import { DidYouScreen } from './you.jsx'

// One Add screen for all three: tap the first words ("Did I") to switch
// between your own question, a Did we, and a Did you. The words you typed
// come along. Editing an existing question stays plain Did I.
export function AddScreen({ book, boards, onChange, onSaveTo, route, mode: startMode = 'i' }) {
  const account = useAccount()
  const colors = useHallColors(book)
  const editing = Boolean(route?.id) && startMode === 'i'
  const [mode, setMode] = useState(startMode)
  const [picking, setPicking] = useState(false)
  const words = useRef(startMode === 'i' ? '' : route?.start || '')
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
          key="i"
          book={book}
          boards={boards}
          onChange={onChange}
          onSaveTo={onSaveTo}
          route={route}
          initialBlank={words.current}
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
