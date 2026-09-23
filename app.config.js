import 'dotenv/config'

import { existsSync } from 'node:fs'
import { clientEnv } from './env.client.js'

const googleServicesAndroid = './android/app/google-services.json'
const googleServicesIos =
  process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist'
const hasGoogleServicesIos =
  Boolean(process.env.GOOGLE_SERVICES_PLIST) || existsSync(googleServicesIos)

const buildProfile = process.env.EAS_BUILD_PROFILE || ''
const devClientBuild = buildProfile === 'development' || buildProfile === 'preview'
// Widgets on by default. Set EAS_INCLUDE_WIDGETS=0 on a profile to skip the extension.
const includeWidgets = process.env.EAS_INCLUDE_WIDGETS !== '0'

const widgetPlugins = includeWidgets
  ? [
      [
        'expo-widgets',
        {
          bundleIdentifier: 'com.aaronbryant.didi.widgets',
          groupIdentifier: 'group.com.aaronbryant.didi',
          widgets: [
            {
              name: 'DidITonight',
              displayName: 'Did I tonight',
              description: 'Tonight questions for your tag. Tap Did or Did not from the widget.',
              ios: {
                contentMarginsDisabled: true,
                supportedFamilies: [
                  'systemSmall',
                  'systemMedium',
                  'systemLarge',
                  'accessoryCircular',
                  'accessoryRectangular',
                  'accessoryInline',
                ],
              },
            },
          ],
        },
      ],
      [
        'react-native-android-widget',
        {
          widgets: [
            {
              name: 'DidITonight',
              label: 'Did I tonight',
              description: 'Tonight questions for your tag. Settings → Widget.',
              minWidth: '110dp',
              minHeight: '48dp',
              maxResizeWidth: '400dp',
              maxResizeHeight: '280dp',
              targetCellWidth: 4,
              targetCellHeight: 2,
              resizeMode: 'horizontal|vertical',
            },
          ],
        },
      ],
    ]
  : []

export default ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    ...(devClientBuild ? ['expo-dev-client'] : []),
    'expo-apple-authentication',
    [
      'expo-notifications',
      {
        // Widgets do not need this; it registers remote-notification hooks at boot.
        enableBackgroundRemoteNotifications: false,
      },
    ],
    'expo-iap',
    ...widgetPlugins,
    [
      'expo-build-properties',
      {
        android: {
          kotlinVersion: '2.1.20',
          newArchEnabled: true,
        },
        ios: {
          deploymentTarget: '17.0',
          newArchEnabled: true,
        },
      },
    ],
    './plugins/with-ios-pod-bundles.cjs',
  ],
  ios: {
    ...config.ios,
    appleTeamId: '2ZUKFKSSV8',
    usesAppleSignIn: true,
    deploymentTarget: '17.0',
    entitlements: {
      ...(config.ios?.entitlements || {}),
      ...(includeWidgets
        ? { 'com.apple.security.application-groups': ['group.com.aaronbryant.didi'] }
        : {}),
    },
    ...(hasGoogleServicesIos ? { googleServicesFile: googleServicesIos } : {}),
    infoPlist: {
      ...(config.ios?.infoPlist || {}),
      UIBackgroundModes: ['remote-notification'],
      NSMotionUsageDescription: 'Did I uses a shake to undo the last tap.',
    },
  },
  android: {
    ...config.android,
    blockedPermissions: [
      ...(config.android?.blockedPermissions || []),
      'com.google.android.gms.permission.AD_ID',
    ],
    ...(existsSync(googleServicesAndroid) ? { googleServicesFile: googleServicesAndroid } : {}),
  },
  extra: {
    ...config?.extra,
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || clientEnv('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || clientEnv('VITE_SUPABASE_ANON_KEY'),
    VITE_LEGAL_EMAIL: process.env.VITE_LEGAL_EMAIL || clientEnv('VITE_LEGAL_EMAIL'),
    VITE_WEB_APP_URL: process.env.VITE_WEB_APP_URL || clientEnv('VITE_WEB_APP_URL'),
    VITE_DIT_ENABLED: process.env.VITE_DIT_ENABLED || '',
    VITE_REPORT_URL: process.env.VITE_REPORT_URL || '',
    VITE_APPLE_AUTH: process.env.VITE_APPLE_AUTH || clientEnv('VITE_APPLE_AUTH'),
    nativeWidgets: includeWidgets ? '1' : '',
  },
})
