/**
 * Envoltorio opcional sobre @sentry/react-native.
 *
 * - Si no hay `EXPO_PUBLIC_SENTRY_DSN`, queda deshabilitado y todas las llamadas son no-op.
 * - Evita un fallo si el módulo no está disponible (runtime RN web/CI).
 * - `initSentry()` se llama una sola vez al arrancar la app.
 * - `captureException(err, extras)` lo usa `AppErrorBoundary` y cualquier código
 *   que quiera reportar errores no fatales.
 */

type AnyRecord = Record<string, unknown>;

interface SentryModule {
  init: (opts: {
    dsn: string;
    enableInExpoDevelopment?: boolean;
    debug?: boolean;
    tracesSampleRate?: number;
  }) => void;
  captureException: (err: unknown, scope?: { extra?: AnyRecord; tags?: AnyRecord }) => void;
  wrap: <T>(component: T) => T;
}

let sentry: SentryModule | null = null;
let initialized = false;

function loadSentry(): SentryModule | null {
  if (sentry) return sentry;
  try {
    // Dynamic import oculto detrás de require para evitar crash en entornos
    // donde @sentry/react-native no esté disponible (web SSR, tests).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sentry = require('@sentry/react-native') as SentryModule;
    return sentry;
  } catch {
    return null;
  }
}

export function getSentryDsn(): string | undefined {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  return dsn && dsn.trim().length > 0 ? dsn : undefined;
}

export function isSentryEnabled(): boolean {
  return Boolean(getSentryDsn());
}

export function initSentry(): void {
  if (initialized) return;
  const dsn = getSentryDsn();
  if (!dsn) return;

  const mod = loadSentry();
  if (!mod) return;

  try {
    mod.init({
      dsn,
      enableInExpoDevelopment: false,
      debug: Boolean(__DEV__),
      tracesSampleRate: 0.2,
    });
    initialized = true;
  } catch (e) {
    if (__DEV__) console.warn('[sentry] init failed', e);
  }
}

export function captureException(err: unknown, extra?: AnyRecord): void {
  if (!isSentryEnabled()) return;
  const mod = loadSentry();
  if (!mod) return;
  try {
    mod.captureException(err, extra ? { extra } : undefined);
  } catch (e) {
    if (__DEV__) console.warn('[sentry] capture failed', e);
  }
}

/**
 * Envuelve el componente raíz. Si Sentry no está configurado, devuelve el componente tal cual.
 */
export function wrapRootComponent<T>(component: T): T {
  if (!isSentryEnabled()) return component;
  const mod = loadSentry();
  if (!mod) return component;
  try {
    return mod.wrap(component);
  } catch {
    return component;
  }
}
