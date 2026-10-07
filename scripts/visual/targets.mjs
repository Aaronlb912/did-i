/** Pairs of web/native fixture ids. maxDiffRatio is allowed mismatched pixel share. */
export const VISUAL_TARGETS = [
  { id: 'jewel', web: '#web-jewel', native: '#native-jewel', maxDiffRatio: 0.1 },
  { id: 'face', web: '#web-face', native: '#native-face', maxDiffRatio: 0.36 },
  { id: 'hole', web: '#web-hole', native: '#native-hole', maxDiffRatio: 0.4 },
  // The phone's waiting card has no Open question / Back buttons (owner call, PR #210); the web one still does.
  { id: 'wait', web: '#web-wait', native: '#native-wait', maxDiffRatio: 0.34 },
  { id: 'settings', web: '#web-settings', native: '#native-settings', maxDiffRatio: 0.38 },
]

export const VISUAL_PORT = 48743
export const VISUAL_URL = `http://127.0.0.1:${VISUAL_PORT}/visual.html`
