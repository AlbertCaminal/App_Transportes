/**
 * Setup global de tests. Silencia warnings de Reanimated en entornos sin UI
 * y expone `__DEV__` como true por si algún código lo usa.
 */
// @ts-expect-error global de RN
globalThis.__DEV__ = true;

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('./src/services/firestore/userSession', () => ({
  persistUserSessionFields: jest.fn(() => Promise.resolve()),
  fetchUserSession: jest.fn(() => Promise.resolve(null)),
  parseUserSessionFields: jest.fn(() => ({})),
}));
