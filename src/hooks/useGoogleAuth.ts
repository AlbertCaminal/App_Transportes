import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import { getRedirectUrl, makeRedirectUri, type AuthSessionRedirectUriOptions } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { AuthUser } from '../../shared/types';
import { signInWithGoogleIdToken } from '../services/firebase/auth';

// Cierra el browser modal automáticamente cuando vuelve el redirect (iOS/Android/Web).
WebBrowser.maybeCompleteAuthSession();

function trimEnv(v: string | undefined): string {
  return (v ?? '').trim();
}

/** Expo Go (Store Client): OAuth debe usar redirect HTTPS en auth.expo.io, no exp://… (Google lo rechaza). */
function isExpoGoStoreClient(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/**
 * URL exacta que debe estar en Google Cloud → cliente OAuth **Web** → URIs de redireccionamiento.
 * Coincide con lo que construye `getRedirectUrl()` cuando `originalFullName` existe (p. ej. tras `npx expo login`).
 */
function resolveExpoProxyRedirectUri(): string {
  const fromEnv = trimEnv(process.env.EXPO_PUBLIC_EXPO_AUTH_PROXY_REDIRECT_URI);
  if (fromEnv) return fromEnv;
  try {
    return getRedirectUrl();
  } catch {
    const fullName = Constants.expoConfig?.originalFullName;
    if (typeof fullName === 'string' && fullName.startsWith('@')) {
      return `https://auth.expo.io/${fullName}`;
    }
    const slug =
      typeof Constants.expoConfig?.slug === 'string' ? Constants.expoConfig.slug : 'barcelona-logistics';
    const owner =
      trimEnv(process.env.EXPO_ACCOUNT_SLUG) || trimEnv(process.env.EXPO_PUBLIC_EXPO_ACCOUNT_SLUG);
    if (owner) {
      return `https://auth.expo.io/@${owner}/${slug}`;
    }
    throw new Error(
      'Expo Go: falta la URL del proxy OAuth. Ejecuta `npx expo login`, o define EXPO_PUBLIC_EXPO_AUTH_PROXY_REDIRECT_URI ' +
        '(p. ej. https://auth.expo.io/@tuUsuario/barcelona-logistics), o EXPO_PUBLIC_EXPO_ACCOUNT_SLUG.'
    );
  }
}

/**
 * `Google.useIdTokenAuthRequest` lanza en tiempo de montaje si falta `webClientId`
 * en **web**. En nativo puede bastar ios/android/expo.
 * Si montamos el hook sin cumplir esto, Error Boundary captura y rompe toda la pantalla Login.
 */
/**
 * expo-auth-session elige el client id por plataforma (`Google.js`: ios → iosClientId,
 * android → androidClientId, web → webClientId). En iOS/Android también admite `clientId`
 * (Expo / cliente genérico). Solo tener **webClientId** en `.env` no basta en iPhone:
 * hay que definir `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` o `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID`.
 */
export function shouldMountGoogleIdTokenRequest(): boolean {
  const web = trimEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const ios = trimEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const android = trimEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  const expo = trimEnv(process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID);

  if (Platform.OS === 'web') {
    return Boolean(web);
  }

  // En Expo Go hace falta WEB + una URL https://auth.expo.io/… resoluble (login en Expo o EXPO_PUBLIC_*).
  if (isExpoGoStoreClient()) {
    if (!web) return false;
    try {
      resolveExpoProxyRedirectUri();
      return true;
    } catch {
      return false;
    }
  }

  switch (Platform.OS) {
    case 'ios':
      return Boolean(ios || expo);
    case 'android':
      return Boolean(android || expo);
    default:
      return Boolean(web || ios || android || expo);
  }
}

/** Estado estable cuando no montamos el proveedor OAuth (sin Client IDs válidos). */
export const GOOGLE_AUTH_STUB: GoogleAuthState = {
  loading: false,
  error: null,
  configured: false,
  signIn: async () => null,
};

export interface GoogleAuthState {
  loading: boolean;
  error: string | null;
  configured: boolean;
  signIn: () => Promise<AuthUser | null>;
}

/**
 * Solo debe llamarse si `shouldMountGoogleIdTokenRequest()` es `true` (p. ej. dentro
 * de un subcomponente que solo se monta en ese caso). No uses esto directamente en
 * `Login` sin comprobarlo antes: violaría las reglas de hooks si condicionaras la llamada.
 */
export function useGoogleAuthImpl(): GoogleAuthState {
  const webClientId = trimEnv(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  const iosClientId = trimEnv(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  const androidClientId = trimEnv(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  const expoClientId = trimEnv(process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID);

  const configured = Boolean(webClientId || iosClientId || androidClientId || expoClientId);

  /** Debe coincidir con `scheme` en app.config.ts (deep links + OAuth redirect). */
  const scheme =
    typeof Constants.expoConfig?.scheme === 'string' ? Constants.expoConfig.scheme : 'barcelona-logistics';

  /**
   * Segundo argumento de `useIdTokenAuthRequest` → mismo criterio que `makeRedirectUri`.
   * En **web**, ruta vacía: el redirect queda `http://localhost:PUERTO` (origen). Si añadimos
   * `path: 'oauthredirect'`, Google recibe `http://localhost:8081/oauthredirect` y **debe** estar
   * registrada exacto en la consola; muchas guías solo añaden el origen → redirect_uri_mismatch.
   */
  const redirectUriOptions: Partial<AuthSessionRedirectUriOptions> = useMemo(
    () => ({
      scheme,
      path: Platform.OS === 'web' ? '' : 'oauthredirect',
      ...(Platform.OS === 'web' ? { preferLocalhost: true } : {}),
    }),
    [scheme]
  );

  const googleRequestConfig = useMemo(() => {
    const web = webClientId || undefined;
    const ios = iosClientId || undefined;
    const android = androidClientId || undefined;
    const expo = expoClientId || undefined;

    /** Fuerza el selector de cuentas de Google (evita reutilizar siempre la misma sesión del navegador). */
    const selectAccount = true;

    if (Platform.OS === 'web') {
      return {
        selectAccount,
        webClientId: web,
      };
    }

    if (isExpoGoStoreClient()) {
      if (!web) {
        return { selectAccount, webClientId: web };
      }
      // Cliente Web: redirect https://auth.expo.io/… está en el cliente "Web" de Google Cloud.
      return {
        selectAccount,
        redirectUri: resolveExpoProxyRedirectUri(),
        clientId: web,
        webClientId: web,
      };
    }

    return {
      selectAccount,
      clientId: expo,
      iosClientId: ios,
      androidClientId: android,
      webClientId: web,
    };
  }, [androidClientId, expoClientId, iosClientId, webClientId]);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    googleRequestConfig,
    redirectUriOptions
  );

  useEffect(() => {
    if (!__DEV__) return;
    try {
      const computed =
        isExpoGoStoreClient() && Platform.OS !== 'web'
          ? resolveExpoProxyRedirectUri()
          : makeRedirectUri(redirectUriOptions);
      console.warn(
        '[Google OAuth] URI de redirección que usa esta build (añádela tal cual en Google Cloud → Credenciales → cliente Web):\n',
        computed
      );
      console.warn(
        '[Google OAuth] Orígenes JS habituales si falta redirect_uri_mismatch en web: http://localhost:8081  https://auth.expo.io'
      );
    } catch {
      /* noop */
    }
  }, [redirectUriOptions]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params['id_token'];
    if (!idToken) {
      setError('No se recibió id_token del proveedor.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await signInWithGoogleIdToken(idToken, response.authentication?.accessToken);
        if (!cancelled) {
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(extractMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [response]);

  const signIn = useCallback(async (): Promise<AuthUser | null> => {
    if (!configured) {
      setError('Google Sign-In no está configurado (faltan EXPO_PUBLIC_GOOGLE_*_CLIENT_ID).');
      return null;
    }
    if (!request) {
      setError('Solicitud de autenticación no inicializada todavía.');
      return null;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        setLoading(false);
      }
    } catch (err) {
      setError(extractMessage(err));
      setLoading(false);
    }
    return null;
  }, [configured, request, promptAsync]);

  return { loading, error, configured, signIn };
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Error desconocido al iniciar sesión.';
}
