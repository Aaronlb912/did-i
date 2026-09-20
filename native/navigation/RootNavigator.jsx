import { useEffect, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AppShell } from '../AppShell.jsx'
import { bindNavigation, goHash } from './hash.js'

const Stack = createNativeStackNavigator()

export function RootNavigator() {
  const navRef = useRef(null)

  useEffect(() => {
    bindNavigation(() => {
      navRef.current?.navigate('Hall')
    })
    goHash('/tonight')
  }, [])

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Hall" component={AppShell} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
