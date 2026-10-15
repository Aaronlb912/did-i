import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { t } from '../src/lib/i18n.js'

// Keep the native splash up from the first JS view. NativeApp hides it once
// the first real screen renders; before this, a blank view showed instead.
SplashScreen.preventAutoHideAsync().catch(() => {})

function retry() {
  try {
    require('expo-updates').reloadAsync().catch(() => {})
  } catch {}
}

export function Boot() {
  const [App, setApp] = useState(null)
  const [fail, setFail] = useState('')

  useEffect(() => {
    // Not import(): bootstrap.js defines a global location without an origin,
    // so Metro's async chunk loader builds its URL from undefined and throws.
    try {
      setApp(() => require('../ExpoApp.jsx').ExpoApp)
    } catch (error) {
      const detail = global.__didIFatal?.message || error?.message || String(error)
      const stack = __DEV__ ? global.__didIFatal?.stack || error?.stack || '' : ''
      setFail(stack ? `${detail}\n\n${stack}` : detail)
      SplashScreen.hideAsync().catch(() => {})
    }
  }, [])

  if (fail) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0e1014', padding: 24, paddingTop: 72 }}>
        <Text style={{ color: '#f4f6fa', fontSize: 22, marginBottom: 12 }}>{t('boot.fail')}</Text>
        <ScrollView>
          <Text style={{ color: '#99a1b0', fontSize: 15 }}>{fail}</Text>
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={{ marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f4f6fa', alignItems: 'center' }}
        >
          <Text style={{ color: '#0e1014', fontSize: 17 }}>{t('boot.retry')}</Text>
        </Pressable>
      </View>
    )
  }

  // Draw nothing until the app loads: the splash stays up, and a drawn view
  // fires RCTContentDidAppear, which tells expo-updates the launch worked and
  // stops it rolling back a bad update.
  if (!App) return null

  return <App />
}
