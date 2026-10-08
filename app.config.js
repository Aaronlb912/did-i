import 'dotenv/config'

import { existsSync } from 'node:fs'
import { clientEnv } from './env.client.js'

const googleServicesAndroid = './android/app/google-services.json'
const googleServicesIos =
  process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist'
const hasGoogleServicesIos =
  Boolean(process.env.GOOGLE_SERVICES_PLIST) || existsSync(googleServicesIos)

// Reversed iOS OAuth client ID, e.g. com.googleusercontent.apps.123-abc.
const googleIosClientId = process.env.VITE_GOOGLE_IOS_CLIENT_ID || clientEnv('VITE_GOOGLE_IOS_CLIENT_ID')
const googleIosUrlScheme = googleIosClientId
  ? 'com.googleusercontent.apps.' + googleIosClientId.replace(/\.apps\.googleusercontent\.com$/, '')
  : ''

const buildProfile = process.env.EAS_BUILD_PROFILE || ''
// DIDI_DEV=1: a separate "Did I Dev" app (its own bundle id) that sits next to
// the store app and loads code from npm run expo:dev. No widgets, Apple sign-in
// or Firebase there; those are tied to the store bundle id.
const devApp = process.env.DIDI_DEV === '1'
const devClientBuild = devApp || buildProfile === 'development' || buildProfile === 'preview'
// Widgets on by default. Set EAS_INCLUDE_WIDGETS=0 on a profile to skip the extension.
const includeWidgets = !devApp && process.env.EAS_INCLUDE_WIDGETS !== '0'

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
            {
              name: 'DidITogether',
              displayName: 'Did I together',
              description: 'Your friends and family, and who is done tonight.',
              ios: {
                contentMarginsDisabled: true,
                supportedFamilies: ['systemSmall', 'systemMedium', 'systemLarge'],
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
              minHeight: '110dp',
              maxResizeWidth: '400dp',
              maxResizeHeight: '280dp',
              targetCellWidth: 4,
              targetCellHeight: 2,
              resizeMode: 'horizontal|vertical',
            },
            {
              name: 'DidITogether',
              label: 'Did I together',
              description: 'Your friends and family, and who is done tonight.',
              minWidth: '110dp',
              minHeight: '110dp',
              maxResizeWidth: '400dp',
              maxResizeHeight: '400dp',
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
  ...(devApp ? { scheme: 'didi-dev' } : {}),
  // Over-the-air JS updates. The runtime is the app version, not a fingerprint:
  // updates are published from Windows and built on Linux / macOS runners, and
  // a fingerprint can hash differently across those machines, so updates would
  // never match a build. A plain string, because android/ is committed and Expo
  // refuses runtime policies there. Bump "version" in app.json whenever native
  // code changes. The same values are written by hand in
  // android/app/src/main/AndroidManifest.xml and res/values/strings.xml.
  runtimeVersion: config.version,
  updates: {
    url: 'https://u.expo.dev/030275bb-f42d-47fd-9f6c-4d3c6a76ecc8',
    // GitHub builds are not EAS builds, so nothing else sets the channel.
    // EAS builds replace this with the channel from eas.json.
    requestHeaders: { 'expo-channel-name': 'production' },
  },
  plugins: [
    ...(config.plugins || []),
    ...(devClientBuild ? ['expo-dev-client'] : []),
    ...(devApp ? [] : ['expo-apple-authentication']),
    // iOS needs the reversed iOS client ID as a URL scheme; skipped until it exists.
    ...(googleIosUrlScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }]]
      : []),
    [
      'expo-notifications',
      {
        // Widgets do not need this; it registers remote-notification hooks at boot.
        enableBackgroundRemoteNotifications: false,
      },
    ],
    // Profile pictures from the library or the camera. No mic.
    [
      'expo-image-picker',
      {
        photosPermission: 'Did I uses a photo you pick as your profile picture.',
        cameraPermission: 'Did I uses the camera to take your profile picture and to scan friend and family codes.',
        microphonePermission: false,
      },
    ],
    // Scans friend and family QR codes. No mic, no video.
    [
      'expo-camera',
      {
        cameraPermission: 'Did I uses the camera to take your profile picture and to scan friend and family codes.',
        microphonePermission: false,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
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
          // Xcode 27 will not launch an app that still creates its window in the app delegate.
          enableSceneSupport: true,
        },
      },
    ],
    './plugins/with-ios-pod-bundles.cjs',
    './plugins/with-siri-add.cjs',
  ],
  ios: {
    ...config.ios,
    ...(devApp ? { bundleIdentifier: 'com.aaronbryant.didi.dev' } : {}),
    appleTeamId: '2ZUKFKSSV8',
    usesAppleSignIn: !devApp,
    deploymentTarget: '17.0',
    entitlements: {
      ...(config.ios?.entitlements || {}),
      ...(includeWidgets
        ? { 'com.apple.security.application-groups': ['group.com.aaronbryant.didi'] }
        : {}),
      // did-i.app/f, /j and /i links open the app (public/.well-known). Off
      // until the App ID has Associated Domains, or signing fails.
      ...(process.env.DIDI_UNIVERSAL_LINKS === '1' && !devApp
        ? { 'com.apple.developer.associated-domains': ['applinks:did-i.app'] }
        : {}),
    },
    ...(hasGoogleServicesIos && !devApp ? { googleServicesFile: googleServicesIos } : {}),
    // Apple's required-reason APIs used by React Native, Expo and MMKV. No tracking.
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp', NSPrivacyAccessedAPITypeReasons: ['C617.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime', NSPrivacyAccessedAPITypeReasons: ['35F9.1'] },
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace', NSPrivacyAccessedAPITypeReasons: ['E174.1'] },
      ],
    },
    infoPlist: {
      ...(config.ios?.infoPlist || {}),
      UIBackgroundModes: ['remote-notification'],
      ...(devApp ? { CFBundleDisplayName: 'Did I Dev' } : {}),
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
    VITE_REPORT_URL: process.env.VITE_REPORT_URL || '',
    VITE_APPLE_AUTH: process.env.VITE_APPLE_AUTH || clientEnv('VITE_APPLE_AUTH'),
    VITE_GOOGLE_AUTH: process.env.VITE_GOOGLE_AUTH || clientEnv('VITE_GOOGLE_AUTH'),
    VITE_GOOGLE_WEB_CLIENT_ID: process.env.VITE_GOOGLE_WEB_CLIENT_ID || clientEnv('VITE_GOOGLE_WEB_CLIENT_ID'),
    VITE_GOOGLE_IOS_CLIENT_ID: process.env.VITE_GOOGLE_IOS_CLIENT_ID || clientEnv('VITE_GOOGLE_IOS_CLIENT_ID'),
    nativeWidgets: includeWidgets ? '1' : '',
  },
})
