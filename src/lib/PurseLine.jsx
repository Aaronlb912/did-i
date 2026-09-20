import { usePop } from './pop.js'

// Coins and gems lift when you earn and dip when you spend.
export function PurseLine({ purse, className, children }) {
  const pop = usePop((purse?.coins || 0) + (purse?.gems || 0))
  return <p className={pop ? `${className} ${pop}` : className}>{children}</p>
}
