import { useEffect, useState } from 'react'
import { dueByUrgency } from './board-json.js'
import { goHash } from '../site/hash.js'
import { FinishFace } from './FinishFace.jsx'
import { LampFace } from './LampFace.jsx'
import { PillPlate } from './PillPlate.jsx'
import { StarterPicks } from './StarterPicks.jsx'
import { MastCogs } from './SettingsCog.jsx'
import { WaitPlate } from './WaitPlate.jsx'
import { HolePlate } from './HolePlate.jsx'
import { activeBuddy, activeLook } from './active-look.js'
import { clockWords } from './hall-pages.js'
import { t } from './i18n.js'
import { NightMeter } from './NightMeter.jsx'
import { useAccount } from './account.js'
import { useSync } from './cloud-sync.js'
import { usePrefs, useTheme } from './prefs.js'
import { PurseLine } from './PurseLine.jsx'
import { fireCheer, mergePurses } from './purse.js'
import { useReduceMotion } from './useReduceMotion.js'
import { useTonightKeys } from './useTonightKeys.js'
import { useTonightStack } from './useTonightStack.js'
import { TagRail } from './TagRail.jsx'
import { SwipePullSlot } from './SwipePull.jsx'
import { EdgeScroll } from './EdgeScroll.jsx'
import { FamilyTonight } from './FamilyTonight.jsx'
import { WeFace, useWeAnswer, weOpenForMe } from './DidWe.jsx'
import { takeWeFinishes, useWeTonight, weInFilter, weStats } from './did-we.js'
import { shelfMarks, weMarksFor } from './achievements.js'

// Where the stack has no card of your own to answer, so a Did we can have it.
const WE_OVER = new Set(['hall', 'rest', 'off', 'waiting'])
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
  const we = useWeTonight(account.user)
  const weAns = useWeAnswer(we.reload, value)
  // Someone else's did finished a card: play their cheer, once, with a line.
  const [weFinish, setWeFinish] = useState(null)
  useEffect(() => {
    if (!account.user) return
    // Did we achievements come from the shared cards, so they unlock here.
    const earned = weMarksFor(shelfMarks(boards.length ? boards : [value]), weStats(we.cards))
    if (earned.length && onChange) onChange({ ...value, unlocked: [...(value.unlocked || []), ...earned] })
    const [first, ...more] = takeWeFinishes(we.cards)
    if (!first) return
    fireCheer(first.cheer, first.stage)
    setWeFinish({ ...first, more: more.length })
  }, [account.user, we.cards])
  // The folder filter applies to Did we cards the same way.
  const folderTitles = tagId
    ? (boards || []).filter((item) => tagId.split(',').includes(item.id)).map((item) => item.title)
    : []
  const weCards = we.cards.filter((card) => weInFilter(card, folderTitles))
  // Your own questions come first; then an unanswered Did we takes the card.
  const weFirst =
    WE_OVER.has(stack.bodyKind) && !stack.cheer && weOpenForMe(weCards).length > 0

  let body = null
  if (weFirst) {
    body = <WeFace cards={weCards} ans={weAns} />
  } else if (stack.bodyKind === 'hole' && stack.holePick) {
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
        <p className="di-detail-meta">{t('tonight.restHint', { time: clockWords('09:00') })}</p>
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

        {weFinish ? (
          <button
            type="button"
            className="di-key di-we-finish"
            onClick={() => {
              setWeFinish(null)
              goHash('/we', { id: weFinish.card.id })
            }}
          >
            {weFinish.more
              ? t('we.finishedMany', { n: weFinish.more + 1 })
              : t('we.finishedBy', { name: weFinish.name || t('people.someone'), question: weFinish.card.question })}
          </button>
        ) : null}

        <NightMeter due={stack.due} />

        {stack.dueWithWait.length > 0 && !stack.holePick && !stack.waitPick ? (
          <div className="di-edge-wrap">
            <EdgeScroll ariaLabel={t('tonight.aria')}>
              {stack.dueWithWait.map((row) => {
                const on =
                  row.answer && (row.answer.status === 'yes' || row.answer.status === 'late')
                const skip = row.answer?.status === 'skip'
                const late = row.answer?.status === 'late'
                const isFace = stack.pillPick
                  ? stack.rowKey(row) === stack.rowKey(stack.pillPick)
                  : Boolean(stack.faceRow) && stack.rowKey(row) === stack.rowKey(stack.faceRow)
                const dueUrgency = !on && !skip ? dueByUrgency(row.lamp, stack.dateIso) : ''
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
                        dueUrgency === 'today' ? 'is-due-today' : '',
                        dueUrgency === 'soon' ? 'is-due-soon' : '',
                        row.optionalDeadline ? 'is-optional' : '',
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
            </EdgeScroll>
          </div>
        ) : null}

        <TagRail boards={stack.shelf} tagId={tagId} onTag={onTag} now={stack.clock} />

        {stack.pillPick || stack.waitPick ? (
          <button className="di-key di-tonight-back" type="button" onClick={() => stack.closePlates()}>
            <span aria-hidden="true">‹</span> {t('tonight.backToStack')}
          </button>
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

        <FamilyTonight />
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
