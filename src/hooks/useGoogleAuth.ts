import { useCallback, useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import type { AuthUser } from '../../shared/types';
import { signInWithGoogleIdToken } from '../services/firebase/auth';

// Cierra el browser modal automáticamente cuando vuelve el redirect (iOS/Android/Web).
// Idempotente: se puede llamar múltiples veces sin efectos secundarios.
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthState {
  /** `true` cuando estamos esperando respuesta del proveedor o intercambiando token. */
  loading: boolean;
  /** Último error legible. `null` mientras no haya errores. */
  error: string | null;
  /** Indica si hay credenciales OAuth configuradas en el entorno. */
  configured: boolean;
  /** Lanza el flujo de Google Sign-In. */
  signIn: () => Promise<AuthUser | null>;
}

/**
 * Hook que abstrae el flujo OAuth de Google y lo enlaza con Firebase Auth.
 *
 * Uso:
 *   const { signIn, loading, error, configured } = useGoogleAuth();
 *   <Button disabled={!configured || loading} onPress={signIn} />
 *
 * Nota: requiere un Client ID OAuth por plataforma (Web / iOS / Android, opcionalmente Expo).
 * Sin variables, `configured = false` y `signIn` rechaza con mensaje explícito.
 */
export function useGoogleAuth(): GoogleAuthState {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  const expoClientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;

  const configured = Boolean(webClientId || iosClientId || androidClientId || expoClientId);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: expoClientId,
    iosClientId,
    androidClientId,
    webClientId,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cuando llega un id_token válido del flujo OAuth, lo intercambiamos por sesión Firebase.
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
        // El usuario canceló o el proveedor devolvió error: el `useEffect` no actuará.
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
