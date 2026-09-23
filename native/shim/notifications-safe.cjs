const { loadPinned } = require('./pin-module.cjs')
const { call, softModule } = require('./expo-soft.cjs')

function sub() {
  return { remove() {} }
}

function fallback() {
  return softModule({
    setNotificationHandler() {},
    getPermissionsAsync() {
      return Promise.resolve({ status: 'undetermined', granted: false })
    },
    requestPermissionsAsync() {
      return Promise.resolve({ status: 'undetermined', granted: false })
    },
    setNotificationChannelAsync: call,
    addNotificationResponseReceivedListener: sub,
    addPushTokenListener: sub,
    getDevicePushTokenAsync() {
      return Promise.resolve(null)
    },
    getExpoPushTokenAsync() {
      return Promise.resolve(null)
    },
    scheduleNotificationAsync: call,
    cancelAllScheduledNotificationsAsync: call,
    AndroidImportance: { HIGH: 4, DEFAULT: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
  })
}

function isOk(mod) {
  return Boolean(mod && typeof mod.setNotificationHandler === 'function')
}

module.exports = loadPinned(
  () => require('expo-notifications'),
  isOk,
  fallback,
  '__didINotificationsError',
)
