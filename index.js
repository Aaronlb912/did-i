import './native/fatal-guard.cjs'
import './native/bootstrap.js'
import './src/lib/locales-all.js'
import 'react-native-gesture-handler'
import 'react-native-reanimated'
import { Platform } from 'react-native'
import { registerRootComponent } from 'expo'
import { Boot } from './native/Boot.jsx'

// A home-screen tap starts JS and expects the widget handler during this evaluation.
// Waiting for the iOS bridge delay drops Did and Did not.
if (Platform.OS === 'android') {
  require('./native/widget-setup.android.js')
}
if (Platform.OS === 'ios') {
  require('./native/widget-setup.ios.js').installWidgetSetup()
}

registerRootComponent(Boot)
