// Someone else's Did we, family or Did you answer changed (supabase/social-live.sql).
// The broadcast says only which kind; listeners read again through the same
// functions they use on focus, so nothing new is shown and nothing is paid.
const subs = new Set()
let timer = 0
let kinds = new Set()

export function onSocialLive(fn) {
  subs.add(fn)
  return () => subs.delete(fn)
}

// A batch of answers is one read, not one per row.
export function noteSocialLive(kind) {
  kinds.add(String(kind || ''))
  if (timer) return
  timer = setTimeout(() => {
    timer = 0
    const seen = kinds
    kinds = new Set()
    for (const fn of [...subs]) {
      try {
        fn(seen)
      } catch {
        // One screen failing to read does not stop the rest.
      }
    }
  }, 150)
}
