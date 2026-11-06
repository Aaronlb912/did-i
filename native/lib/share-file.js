const OLD_FILES = /^did-i-(backup|answers)-/

// A share only counts as a copy when a file went out or the text share said so.
// iOS cannot tell a cancelled file share from a finished one, so a file counts.
export function copyWent(res) {
  return res?.action === 'file' || res?.action === 'sharedAction'
}

// Writes text to a cache file and opens the share sheet on it. False when no
// file could be made or shared, so the caller can share the text instead.
export async function shareTextFile({ fs, sharing, name, text, mimeType, UTI }) {
  if (typeof fs?.File !== 'function' || !fs.Paths || typeof sharing?.shareAsync !== 'function') return false
  if (!(await sharing.isAvailableAsync())) return false
  let uri = ''
  try {
    // Earlier copies hold the same data and would pile up in the cache.
    for (const old of fs.Paths.cache.list?.() || []) {
      if (OLD_FILES.test(old.name || '')) {
        try { old.delete() } catch {}
      }
    }
    const file = new fs.File(fs.Paths.cache, name)
    if (file.exists) file.delete()
    file.create()
    file.write(text)
    uri = file.uri
  } catch {
    return false
  }
  try {
    await sharing.shareAsync(uri, { mimeType, dialogTitle: 'Did I', UTI })
  } catch {
    return false
  }
  return true
}
