import { SwipeBackPassthrough } from './SwipeBackPassthrough.jsx'
import { SwipeBackShell } from './SwipeBackShell.jsx'
import { Slot } from './Slot.jsx'

export function SwipeBackShellHost(props) {
  return (
    <Slot fallback={<SwipeBackPassthrough {...props} />}>
      <SwipeBackShell {...props} />
    </Slot>
  )
}
