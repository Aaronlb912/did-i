import { useEffect, useRef } from 'react'
import { BackHandler, Keyboard } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { t } from '../../src/lib/i18n.js'
import { publishSheet } from '../components/SheetHost.jsx'
import { canGoBack, goBack, goHash } from '../navigation/hash.js'

// Back and Cancel ask before throwing away typed text, like the Add screen.
// Returns leave(): call it from Cancel. `home` is where to go with nothing to go back to.
export function useLeaveAsk(dirty, colors, home) {
  const navigation = useNavigation()
  const ask = useRef(null)
  const going = useRef(false)

  function leave() {
    const out = () => {
      going.current = true
      if (canGoBack()) goBack()
      else goHash(home)
    }
    if (!dirty || going.current) {
      out()
      return
    }
    Keyboard.dismiss()
    publishSheet({
      title: t('hang.discardNewTitle'),
      goLabel: t('hang.discard'),
      closeLabel: t('hang.keepEditing'),
      danger: true,
      colors,
      onClose: () => publishSheet(null),
      onGo: () => {
        publishSheet(null)
        out()
      },
    })
  }
  ask.current = leave

  useEffect(() => {
    if (!dirty) return undefined
    function onBack(event) {
      if (going.current) return
      event?.preventDefault?.()
      ask.current?.()
    }
    window.addEventListener('did-i-back', onBack)
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (going.current) return false
      onBack()
      return true
    })
    return () => {
      window.removeEventListener('did-i-back', onBack)
      sub.remove()
    }
  }, [dirty])

  // The iPhone edge swipe can't be asked about, so it is off while there is typed text.
  useEffect(() => {
    navigation.setOptions?.({ gestureEnabled: !dirty })
    return () => navigation.setOptions?.({ gestureEnabled: true })
  }, [dirty, navigation])

  return leave
}
