/**
 * Configuración de Jest para Expo + React Native.
 * Los matchers nativos de @testing-library/react-native v12.4+ ya vienen incluidos;
 * no es necesario extender expect manualmente.
 */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@sentry/.*|firebase|@firebase/.*|lucide-react-native))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
  coverageThreshold: {
    'src/utils/': {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
