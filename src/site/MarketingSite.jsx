import { useEffect, useState } from 'react'
import { applyPrefsToDocument, readPrefs } from '../lib/prefs.js'
import { usePrefs } from '../lib/prefs.js'
import { Download } from './Download.jsx'
import { Landing } from './Landing.jsx'
import { MarketingPrivacy, MarketingTerms } from './MarketingLegal.jsx'
import { readMarketingPath, shouldShowMarketing } from './path.js'
import { webAppPublic } from './web-app.js'
import '../lib/did-i.css'
import './site.css'

function MarketingPage() {
  const prefs = usePrefs()
  const [path, setPath] = useState(readMarketingPath)

  useEffect(() => {
    applyPrefsToDocument(prefs)
    document.documentElement.dataset.site = 'marketing'
    function sync() {
      setPath(readMarketingPath())
    }
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      delete document.documentElement.dataset.site
    }
  }, [prefs])

  if (path === '/privacy') return <MarketingPrivacy />
  if (path === '/terms') return <MarketingTerms />
  if (path === '/download') return <Download />
  return <Landing />
}

export function MarketingSite() {
  return <MarketingPage />
}

export function pickSiteOrApp() {
  if (typeof window === 'undefined') return 'app'
  if (!webAppPublic()) return 'marketing'
  return shouldShowMarketing() ? 'marketing' : 'app'
}
