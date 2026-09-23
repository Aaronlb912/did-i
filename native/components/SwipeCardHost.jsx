import { SwipeCard } from './SwipeCard.jsx'
import { SwipeCardStub } from './SwipeCardStub.jsx'
import { Slot } from './Slot.jsx'

export function SwipeCardHost(props) {
  return (
    <Slot fallback={<SwipeCardStub {...props} />}>
      <SwipeCard {...props} />
    </Slot>
  )
}
