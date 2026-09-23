import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { t } from '../src/lib/i18n.js'

export function Boot() {
  const [App, setApp] = useState(null)
  const [fail, setFail] = useState('')

  useEffect(() => {
    let alive = true
    import('../ExpoApp.jsx')
      .then((mod) => {
        if (alive) setApp(() => mod.ExpoApp)
      })
      .catch((error) => {
        if (!alive) return
        const detail = global.__didIFatal?.message || error?.message || String(error)
        setFail(detail)
      })
    return () => {
      alive = false
    }
  }, [])

  if (fail) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0e1014', padding: 24, paddingTop: 72 }}>
        <Text style={{ color: '#f4f6fa', fontSize: 22, marginBottom: 12 }}>{t('boot.fail')}</Text>
        <ScrollView>
          <Text style={{ color: '#99a1b0', fontSize: 15 }}>{fail}</Text>
        </ScrollView>
      </View>
    )
  }

  if (!App) {
    return <View style={{ flex: 1, backgroundColor: '#0e1014' }} />
  }

  return <App />
}
