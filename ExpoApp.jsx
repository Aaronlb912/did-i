import Constants from 'expo-constants'
import { StatusBar } from 'expo-status-bar'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'

function packHost() {
  const raw = Constants.expoConfig?.hostUri || Constants.linkingUri || ''
  const host = String(raw)
    .replace(/^[a-z]+:\/\//, '')
    .split('/')[0]
    .split(':')[0]
  if (!host || host === '127.0.0.1' || host === 'localhost') {
    return Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1'
  }
  return host
}

export function ExpoApp() {
  const url = `http://${packHost()}:48741/`
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.shell}>
        <StatusBar style="light" />
        <View style={styles.bar}>
          <Text style={styles.barText}>Did I · Expo</Text>
          <Text style={styles.barUrl}>{url}</Text>
        </View>
        <WebView
          source={{ uri: url }}
          style={styles.web}
          originWhitelist={['*']}
          allowsBackForwardNavigationGestures
          scalesPageToFit={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#0e1014',
  },
  bar: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  barText: {
    color: '#f4f6fa',
    fontSize: 13,
    fontWeight: '600',
  },
  barUrl: {
    color: '#616978',
    fontSize: 11,
    marginTop: 2,
  },
  web: {
    flex: 1,
    backgroundColor: '#0e1014',
  },
})
