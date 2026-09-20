import { useEffect, useState } from 'react'
import { applyPrefsToDocument, readPrefs } from '../lib/prefs.js'
import { usePrefs } from '../lib/prefs.js'
import { Landing } from './Landing.jsx'
import { MarketingPrivacy, MarketingTerms } from './MarketingLegal.jsx'
import { readMarketingPath, shouldShowMarketing } from './path.js'
import '../lib/did-i.css'
import './site.css'

function MarketingPage() {
  usePrefs()
  const [path, setPath] = useState(readMarketingPath)

  useEffect(() => {
    applyPrefsToDocument(readPrefs())
    document.documentElement.lang = readPrefs().locale || 'en'
    function sync() {
      setPath(readMarketingPath())
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  if (path === '/privacy') return <MarketingPrivacy />
  if (path === '/terms') return <MarketingTerms />
  return <Landing />
}

export function MarketingSite() {
  return <MarketingPage />
}

export function pickSiteOrApp() {
  if (typeof window === 'undefined') return 'app'
  return shouldShowMarketing() ? 'marketing' : 'app'
}
