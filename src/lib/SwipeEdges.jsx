import { edgeOpacity } from './swipe-face.js'
import { t } from './i18n.js'
import { useReduceMotion } from './useReduceMotion.js'

export function SwipeEdges({ pull = 0, didLabel, nopeLabel }) {
  const reduce = useReduceMotion()
  if (reduce || Math.abs(pull) < 0.06) return null

  const did = edgeOpacity(pull, 'did')
  const nope = edgeOpacity(pull, 'nope')
  if (did <= 0 && nope <= 0) return null

  const didText = didLabel || t('tonight.swipeDid')
  const nopeText = nopeLabel || t('tonight.swipeNope')

  return (
    <div className="di-swipe-edges" aria-hidden="true">
      <div
        className="di-swipe-edge is-did"
        style={{
          opacity: did,
          transform: `scaleX(${0.4 + did * 0.85})`,
        }}
      >
        <span className="di-swipe-edge-label">{didText}</span>
      </div>
      <div
        className="di-swipe-edge is-nope"
        style={{
          opacity: nope,
          transform: `scaleX(${0.4 + nope * 0.85})`,
        }}
      >
        <span className="di-swipe-edge-label">{nopeText}</span>
      </div>
    </div>
  )
}
