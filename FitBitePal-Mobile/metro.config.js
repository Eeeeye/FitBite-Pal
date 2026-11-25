const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Expo inlines this public value when transforming JS. A different deployment needs a different transform cache.
config.cacheVersion += ':' + (process.env.EXPO_PUBLIC_API_URL || 'page-origin');
const cameraWeb = path.join(path.dirname(require.resolve('expo-camera/package.json')), 'build', 'ExpoCamera.web.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // FitBite uses the preview and photo APIs. Expo Camera 17 also starts a remote QR worker on import.
  if (platform === 'web' && context.originModulePath === cameraWeb && moduleName === './web/useWebQRScanner') {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'src', 'utils', 'webCameraScanner.js') };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
