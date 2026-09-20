import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import App from './App.jsx'
import { MarketingSite, pickSiteOrApp } from './site/MarketingSite.jsx'

export default function Root() {
  const [mode, setMode] = useState(() => (Capacitor.isNativePlatform() ? 'app' : pickSiteOrApp()))

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return undefined
    function sync() {
      setMode(pickSiteOrApp())
    }
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  if (mode === 'marketing') return <MarketingSite />
  return <App />
}
