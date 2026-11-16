const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',

	  // nativewind v5 used rem=14 on native; keep the same scale after the uniwind migration
  polyfills: { rem: 14 },
});
