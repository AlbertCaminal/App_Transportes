import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { updateCarrierLocationCallable } from '../services/firebase/sharedRouteCallable';

/** Ms entre publicaciones de posición. Mantener alto para reducir coste. */
const PUBLISH_INTERVAL_MS = 60_000;
const FIRST_DELAY_MS = 1_500;

/**
 * Si hay `requestId` asignado y posición conocida, publica `lng/lat` cada
 * `PUBLISH_INTERVAL_MS` para que el cliente vea al transportista en vivo en
 * el mapa. Solo intenta enviar si la posición ha cambiado lo suficiente
 * (>30 m aprox.) para evitar escrituras innecesarias.
 */
export function usePublishCarrierLocation(requestId: string | null, position: [number, number] | null): void {
  const lastPublishedRef = useRef<[number, number] | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!requestId || !position) return;

    let cancelled = false;

    const publish = async () => {
      if (cancelled || inFlightRef.current) return;
      const last = lastPublishedRef.current;
      if (last && distanceMeters(last, position) < 30) return;
      inFlightRef.current = true;
      try {
        await updateCarrierLocationCallable(requestId, position[0], position[1]);
        lastPublishedRef.current = position;
      } catch (e) {
        if (Platform.OS !== 'web' && __DEV__) {
          console.warn('[usePublishCarrierLocation] no se pudo publicar', e);
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    const t0 = setTimeout(publish, FIRST_DELAY_MS);
    const interval = setInterval(publish, PUBLISH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(t0);
      clearInterval(interval);
    };
  }, [requestId, position]);
}

/** Distancia haversine simplificada en metros (suficiente para umbrales pequeños). */
function distanceMeters(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}
