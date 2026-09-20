import { Component } from 'react'
import { t } from './i18n.js'

// Without this a thrown render is a black screen and the person has no
// way out but force quitting. Their questions are on the phone, so the
// safe move is always to offer a reload before anything else.

const SEEN = 'did-i-last-break'

function note(error, info) {
  const line = {
    at: new Date().toISOString(),
    what: String(error?.message || error || 'unknown'),
    where: String(info?.componentStack || '').split('\n').slice(0, 4).join(' ').trim(),
    page: typeof window === 'undefined' ? '' : window.location.hash,
  }
  try {
    localStorage.setItem(SEEN, JSON.stringify(line))
  } catch {
    // Not worth failing twice over.
  }
  // Somewhere for a reporter to hook on to later without touching this file.
  try {
    window.dispatchEvent(new CustomEvent('did-i-broke', { detail: line }))
  } catch {
    // Same.
  }
  return line
}

export function lastBreak() {
  try {
    const raw = localStorage.getItem(SEEN)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { broke: null }
  }

  static getDerivedStateFromError(error) {
    return { broke: error }
  }

  componentDidCatch(error, info) {
    note(error, info)
  }

  render() {
    if (!this.state.broke) return this.props.children
    return (
      <div className="di-hall" data-theme="dark">
        <div className="di-board">
          <section className="di-face">
            <p className="di-face-plate">{t('broke.kicker')}</p>
            <h2 className="di-question">{t('broke.title')}</h2>
            <p className="di-detail-meta">{t('broke.body')}</p>
            <div className="di-hang-actions">
              <button
                className="di-did di-did-small"
                type="button"
                onClick={() => {
                  window.location.hash = '#/'
                  window.location.reload()
                }}
              >
                {t('broke.again')}
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }
}
