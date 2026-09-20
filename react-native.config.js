const capacitorPackages = [
  '@capacitor/android',
  '@capacitor/app',
  '@capacitor/cli',
  '@capacitor/core',
  '@capacitor/haptics',
  '@capacitor/local-notifications',
  '@capacitor/share',
  '@capacitor/splash-screen',
  '@capacitor/status-bar',
];

module.exports = {
  dependencies: Object.fromEntries(
    capacitorPackages.map((name) => [name, { platforms: { ios: null, android: null } }])
  ),
};
