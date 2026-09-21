import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import '../lib/did-i.css'
import { applyPrefsToDocument, writePrefs } from '../lib/prefs.js'
import { WebFixtures } from './web-fixtures.jsx'
import { NativeFixtures } from './native-fixtures.jsx'

writePrefs({ theme: 'dark', locale: 'en', lessMotion: true })
applyPrefsToDocument({ theme: 'dark', locale: 'en', lessMotion: true })

function ParityPage() {
  useEffect(() => {
    document.documentElement.setAttribute('data-visual-ready', '1')
  }, [])

  return (
    <div style={{ background: '#0e1014', minHeight: '100vh', padding: '24px 0' }}>
      <section aria-label="web fixtures">
        <WebFixtures />
      </section>
      <section aria-label="native fixtures" style={{ marginTop: 32 }}>
        <NativeFixtures />
      </section>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<ParityPage />)
