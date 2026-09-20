import { cloud } from './cloud.js'
import { devicePlatform, readUser } from './account.js'
import { GEM_PACKS, gemPack } from './gem-packs.js'
import { webAppPublic } from '../site/web-app.js'

function stripeLink(packId) {
  const key = `VITE_STRIPE_PACK_${packId}`
  const url = typeof import.meta !== 'undefined' ? import.meta.env?.[key] : ''
  return String(url || '').trim()
}

function webAppUrl() {
  return typeof import.meta !== 'undefined' ? String(import.meta.env?.VITE_WEB_APP_URL || '').trim() : ''
}

export function webGemShopUrl() {
  if (!webAppPublic()) return ''
  const base = webAppUrl()
  if (!base) return ''
  try {
    const url = new URL(base)
    url.pathname = '/app'
    url.hash = '#/gems'
    return url.toString()
  } catch {
    const trimmed = base.replace(/\/$/, '')
    return `${trimmed}/app#/gems`
  }
}

export function webGemShopReady() {
  return Boolean(webGemShopUrl())
}

export function gemCheckoutReady(packId) {
  return Boolean(stripeLink(packId))
}

export function anyGemCheckoutReady() {
  return GEM_PACKS.some((pack) => gemCheckoutReady(pack.id))
}

export async function startGemPurchase(packId) {
  const pack = gemPack(packId)
  if (!pack) return { miss: 'pack' }

  const user = await readUser()
  if (!user) return { miss: 'signin' }

  const link = stripeLink(packId)
  if (!link) {
    const platform = devicePlatform()
    const web = webGemShopUrl()
    if ((platform === 'android' || platform === 'ios') && web) {
      window.open(web, '_blank', 'noopener,noreferrer')
      return { miss: '', web: true }
    }
    if (platform === 'android' || platform === 'ios') {
      return { miss: 'store' }
    }
    return { miss: 'setup' }
  }

  try {
    const url = new URL(link)
    url.searchParams.set('client_reference_id', `${user.id}:${packId}`)
    if (user.email) url.searchParams.set('prefilled_email', user.email)
    window.open(url.toString(), '_blank', 'noopener,noreferrer')
    return { miss: '' }
  } catch {
    return { miss: 'setup' }
  }
}

export async function claimGemPurchases() {
  const db = cloud()
  if (!db) return { gems: 0, miss: 'setup' }
  const user = await readUser()
  if (!user) return { gems: 0, miss: '' }

  const { data, error } = await db.rpc('claim_gem_purchases')
  if (error) {
    if (error.code === 'PGRST202' || /claim_gem_purchases/i.test(error.message || '')) {
      return { gems: 0, miss: 'setup' }
    }
    return { gems: 0, miss: error.message || 'miss' }
  }

  const rows = Array.isArray(data) ? data : []
  const gems = rows.reduce((n, row) => n + Math.max(0, Math.floor(Number(row?.gems) || 0)), 0)
  return { gems, miss: '' }
}
