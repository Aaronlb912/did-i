export const HOME_NAV = ['/', '/home', '/tonight', '/later']
export const QUESTIONS_NAV = ['/lamps']

export function showBottomNav(path) {
  return HOME_NAV.includes(path) || QUESTIONS_NAV.includes(path)
}

export function showMainNavInMenu(path) {
  return !showBottomNav(path)
}
