const PROPS_KEY = 'did-i-widget-tonight-props'

export function readWidgetTonightProps() {
  try {
    const raw = localStorage.getItem(PROPS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeWidgetTonightProps(props) {
  try {
    localStorage.setItem(PROPS_KEY, JSON.stringify(props))
  } catch {
    // ok
  }
}
