const { loadPinned } = require('./pin-module.cjs')

function fallback() {
  const Accelerometer = {
    isAvailableAsync() {
      return Promise.resolve(false)
    },
    setUpdateInterval() {},
    addListener() {
      return { remove() {} }
    },
  }
  return {
    __esModule: true,
    Accelerometer,
    Gyroscope: Accelerometer,
    Magnetometer: Accelerometer,
  }
}

function isOk(mod) {
  try {
    const sensor = mod && mod.Accelerometer
    return Boolean(sensor && typeof sensor.addListener === 'function' && typeof sensor.isAvailableAsync === 'function')
  } catch {
    return false
  }
}

module.exports = loadPinned(() => require('expo-sensors'), isOk, fallback, '__didISensorsError')
