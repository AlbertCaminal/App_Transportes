import type { ExpoConfig } from 'expo/config';

/**
 * Configuración única de Expo (sustituye app.json).
 * Antes de publicar: cambia bundleIdentifier, package y scheme a tu dominio real.
 * @see https://docs.expo.dev/workflow/configuration/
 */
const APP_NAME = 'Barcelona Logistics';
const SLUG = 'barcelona-logistics';

// TODO: sustituir por tu identificador único (dominio invertido). Requerido en Play y App Store.
const IOS_BUNDLE_ID = 'com.barcelonalogistics.app';
const ANDROID_PACKAGE = 'com.barcelonalogistics.app';

export default (): ExpoConfig => {
  const easProjectId = process.env.EAS_PROJECT_ID;

  return {
    name: APP_NAME,
    slug: SLUG,
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    scheme: SLUG,
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0B0E14',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IOS_BUNDLE_ID,
      buildNumber: '1',
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: ANDROID_PACKAGE,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0B0E14',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: ['expo-web-browser'],
    ...(easProjectId
      ? {
          extra: {
            eas: {
              projectId: easProjectId,
            },
          },
        }
      : {}),
    ...(process.env.EXPO_ACCOUNT_SLUG ? { owner: process.env.EXPO_ACCOUNT_SLUG } : {}),
  };
};
