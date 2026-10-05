import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import Root from './Root.jsx'
import { Boundary } from './lib/Boundary.jsx'
import { redirectBlockedWebApp, redirectLegacyAppHash } from './site/path.js'
import { webAppPublic } from './site/web-app.js'
import { applyPrefsToDocument, readPrefs } from './lib/prefs.js'
import { hookErrorReport } from './lib/report.js'
import { startLocales } from './lib/locale-load.js'

applyPrefsToDocument(readPrefs())
hookErrorReport()

if (webAppPublic()) {
  registerSW({ immediate: true })
}

// t() stays synchronous: the language file is in before the first render.
if (!redirectBlockedWebApp() && !redirectLegacyAppHash()) {
  startLocales().finally(mount)
}

function mount() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Boundary>
        <Root />
      </Boundary>
    </StrictMode>,
  )
}
