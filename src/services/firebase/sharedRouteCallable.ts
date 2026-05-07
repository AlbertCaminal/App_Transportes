import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirebaseApp } from '../../config/firebase';
import type { JoinerPackagePayload } from '../../../shared/types';

/** Misma región que `functions/src/index.ts` (`setGlobalOptions`). */
export const CLOUD_FUNCTIONS_REGION = 'europe-west1';

function getFunctionsForRegion() {
  const app = getFirebaseApp();
  if (!app) return null;
  return getFunctions(app, CLOUD_FUNCTIONS_REGION);
}

/**
 * Cliente B se une a una ruta abierta del cliente A. La Cloud Function
 * `joinSharedRoute` valida en transacción `openRoutePreferred`, hueco
 * disponible y propiedad, y crea el subdoc `joiners/{uid}` para tracking.
 */
export async function joinSharedRouteCallable(
  requestId: string,
  payload: JoinerPackagePayload
): Promise<{ ok?: boolean; priceShare?: string }> {
  const fns = getFunctionsForRegion();
  if (!fns) throw new Error('firebase/not-initialized');
  const fn = httpsCallable(fns, 'joinSharedRoute');
  const res = await fn({ requestId, package: payload });
  return res.data as { ok?: boolean; priceShare?: string };
}

/**
 * El transportista publica su posición actual en `requests/{id}.carrierLocation`.
 * Solo el `carrierId` asignado puede llamarla y solo si la solicitud está en
 * `assigned`. Frecuencia recomendada: cada 60 s para evitar coste innecesario.
 */
export async function updateCarrierLocationCallable(
  requestId: string,
  lng: number,
  lat: number
): Promise<{ ok?: boolean }> {
  const fns = getFunctionsForRegion();
  if (!fns) throw new Error('firebase/not-initialized');
  const fn = httpsCallable(fns, 'updateCarrierLocation');
  const res = await fn({ requestId, lng, lat });
  return res.data as { ok?: boolean };
}
