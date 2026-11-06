import { useEffect, useState } from 'react'
import { DevSettings, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { t } from '../src/lib/i18n.js'

// Keep the native splash up from the first JS view. NativeApp hides it once
// the first real screen renders; before this, a blank view showed instead.
SplashScreen.preventAutoHideAsync().catch(() => {})

function updates() {
  try {
    return require('expo-updates')
  } catch {
    return null
  }
}

export function Boot() {
  const [App, setApp] = useState(null)
  const [fail, setFail] = useState('')
  const [retryFailed, setRetryFailed] = useState(false)
  const [noMail, setNoMail] = useState('')

  // The app did not load, so none of its modules can be trusted: try the full
  // mail, then a plain one with just the error, then show the address.
  async function sendFail() {
    const what = String(fail).split('\n')[0].slice(0, 300)
    const extra = [t('feedback.crash', { what })]
    setNoMail('')
    try {
      if (await require('./lib/feedback-mail.js').openFeedbackMail(extra)) return
    } catch {
      // Falls through to the plain mail.
    }
    let email = ''
    try {
      const { feedbackMailto } = require('../src/lib/feedback.js')
      email = require('../src/lib/legal.js').legalEmail()
      const url = feedbackMailto(extra)
      if (url) {
        await Linking.openURL(url)
        return
      }
    } catch {
      // No mail app, or the helpers did not load either.
    }
    setNoMail(email ? t('feedback.noMail', { email }) : t('boot.retryFail'))
  }

  function retry() {
    setRetryFailed(false)
    if (__DEV__) {
      DevSettings.reload()
      return
    }
    const mod = updates()
    if (!mod) {
      setRetryFailed(true)
      return
    }
    mod.reloadAsync().catch(() => setRetryFailed(true))
  }

  useEffect(() => {
    // Not import(): bootstrap.js defines a global location without an origin,
    // so Metro's async chunk loader builds its URL from undefined and throws.
    try {
      const ExpoApp = require('../ExpoApp.jsx').ExpoApp
      // From here a drawn view tells expo-updates this launch worked.
      global.__didIReady = true
      setApp(() => ExpoApp)
    } catch (error) {
      // A downloaded update that cannot load: crash natively so expo-updates
      // rolls back. The fail screen would mark the bad update good.
      const showFail = () => {
        const detail = global.__didIFatal?.message || error?.message || String(error)
        const stack = __DEV__ ? global.__didIFatal?.stack || error?.stack || '' : ''
        setFail(stack ? `${detail}\n\n${stack}` : detail)
        SplashScreen.hideAsync().catch(() => {})
      }
      const mod = updates()
      if (!__DEV__ && mod && !mod.isEmbeddedLaunch && global.ErrorUtils) {
        global.ErrorUtils.getGlobalHandler()(error, true)
        // If the native crash never comes, do not leave the splash up forever.
        const timer = setTimeout(showFail, 3000)
        return () => clearTimeout(timer)
      }
      showFail()
    }
    return undefined
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
        <Pressable
          accessibilityRole="button"
          onPress={sendFail}
          style={{ marginTop: 12, minHeight: 44, justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#99a1b0', alignItems: 'center' }}
        >
          <Text style={{ color: '#f4f6fa', fontSize: 17 }}>{t('feedback.send')}</Text>
        </Pressable>
        {noMail ? <Text style={{ color: '#99a1b0', fontSize: 15, marginTop: 12 }}>{noMail}</Text> : null}
        {retryFailed ? (
          <Text style={{ color: '#99a1b0', fontSize: 15, marginTop: 12 }}>{t('boot.retryFail')}</Text>
        ) : null}
      </View>
    )
  }

  // Draw nothing until the app loads: the splash stays up, and a drawn view
  // fires RCTContentDidAppear, which tells expo-updates the launch worked and
  // stops it rolling back a bad update.
  if (!App) return null

  return <App />
}
