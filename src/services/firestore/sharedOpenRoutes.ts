import { collection, limit, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import type { ShippingRequestStatus } from '../../../shared/types';
import { getFirestoreDb } from '../../config/firebase';

/** Fila de `requests` con el id del documento; los campos no se tipan para permitir variaciones. */
export type OpenSharedRouteRow = { id: string } & Record<string, unknown>;

/**
 * Suscripción en vivo a las rutas abiertas con `openRoutePreferred==true` y
 * `status=='searching_carrier'`: lo que un cliente puede ver en su mapa para
 * decidir unirse con un paquete propio.
 *
 * Las reglas de Firestore deben permitir esta lectura (ver `firestore.rules`).
 */
export function subscribeOpenSharedRoutes(
  onData: (rows: OpenSharedRouteRow[]) => void,
  onError?: (e: Error) => void,
  maxDocs = 40
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }
  const q = query(
    collection(db, 'requests'),
    where('status', '==', 'searching_carrier' as ShippingRequestStatus),
    where('openRoutePreferred', '==', true),
    limit(maxDocs)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => onError?.(err as Error)
  );
}
