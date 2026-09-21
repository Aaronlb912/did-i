import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { SwipeEdges } from './SwipeEdges.jsx'

const SwipePullContext = createContext(null)

export function SwipePullSlot({ children }) {
  const [pull, setPull] = useState(0)
  const report = useCallback((next) => setPull(next), [])

  return (
    <SwipePullContext.Provider value={report}>
      <div className="di-face-slot">
        <SwipeEdges pull={pull} />
        {children}
      </div>
    </SwipePullContext.Provider>
  )
}

export function useSwipePullReport(pull) {
  const report = useContext(SwipePullContext)
  useEffect(() => {
    if (!report) return undefined
    report(pull)
    return () => report(0)
  }, [pull, report])
}
