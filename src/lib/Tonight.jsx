import { goHash } from '../site/hash.js'
import { FinishFace } from './FinishFace.jsx'
import { LampFace } from './LampFace.jsx'
import { PillPlate } from './PillPlate.jsx'
import { DIT_ENABLED } from './features.js'
import { FamilyTonight } from './FamilyTonight.jsx'
import { StarterPicks } from './StarterPicks.jsx'
import { MastCogs } from './SettingsCog.jsx'
import { WaitPlate } from './WaitPlate.jsx'
import { HolePlate } from './HolePlate.jsx'
import { activeBuddy, activeLook } from './dit-board.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { NightMeter } from './NightMeter.jsx'
import { useAccount } from './account.js'
import { useSync } from './cloud-sync.js'
import { usePrefs, useTheme } from './prefs.js'
import { PurseLine } from './PurseLine.jsx'
import { mergePurses } from './purse.js'
import { WeekStrip } from './WeekStrip.jsx'
import { useReduceMotion } from './useReduceMotion.js'
import { useTonightKeys } from './useTonightKeys.js'
import { useTonightStack } from './useTonightStack.js'
import { TagRail } from './TagRail.jsx'
import { SwipePullSlot } from './SwipePull.jsx'
import './did-i.css'

export function Tonight({ value, boards = [], tagId = '', onTag, onChange, now, focusLampId }) {
  usePrefs()
  const theme = useTheme()
  const reduce = useReduceMotion()
  const account = useAccount()
  const sync = useSync()
  const stack = useTonightStack({ value, boards, tagId, onChange, now, focusLampId })
  useTonightKeys(stack)

  const purse = mergePurses(stack.shelf)

  let body = null
  if (stack.bodyKind === 'hole' && stack.holePick) {
    const holeBook = stack.bookOf(stack.holePick)
    body = (
      <HolePlate
        lamp={stack.holePick.lamp}
        periodKey={stack.holePick.periodKey}
        wasSkip={stack.holeWasSkip}
        onLate={() =>
          stack.mark(
            { lamp: stack.holePick.lamp, periodKey: stack.holePick.periodKey, book: holeBook },
            'late',
          )
        }
        onSkip={
          stack.holeWasSkip
            ? undefined
            : () =>
                stack.mark(
                  { lamp: stack.holePick.lamp, periodKey: stack.holePick.periodKey, book: holeBook },
                  'skip',
                )
        }
        onClose={() => stack.closePlates()}
      />
    )
  } else if (stack.bodyKind === 'wait' && stack.waitPick) {
    body = (
      <WaitPlate
        row={stack.waitPick}
        onClose={() => stack.closePlates()}
        onOpenLamp={() => goHash('/lamp', { id: stack.waitPick.lamp.id })}
      />
    )
  } else if (stack.bodyKind === 'pillView' && stack.pillPick) {
    body = (
      <PillPlate
        row={stack.pillPick}
        readOnly
        buddy={activeBuddy(stack.bookOf(stack.pillPick))}
      />
    )
  } else if (stack.bodyKind === 'pill' && stack.pillPick) {
    body = (
      <PillPlate
        row={stack.pillPick}
        buddy={activeBuddy(stack.bookOf(stack.pillPick))}
        onDid={() => stack.mark(stack.pillPick, 'yes')}
        onNope={() => stack.mark(stack.pillPick, 'skip')}
      />
    )
  } else if (stack.bodyKind === 'empty') {
    body = (
      <section className="di-empty">
        <p className="di-face-plate">{t('tonight.emptyKicker')}</p>
        <h2 className="di-question">{t('tonight.emptyTitle')}</h2>
        <StarterPicks book={value} onChange={onChange} now={stack.clock} label={t('first.picks')} />
        <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
          {t('tonight.write')}
        </button>
      </section>
    )
  } else if (stack.bodyKind === 'finish') {
    body = <FinishFace count={stack.finishCount} onContinue={stack.continueStack} onRest={stack.restStack} />
  } else if (stack.bodyKind === 'hall') {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.doneKicker')}</p>
        <h2 className="di-question">{t('tonight.doneTitle')}</h2>
      </section>
    )
  } else if (stack.bodyKind === 'rest') {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.restKicker')}</p>
        <h2 className="di-question">
          {stack.finishCount === 1
            ? t('tonight.restOne')
            : t('tonight.restTitle', { n: stack.finishCount })}
        </h2>
        <p className="di-detail-meta">{t('tonight.restHint')}</p>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={stack.continueStack}>
            {t('tonight.finishKeep')}
          </button>
        </div>
      </section>
    )
  } else if (stack.bodyKind === 'face' && stack.faceRow) {
    const faceRow = stack.faceRow
    body = (
      <LampFace
        key={`${stack.rowKey(faceRow)}:${faceRow.periodKey}:${faceRow.answer?.status || 'open'}`}
        row={faceRow}
        book={stack.bookOf(faceRow)}
        tag={faceRow.tag}
        keys={stack.recentPeriodKeys(faceRow.lamp, stack.dateIso, 7)}
        buddy={activeBuddy(stack.bookOf(faceRow))}
        onPickHole={stack.pickHole}
        onYes={() => stack.mark(faceRow, 'yes')}
        onSkip={() => stack.mark(faceRow, 'skip')}
      />
    )
  } else if (stack.bodyKind === 'waiting') {
    const next = stack.nextOpenTime(stack.waiting)
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.waitKicker')}</p>
        <h2 className="di-question">{t('tonight.waitTitle')}</h2>
        <p className="di-detail-meta">
          {next
            ? t('tonight.waitOpens', {
                name: stack.shortLabel(next.lamp),
                time: clockWords(next.lamp.askAfter),
              })
            : t('tonight.waitLater')}
        </p>
      </section>
    )
  } else if (stack.bodyKind === 'off') {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.offKicker')}</p>
        <h2 className="di-question">{t('tonight.offTitle')}</h2>
        <div className="di-hang-actions">
          <button className="di-did di-did-small" type="button" onClick={() => goHash('/add')}>
            {t('home.add')}
          </button>
          <button className="di-key" type="button" onClick={() => goHash('/lamps')}>
            {t('tonight.seeAll')}
          </button>
        </div>
      </section>
    )
  } else if (stack.bodyKind === 'idle') {
    body = (
      <section className="di-face">
        <p className="di-face-plate">{t('tonight.didI')}</p>
        <h2 className="di-question">{t('tonight.waitTitle')}</h2>
      </section>
    )
  }

  return (
    <div
      className="di-hall"
      data-heat={stack.heat}
      data-hour={stack.hour}
      data-sit={stack.hallOn ? 'on' : 'ask'}
      data-look={activeLook(stack.liveValue)}
      data-theme={theme}
      {...(reduce ? { 'data-reduce-motion': '' } : {})}
    >
      <div className="di-board" data-heat={stack.heat}>
        <header className="di-mast">
          {stack.titleEdit ? (
            <input
              className="di-title-input"
              value={stack.titleDraft}
              onChange={(event) => stack.setTitleDraft(event.target.value)}
              onBlur={stack.saveTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  stack.saveTitle()
                }
              }}
              aria-label={t('tonight.boardName')}
            />
          ) : (
            <button className="di-title" type="button" onClick={() => stack.setTitleEdit(true)}>
              {tagId ? value.title : t('tonight.didI')}
            </button>
          )}
          <p className="di-date">{stack.formatBoardDate(stack.dateIso)}</p>
          <div className="di-mast-actions">
            <PurseLine purse={purse} className="di-mast-purse" gemsLink />
            <MastCogs showAdd />
          </div>
        </header>

        {account.user && sync.how === 'miss' ? (
          <p className="di-set-note di-off-line">{t('tonight.syncMiss')}</p>
        ) : null}

        <TagRail boards={stack.shelf} tagId={tagId} onTag={onTag} now={stack.clock} />

        <NightMeter due={stack.due} />

        {stack.dueWithWait.length > 0 && !stack.holePick && !stack.waitPick ? (
          <div className="di-edge-wrap">
            <ul className="di-edge" aria-label={t('tonight.aria')}>
              {stack.dueWithWait.map((row) => {
                const on =
                  row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
                const skip = row.answer?.status === 'skip'
                const late = row.answer?.status === 'late'
                const isFace = stack.pillPick
                  ? stack.rowKey(row) === stack.rowKey(stack.pillPick)
                  : Boolean(stack.faceRow) && stack.rowKey(row) === stack.rowKey(stack.faceRow)
                return (
                  <li key={stack.rowKey(row)}>
                    <button
                      type="button"
                      className={[
                        'di-jewel',
                        on ? 'is-on' : '',
                        skip ? 'is-skip' : '',
                        late ? 'is-late' : '',
                        row.waiting ? 'is-wait' : '',
                        isFace ? 'is-face' : '',
                        stack.hallOn && on ? 'is-sit' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      data-filament={on ? stack.filamentLevel(stack.bookOf(row), row.lamp.id) : 0}
                      onClick={() => stack.jewelClick(row)}
                    >
                      <span className="di-jewel-ring">
                        <span className="di-jewel-glass" />
                      </span>
                      <span className="di-jewel-label">
                        {stack.shortLabel(row.lamp)}
                        {row.tag && stack.shelf.length > 1 ? <i className="di-lamp-tag">{row.tag}</i> : null}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {stack.catchUp.length > 0 && !stack.holePick && !stack.waitPick ? (
          <div className="di-holes" aria-label={t('tonight.holesAria')}>
            <p className="di-slot-label">{t('tonight.lastNight')}</p>
            <ul className="di-edge">
              {stack.catchUp.map((row) => (
                <li key={stack.rowKey(row)}>
                  <button
                    type="button"
                    className="di-jewel is-hole"
                    onClick={() => stack.pickHole(row.lamp, row.periodKey, row)}
                  >
                    <span className="di-jewel-ring">
                      <span className="di-jewel-glass" />
                    </span>
                    <span className="di-jewel-label">{stack.shortLabel(row.lamp)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <SwipePullSlot>{body}</SwipePullSlot>

        {stack.undo ? (
          <p className="di-undo di-screws-print-hide">
            {stack.undo.label}{' '}
            <button className="di-key" type="button" onClick={stack.applyUndo}>
              {t('tonight.undo')}
            </button>
          </p>
        ) : null}

        {DIT_ENABLED ? <FamilyTonight /> : null}

        <WeekStrip boards={stack.shelf} tagId={tagId} now={stack.clock} />
      </div>

      <ol className="di-print-slip">
        <li className="di-print-title">{value.title} · {stack.formatBoardDate(stack.dateIso)}</li>
        {stack.unanswered.length ? (
          stack.unanswered.map((row) => (
            <li key={row.lamp.id}>
              <span className="di-print-box" />
              {row.lamp.question}
            </li>
          ))
        ) : (
          <li>{t('tonight.printDone')}</li>
        )}
      </ol>
    </div>
  )
}
