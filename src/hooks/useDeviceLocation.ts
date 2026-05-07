import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type LocationStatus = 'idle' | 'pending' | 'granted' | 'denied' | 'unavailable';

export interface DeviceLocationState {
  status: LocationStatus;
  position: [number, number] | null;
  /** Mensaje detallado en caso de fallo (no localizado, sólo diagnóstico). */
  errorReason: string | null;
}

export interface DeviceLocationApi extends DeviceLocationState {
  /** Solicita permiso (si hace falta) y obtiene posición actual. */
  request: () => Promise<void>;
  /** Reinicia el estado a `idle` sin tocar permisos del SO. */
  reset: () => void;
}

const DEFAULT_OPTIONS = {
  enableHighAccuracy: false,
  /** Tolerancia de antigüedad para resultados ya conocidos (2 min). */
  maximumAge: 120_000,
  timeout: 15_000,
} as const;

async function requestWeb(): Promise<{
  position: [number, number] | null;
  status: LocationStatus;
  errorReason: string | null;
}> {
  const nav =
    typeof globalThis !== 'undefined'
      ? (globalThis as { navigator?: { geolocation?: Geolocation } }).navigator
      : undefined;
  if (!nav?.geolocation) {
    return { position: null, status: 'unavailable', errorReason: 'geolocation_unavailable' };
  }
  return new Promise((resolve) => {
    nav.geolocation!.getCurrentPosition(
      (pos) => {
        resolve({
          position: [pos.coords.longitude, pos.coords.latitude],
          status: 'granted',
          errorReason: null,
        });
      },
      (err) => {
        const code = (err as GeolocationPositionError).code;
        const denied = code === 1;
        resolve({
          position: null,
          status: denied ? 'denied' : 'unavailable',
          errorReason: err.message || 'geolocation_error',
        });
      },
      DEFAULT_OPTIONS
    );
  });
}

async function requestNative(): Promise<{
  position: [number, number] | null;
  status: LocationStatus;
  errorReason: string | null;
}> {
  let Location: typeof import('expo-location');
  try {
    Location = await import('expo-location');
  } catch {
    return { position: null, status: 'unavailable', errorReason: 'expo_location_missing' };
  }

  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      return {
        position: null,
        status: perm.canAskAgain ? 'denied' : 'denied',
        errorReason: 'permission_denied',
      };
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      position: [pos.coords.longitude, pos.coords.latitude],
      status: 'granted',
      errorReason: null,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'native_location_error';
    return { position: null, status: 'unavailable', errorReason: msg };
  }
}

/**
 * Lectura puntual de GPS (sin estado React). Para comprobar proximidad al
 * recibir un pedido nuevo en el tablón.
 */
export async function getCurrentDevicePositionOnce(): Promise<[number, number] | null> {
  const next = Platform.OS === 'web' ? await requestWeb() : await requestNative();
  return next.position;
}

/**
 * Geolocalización del dispositivo (web `navigator.geolocation`, nativo
 * `expo-location`). Sigue el patrón "ask before use": el primer estado es
 * `idle` y nada se solicita hasta que el componente llame a `request()`.
 *
 * El estado se mantiene durante la vida del componente; tras un `denied`
 * el usuario puede volver a pulsar para reintentar (en nativo el SO
 * decidirá si vuelve a pedir el diálogo o no).
 */
export function useDeviceLocation(): DeviceLocationApi {
  const [state, setState] = useState<DeviceLocationState>({
    status: 'idle',
    position: null,
    errorReason: null,
  });
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const request = useCallback(async () => {
    setState((s) => ({ ...s, status: 'pending', errorReason: null }));
    const next = Platform.OS === 'web' ? await requestWeb() : await requestNative();
    if (cancelledRef.current) return;
    setState({
      status: next.status,
      position: next.position,
      errorReason: next.errorReason,
    });
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', position: null, errorReason: null });
  }, []);

  return { ...state, request, reset };
}
