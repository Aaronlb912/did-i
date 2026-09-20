import { goHash } from '../site/hash.js'
import { BoardShell } from './BoardShell.jsx'
import { StarterPicks } from './StarterPicks.jsx'
import { nextMark } from './achievements.js'
import { hallHeat } from './hall-feel.js'
import { HeatPips } from './HeatPips.jsx'
import { homeLine } from './hall-pages.js'
import { t } from './i18n.js'
import { usePrefs } from './prefs.js'
import { boardDate, formatBoardDate } from './recurrence.js'
import { PurseLine } from './PurseLine.jsx'
import { mergePurses } from './purse.js'
import { firstName } from './session.js'
import { leftoverOn, taggedDue } from './tags.js'
import { TagRail } from './TagRail.jsx'
import { NightMeter } from './NightMeter.jsx'

function purseLine(purse) {
  const coins = purse.coins === 1 ? t('home.coinsOne') : t('home.coins', { n: purse.coins })
  const gems = purse.gems === 1 ? t('home.gemsOne') : t('home.gems', { n: purse.gems })
  return `${coins} · ${gems}`
}

export function Home({ book, boards = [], tagId = '', onTag, onChange, now }) {
  usePrefs()
  const clock = now || new Date()
  const dateIso = boardDate(clock, book.dayFoldHour)
  const line = homeLine(book, clock)
  const shelf = boards.length ? boards : [book]
  const due = taggedDue(shelf, clock, tagId)
  const leftAll = leftoverOn(shelf, clock, tagId)
  const hallOn = due.length > 0 && due.every((row) => row.answer)
  const name = firstName(book)
  const heat = hallHeat(book, clock)
  const hunt = nextMark(book)
  const purse = mergePurses(shelf)
  const kicker =
    !tagId && leftAll
      ? leftAll === 1
        ? t('home.leftAllOne')
        : t('home.leftAll', { n: leftAll })
      : t(`home.status.${line.kind}`)
  const tonightTitle = line.kind === 'ask' ? line.title : t(`home.line.${line.kind}`)

  return (
    <BoardShell book={book} now={clock} title={book.title} date={formatBoardDate(dateIso)}>
      <section className="di-page di-home">
        <p className="di-face-plate">{t('home.kicker')}</p>
        <h2 className="di-page-title">{name ? t('home.hey', { name }) : book.title}</h2>
        <p className="di-detail-meta">{kicker}</p>
        <TagRail boards={boards} tagId={tagId} onTag={onTag} now={clock} />

        <PurseLine purse={purse} className="di-purse">
          {purseLine(purse)}
        </PurseLine>

        <div className="di-home-card di-home-heat">
          <p className="di-face-plate">{t('home.streak')}</p>
          <p className="di-heat-score">
            {heat}
            <span>{t('home.of5')}</span>
          </p>
          <HeatPips heat={heat} />
          <button className="di-text" type="button" onClick={() => goHash('/calendar')}>
            {t('home.calendar')}
          </button>
          {!book.quietMode && hunt ? (
            <p className="di-detail-meta">{t('home.nextMark', { name: hunt.name })}</p>
          ) : null}
        </div>

        <div className="di-home-card">
          <p className="di-face-plate">{t('home.tonight')}</p>
          <NightMeter due={due} />
          <h3 className="di-question">{tonightTitle}</h3>
          <div className="di-hang-actions">
            {line.kind === 'empty' ? (
              <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
                {t('home.add')}
              </button>
            ) : (
              <button
                className="di-did di-did-small"
                type="button"
                onClick={() => goHash('/tonight', line.face ? { face: line.face } : '')}
              >
                {line.kind === 'ask' ? t('home.answer') : t('home.openTonight')}
              </button>
            )}
          </div>
        </div>

        {line.kind === 'empty' ? (
          <StarterPicks book={book} onChange={onChange} now={clock} label={t('first.picks')} />
        ) : null}

        <div className="di-group">
          <p className="di-slot-label">{t('home.look')}</p>
          <div className="di-tray-files">
            <button className="di-key" type="button" onClick={() => goHash('/calendar')}>
              {t('home.calendar')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/week')}>
              {t('home.week')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/streaks')}>
              {t('home.streaks')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/stats')}>
              {t('home.stats')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/feed')}>
              {t('home.feed')}
            </button>
            <button className="di-key" type="button" onClick={() => goHash('/marks')}>
              {t('home.marks')}
            </button>
          </div>
        </div>
      </section>
    </BoardShell>
  )
}
