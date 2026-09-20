const { dependencies, devDependencies } = require('./package.json');

const capacitorPackages = Object.keys({ ...dependencies, ...devDependencies }).filter((name) =>
  name.startsWith('@capacitor/')
);

module.exports = {
  dependencies: Object.fromEntries(
    capacitorPackages.map((name) => [name, { platforms: { ios: null, android: null } }])
  ),
};
