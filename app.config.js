import 'dotenv/config'

import { existsSync } from 'node:fs'
import { clientEnv } from './env.client.js'

const googleServices = './android/app/google-services.json'

export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    'expo-dev-client',
    'expo-notifications',
    'expo-iap',
    [
      'expo-build-properties',
      {
        android: {
          kotlinVersion: '2.1.20',
        },
        ios: {
          deploymentTarget: '16.4',
        },
      },
    ],
  ],
  ios: {
    ...config.ios,
    deploymentTarget: '16.4',
  },
  android: {
    ...config.android,
    blockedPermissions: [
      ...(config.android?.blockedPermissions || []),
      'com.google.android.gms.permission.AD_ID',
    ],
    ...(existsSync(googleServices) ? { googleServicesFile: googleServices } : {}),
  },
  extra: {
    ...config?.extra,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || clientEnv('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || clientEnv('VITE_SUPABASE_ANON_KEY'),
    VITE_LEGAL_EMAIL: process.env.VITE_LEGAL_EMAIL || clientEnv('VITE_LEGAL_EMAIL'),
    VITE_WEB_APP_URL: process.env.VITE_WEB_APP_URL || clientEnv('VITE_WEB_APP_URL'),
    VITE_DIT_ENABLED: process.env.VITE_DIT_ENABLED || '',
    VITE_REPORT_URL: process.env.VITE_REPORT_URL || '',
  },
})
