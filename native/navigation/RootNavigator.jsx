import { useMemo } from 'react'
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { useTheme } from '../../src/lib/prefs.js'
import { AppShell } from '../AppShell.jsx'
import { useHallColors } from '../hooks/useHallColors.js'
import { flushNavigation, navigationRef, syncFromNavigation } from './hash.js'

export function RootNavigator() {
  const theme = useTheme()
  const colors = useHallColors()
  // Screens paint their own look; this is what shows between them mid-push.
  const navTheme = useMemo(() => {
    const base = theme === 'light' ? DefaultTheme : DarkTheme
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.on,
        background: colors.bg,
        card: colors.bg,
        text: colors.ink,
        border: colors.line,
      },
    }
  }, [colors, theme])

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={flushNavigation}
      onStateChange={syncFromNavigation}
    >
      <AppShell />
    </NavigationContainer>
  )
}
