import { devicePlatform } from './account.js'
import { cloud } from './cloud.js'
import { gemPackByStoreId } from './gem-packs.js'

export async function submitGemPurchase(purchase) {
  const db = cloud()
  if (!db) return { miss: 'setup' }

  const platform = devicePlatform()
  const productId = String(purchase?.productId || purchase?.id || '')
  const pack = gemPackByStoreId(productId)
  if (!pack) return { miss: 'pack' }

  const transactionId = String(
    purchase?.transactionId || purchase?.orderId || purchase?.purchaseToken || '',
  )
  const purchaseToken = String(purchase?.purchaseToken || purchase?.transactionReceipt || '')
  if (!transactionId && !purchaseToken) return { miss: 'receipt' }

  const { data, error } = await db.functions.invoke('gem-iap', {
    body: {
      platform,
      productId,
      packId: pack.id,
      transactionId,
      purchaseToken,
    },
  })

  if (error) {
    const msg = String(error.message || '')
    if (/not configured|setup/i.test(msg)) return { miss: 'setup' }
    return { miss: msg || 'miss' }
  }

  if (data?.miss) return { miss: String(data.miss) }
  if (!data?.ok) return { miss: 'miss' }
  return { miss: '', gems: Number(data.gems) || pack.gems }
}
