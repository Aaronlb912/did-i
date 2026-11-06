// Web stub. Native uses native/iap/gem-store.js via Metro.

export function iapPossible() {
  return false
}

export function iapReady() {
  return false
}

export function clearApproval() {}

export function gemApprovalWaiting() {
  return false
}

export function onGemMiss(_fn) {
  return () => {}
}

export async function initGemIap() {
  return 'web'
}

export function storePrice(_packId) {
  return ''
}

export async function buyGemPack(_packId) {
  return { miss: 'app' }
}

export async function restoreGemPurchases() {
  return { gems: 0, miss: 'app' }
}
