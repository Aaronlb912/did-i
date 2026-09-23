export function kitTabDefault(tab, purse) {
  if (tab === 'looks') return purse?.lookOn
  if (tab === 'cheers') return purse?.cheerOn || 'off'
  return purse?.buddyOn || 'off'
}
