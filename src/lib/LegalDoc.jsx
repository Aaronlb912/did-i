import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { LegalArticle, PRIVACY_SECTIONS, TERMS_SECTIONS } from './LegalArticle.jsx'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

export function LegalDoc({ book, now, kind, sections, otherPath, otherLabelKey }) {
  usePrefs()
  const clock = now || new Date()

  return (
    <BoardShell
      book={book}
      now={clock}
      title={t(`legal.${kind}.title`)}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <article className="di-page di-legal">
        <LegalArticle kind={kind} sections={sections} />
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/settings')}>
            {t('legal.backSettings')}
          </button>
          {otherPath ? (
            <button className="di-key" type="button" onClick={() => goHash(otherPath)}>
              {t(otherLabelKey)}
            </button>
          ) : null}
        </div>
      </article>
    </BoardShell>
  )
}

export function Privacy(props) {
  return (
    <LegalDoc
      {...props}
      kind="privacy"
      sections={PRIVACY_SECTIONS}
      otherPath="/terms"
      otherLabelKey="legal.termsShort"
    />
  )
}

export function Terms(props) {
  return (
    <LegalDoc
      {...props}
      kind="terms"
      sections={TERMS_SECTIONS}
      otherPath="/privacy"
      otherLabelKey="legal.privacyShort"
    />
  )
}
