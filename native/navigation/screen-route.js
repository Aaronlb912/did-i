import { createContext, useContext } from 'react'
import { readRoute } from './hash.js'

/** The route of the screen a component sits on. The stack keeps several screens mounted. */
export const ScreenRoute = createContext(null)

export function useScreenRoute() {
  return useContext(ScreenRoute) || readRoute()
}
