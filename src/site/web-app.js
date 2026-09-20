/** Web serves /app only when allowed. Native uses Expo, not this entry. */
export function webAppPublic() {
  const flag = String(import.meta.env.VITE_WEB_APP_PUBLIC ?? '').trim().toLowerCase()
  if (import.meta.env.DEV) return flag !== 'false'
  return flag === 'true'
}
