import { AppNav } from './AppNav.jsx'
import { AppNavPassthrough } from './AppNavPassthrough.jsx'
import { Slot } from './Slot.jsx'

export function AppNavHost(props) {
  return (
    <Slot fallback={<AppNavPassthrough {...props} />}>
      <AppNav {...props} />
    </Slot>
  )
}
