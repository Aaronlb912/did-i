import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useOnline() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    let alive = true
    NetInfo.fetch().then((state) => {
      if (alive) setOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
    })
    const sub = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
    })
    return () => {
      alive = false
      sub()
    }
  }, [])

  return online
}
