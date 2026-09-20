import { cloud } from './cloud.js'
import { readUser } from './account.js'

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
