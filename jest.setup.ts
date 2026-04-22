/**
 * Setup global de tests. Silencia warnings de Reanimated en entornos sin UI
 * y expone `__DEV__` como true por si algún código lo usa.
 */
// @ts-expect-error global de RN
globalThis.__DEV__ = true;
