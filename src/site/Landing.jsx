import { t } from '../lib/i18n.js'
import { useReduceMotion } from '../lib/useReduceMotion.js'
import { MarketingShell } from './MarketingShell.jsx'
import { StoreButtons } from './StoreButtons.jsx'

const L = (key, vars) => t(`web.landing.${key}`, vars)
const DID = () => t('tonight.answerDid')
const NOT_YET = () => t('stats.nope')

// The Tonight screen, drawn like the press shots: a card swipes right for Did.
function LandingPhone() {
  const reduce = useReduceMotion()
  const pills = [1, 2, 3]
  return (
    <div className={['di-log-phone', reduce ? 'is-still' : ''].filter(Boolean).join(' ')} role="img" aria-label={L('phone.aria')}>
      <div className="di-log-status" aria-hidden="true">
        <span>9:41</span>
        <i />
        <span>●●▮</span>
      </div>
      <div className="di-log-ph-top">
        <b>{t('tonight.didI')}</b>
        <div className="di-log-ph-r">
          <span className="di-log-purse">
            <span className="di-log-coin" />8<span className="di-log-gem" />0
          </span>
          <span className="di-log-grid" />
        </div>
      </div>
      <div className="di-log-count">
        <b>3</b>
        <span>{t('tonight.meter', { n: 5 })}</span>
      </div>
      <div className="di-log-bar">
        <i />
      </div>
      <div className="di-log-pills">
        {pills.map((n) => (
          <div className="di-log-pill" key={n}>
            <span className="di-log-dot" />
            <div>
              <span>{L(`phone.q${n}`)}</span>
              <small>{L(`phone.f${n}`)}</small>
            </div>
          </div>
        ))}
      </div>
      <span className="di-log-all">
        ≡ {t('tags.all')} <b>2</b>
      </span>
      <div className="di-log-stage">
        <div className="di-log-card">
          <span className="di-log-stamp">{t('tonight.swipeDid')}</span>
          <span className="di-log-folder">{L('phone.f3')}</span>
          <div className="di-log-q">{L('phone.card')}</div>
        </div>
        <div className="di-log-rail">
          <span>{t('tonight.swipeDid')}</span>
        </div>
      </div>
    </div>
  )
}

function LandingWidget() {
  return (
    <div className="di-log-widget">
      <span className="di-log-mono">{L('e2.widgetMeta')}</span>
      <div className="di-log-wq">{L('e2.widgetQ')}</div>
      <div className="di-log-wrow">
        <span className="is-no">{NOT_YET()}</span>
        <span className="is-yes">{DID()}</span>
      </div>
    </div>
  )
}

function LandingWatch() {
  return (
    <div className="di-log-watch">
      <svg className="di-log-ring" viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">
        <rect x="2" y="2" width="96" height="116" rx="26" />
        <rect x="2" y="2" width="96" height="116" rx="26" pathLength="100" strokeDasharray="33 100" />
      </svg>
      <span className="di-log-mono">{L('e2.watchMeta')}</span>
      <div className="di-log-watch-q">{L('e2.watchQ')}</div>
      <div className="di-log-watch-b" aria-hidden="true">
        <span className="is-s">◷</span>
        <span className="is-l">✓</span>
      </div>
    </div>
  )
}

function Entry({ num, n, children }) {
  return (
    <article className="di-log-entry">
      <div className="di-log-num">{num}</div>
      <div>
        <div className="di-log-mono">{L(`e${n}.kicker`)}</div>
        <h3>{L(`e${n}.title`)}</h3>
        <p>{L(`e${n}.p1`)}</p>
        {n !== 4 ? <p>{L(`e${n}.p2`)}</p> : null}
      </div>
      <div className="di-log-exhibit">
        {children}
        <div className="di-log-cap">
          <b>{L(`e${n}.capTitle`)}</b>
          {L(`e${n}.cap`)}
        </div>
      </div>
    </article>
  )
}

function Rows({ rows }) {
  return (
    <div className="di-log-rows">
      {rows.map(([q, status, wait]) => (
        <div key={q}>
          {q} <em className={wait ? 'is-wait' : undefined}>{status}</em>
        </div>
      ))}
    </div>
  )
}

export function Landing() {
  const days = L('e4.days').split(' ')
  const week = ['d', 'd', 'm', 'd', 'd', 'd', '']
  return (
    <MarketingShell path="/" wide>
      <div className="di-log">
        <div className="di-log-strip di-log-mono">
          <span>{L('strip.tonight')}</span>
          <span>{L('strip.vol')}</span>
          <span>did-i.app</span>
        </div>

        <section className="di-log-hero">
          <div>
            <a
              className="di-log-hunt"
              href="https://www.producthunt.com/products/did-i-habit-reminders?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-did-i-habit-reminders"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                alt="Did I??? Habit Reminders on Product Hunt"
                width="250"
                height="54"
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1293446&theme=light"
              />
            </a>
            <div className="di-log-mono">{L('hero.kicker')}</div>
            <h1>
              {L('hero.title')} <em>{L('hero.titleEm')}</em>
            </h1>
            <p className="di-log-lede">{L('hero.lead')}</p>
            <div className="di-log-chips">
              {[1, 2, 3, 4].map((n) => (
                <span key={n}>{L(`hero.c${n}`)}</span>
              ))}
            </div>
            <StoreButtons />
          </div>
          <LandingPhone />
        </section>

        <div className="di-log-head di-log-mono">
          <span>{L('log.kicker')}</span>
          <span>{L('log.count')}</span>
        </div>
        <h2>{L('log.title')}</h2>

        <Entry num="i." n={1}>
          <Rows
            rows={[
              [L('e1.r1'), DID()],
              [L('e1.r2'), DID()],
              [L('e1.r3'), L('e1.open'), true],
            ]}
          />
        </Entry>

        <Entry num="ii." n={2}>
          <div className="di-log-pair">
            <LandingWidget />
            <LandingWatch />
          </div>
        </Entry>

        <Entry num="iii." n={3}>
          <Rows
            rows={[
              [L('e3.r1'), L('e3.s1')],
              [L('e3.r2'), L('e3.s2'), true],
              [L('e3.r3'), DID()],
            ]}
          />
        </Entry>

        <Entry num="iv." n={4}>
          <div className="di-log-week">
            {week.map((kind, i) => (
              <div key={i}>
                <i className={kind ? `is-${kind}` : undefined} />
                {days[i]}
              </div>
            ))}
          </div>
          <div className="di-log-toggle">
            <div>
              <b>{L('e4.gentle')}</b>
              <small>{L('e4.gentleLine')}</small>
            </div>
            <span className="di-log-sw" aria-hidden="true" />
          </div>
        </Entry>

        <section className="di-log-keep">
          <div>
            <div className="di-log-mono">{L('keep.kicker')}</div>
            <h2>{L('keep.title')}</h2>
            <ul className="di-log-list">
              {[1, 2, 3, 4, 5].map((n) => (
                <li key={n}>{L(`keep.l${n}`)}</li>
              ))}
            </ul>
          </div>
          <div className="di-log-receipt" role="img" aria-label={L('receipt.aria')}>
            <h4>{L('receipt.title')}</h4>
            <div className="di-log-sub">{L('receipt.aria')}</div>
            <div className="di-log-r">
              <span>{L('receipt.questions')}</span>
              <span>4</span>
            </div>
            <div className="di-log-r">
              <span>{DID()}</span>
              <span>3</span>
            </div>
            <div className="di-log-r">
              <span>{NOT_YET()}</span>
              <span>1</span>
            </div>
            <div className="di-log-r">
              <span>{L('receipt.streak')}</span>
              <span>{L('receipt.streakVal')}</span>
            </div>
            <div className="di-log-tot">
              <span>{L('receipt.price')}</span>
              <span>{L('hero.c4')}</span>
            </div>
          </div>
        </section>

        <section className="di-log-end">
          <div className="di-log-mono">{L('end.kicker')}</div>
          <h2>{L('end.title')}</h2>
          <p className="di-log-lede">{L('end.lead')}</p>
          <StoreButtons />
        </section>
      </div>
    </MarketingShell>
  )
}
