/** The swipe card stays one accessible element; a screen reader reaches Did/Nope through actions, not separate buttons. */
export function swipeCardAccessibilityLabel(kicker, title, meta) {
  return [kicker, title, meta].filter(Boolean).join(', ')
}

export function swipeCardAccessibilityActions(stampDid, stampNope) {
  return [
    { name: 'did', label: stampDid },
    { name: 'nope', label: stampNope },
  ]
}

export function handleSwipeCardAccessibilityAction(actionName, { blockDid, blockNope, onDid, onNope }) {
  if (actionName === 'did' && !blockDid) onDid?.()
  else if (actionName === 'nope' && !blockNope) onNope?.()
}
