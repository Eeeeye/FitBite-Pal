const { apiEndpoint } = require('./services/apiOrigin');

module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  if ((profile && profile !== 'development') || process.env.FITBITE_PUBLIC_RELEASE === '1') {
    const endpoint = process.env.EXPO_PUBLIC_API_URL;
    if (!endpoint) throw new Error('Set EXPO_PUBLIC_API_URL to the deployment HTTPS API.');
    apiEndpoint(endpoint);
  }
  const localBuild = profile === 'development';
  return {
    ...config,
    plugins: config.plugins.map(plugin => {
      if (Array.isArray(plugin) && plugin[0] === 'expo-build-properties') {
        return [plugin[0], { ...plugin[1], android: { ...plugin[1].android, usesCleartextTraffic: localBuild } }];
      }
      return plugin;
    }),
  };
};
