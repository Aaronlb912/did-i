import './native/fatal-guard.cjs'
import './native/bootstrap.js'
import 'react-native-gesture-handler'
import 'react-native-reanimated'
import { registerRootComponent } from 'expo'
import { Boot } from './native/Boot.jsx'

registerRootComponent(Boot)
