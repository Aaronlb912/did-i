import { goHash } from '../site/hash.js'
import { clockWords } from './hall-pages.js'
import { BoardShell } from './BoardShell.jsx'
import { openFeedback } from './feedback.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'

// One section per feature, each with a way to it.
const HELP_MORE = [
  { id: 'questions', title: 'help.questions', body: ['help.questionsP'], go: '/lamps', goLabel: 'help.questionsGo' },
  { id: 'pings', title: 'help.pings', body: ['help.pingsP'], go: '/pings', goLabel: 'help.pingsGo' },
  { id: 'widget', title: 'help.widget', body: ['help.widgetP'] },
  { id: 'people', title: 'help.people', body: ['help.peopleP'], go: '/people', goLabel: 'help.peopleGo' },
  { id: 'we', title: 'help.we', body: ['help.weP1', 'help.weP2'], go: '/we/new', goLabel: 'help.weGo' },
  { id: 'cheers', title: 'help.cheers', body: ['help.cheersP'] },
  { id: 'coins', title: 'help.coins', body: ['help.coinsP'], go: '/shop', goLabel: 'help.shopGo' },
]

export function Help({ book, now }) {
  usePrefs()
  const clock = now || new Date()

  return (
    <BoardShell
      book={book}
      now={clock}
      title={book.title}
      date={formatBoardDate(boardDate(clock, book.dayFoldHour))}
    >
      <article className="di-page di-help">
        <p className="di-face-plate">{t('help.kicker')}</p>
        <h2 className="di-page-title">{t('help.title')}</h2>
        <p className="di-about-p">{t('help.lead')}</p>

        <section className="di-help-block" id="night">
          <h3>{t('help.tonight')}</h3>
          <p>{t('help.tonightP1')}</p>
          <p>{t('help.tonightP2')}</p>
        </section>

        <section className="di-help-block" id="streak">
          <h3>{t('help.streak')}</h3>
          <p>{t('help.streakP')}</p>
          <h3>{t('help.grace')}</h3>
          <p>{t('help.graceP', { time: clockWords('09:00') })}</p>
          <div className="di-hang-actions">
            <button className="di-key" type="button" onClick={() => goHash('/marks')}>
              {t('help.marks')}
            </button>
          </div>
        </section>

        {HELP_MORE.map((part) => (
          <section className="di-help-block" id={part.id} key={part.id}>
            <h3>{t(part.title)}</h3>
            {part.body.map((key) => (
              <p key={key}>{t(key)}</p>
            ))}
            {part.go ? (
              <div className="di-hang-actions">
                <button className="di-key" type="button" onClick={() => goHash(part.go)}>
                  {t(part.goLabel)}
                </button>
              </div>
            ) : null}
          </section>
        ))}

        <section className="di-help-block" id="data">
          <h3>{t('help.phone')}</h3>
          <p>{t('help.phoneP')}</p>
        </section>

        <section className="di-help-block" id="legal">
          <h3>{t('help.legal')}</h3>
          <p>{t('help.legalP')}</p>
          <div className="di-hang-actions">
            <button className="di-key di-link-did" type="button" onClick={() => goHash('/privacy')}>
              {t('settings.privacy')}
            </button>
            <button className="di-key di-link-did" type="button" onClick={() => goHash('/terms')}>
              {t('settings.terms')}
            </button>
          </div>
        </section>

        <section className="di-help-block" id="feedback">
          <h3>{t('help.feedback')}</h3>
          <p>{t('help.feedbackP')}</p>
          <div className="di-hang-actions">
            <button className="di-did di-did-small" type="button" onClick={openFeedback}>
              {t('feedback.send')}
            </button>
          </div>
        </section>

        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/home')}>
            {t('help.home')}
          </button>
        </div>
      </article>
    </BoardShell>
  )
}
