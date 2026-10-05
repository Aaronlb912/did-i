import { Suspense, lazy, useEffect, useState } from 'react'
import { shouldShowMarketing } from './site/path.js'
import { webAppPublic } from './site/web-app.js'

// The landing page and the app load apart, so neither pays for the other.
const App = lazy(() => import('./App.jsx'))
const MarketingSite = lazy(() => import('./site/MarketingSite.jsx').then((mod) => ({ default: mod.MarketingSite })))

// Same rule as pickSiteOrApp in MarketingSite.jsx, without loading that page.
function pickSiteOrApp() {
  if (typeof window === 'undefined') return 'app'
  if (!webAppPublic()) return 'marketing'
  return shouldShowMarketing() ? 'marketing' : 'app'
}

export default function Root() {
  const [mode, setMode] = useState(() => pickSiteOrApp())

  useEffect(() => {
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

  return <Suspense fallback={null}>{mode === 'marketing' ? <MarketingSite /> : <App />}</Suspense>
}
