import { usePop } from './pop.js'
import { PurseBits } from './PurseIcons.jsx'

// Coins and gems lift when you earn and dip when you spend.
export function PurseLine({ purse, className, gemsLink = false }) {
  const pop = usePop((purse?.coins || 0) + (purse?.gems || 0))
  const root = pop ? `${className} ${pop}` : className
  return (
    <p className={root}>
      <PurseBits purse={purse} gemsLink={gemsLink} />
    </p>
  )
}
