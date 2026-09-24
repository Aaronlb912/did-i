/** Load react-native-svg on first draw. A `.default` throw becomes no icon. */
let cached

export function svgParts() {
  if (cached !== undefined) return cached
  try {
    const mod = require('react-native-svg')
    if (mod && mod.__didISvgFallback) {
      cached = null
      return null
    }
    const Svg = mod && (mod.default || mod.Svg)
    const Path = mod && mod.Path
    const Circle = mod && mod.Circle
    const Ellipse = mod && mod.Ellipse
    const Line = mod && mod.Line
    const Polygon = mod && mod.Polygon
    if (!Svg || !Path || !Circle || !Ellipse || !Line || !Polygon) {
      cached = null
      return null
    }
    cached = { Svg, Path, Circle, Ellipse, Line, Polygon }
    return cached
  } catch (error) {
    global.__didISvgError = String((error && error.message) || error)
    cached = null
    return null
  }
}

let gradientCached

/** Gradient pieces for scrims. Null when the svg fallback is in play. */
export function svgGradient() {
  if (gradientCached !== undefined) return gradientCached
  try {
    const mod = require('react-native-svg')
    const Svg = mod && !mod.__didISvgFallback && (mod.default || mod.Svg)
    const { Defs, LinearGradient, Stop, Rect } = mod || {}
    gradientCached = Svg && Defs && LinearGradient && Stop && Rect ? { Svg, Defs, LinearGradient, Stop, Rect } : null
  } catch (error) {
    global.__didISvgError = String((error && error.message) || error)
    gradientCached = null
  }
  return gradientCached
}
