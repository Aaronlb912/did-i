import { env } from './env.js'

// Did I tonight (public wall, DIT tab). Off in the main app for now.
export const DIT_ENABLED = env('VITE_DIT_ENABLED') === 'true'
