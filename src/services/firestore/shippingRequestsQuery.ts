import { collection, getDocs, limit, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import type { ShippingRequestStatus } from '../../../shared/types';
import { getFirestoreDb } from '../../config/firebase';

export type OpenCarrierRequestRow = { id: string } & Record<string, unknown>;

/**
 * Solicitudes abiertas para transportistas (tras el trigger del backend).
 * Reglas: solo lectura si `users/{uid}.appMode == 'carrier'`.
 */
export async function listSearchingCarrierRequests(maxDocs = 20): Promise<OpenCarrierRequestRow[]> {
  const db = getFirestoreDb();
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'searching_carrier' as ShippingRequestStatus),
      limit(maxDocs)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    if (__DEV__) console.warn('[listSearchingCarrierRequests]', e);
    return [];
  }
}

/**
 * Listado en vivo de `status == searching_carrier` (mismas reglas que arriba).
 */
export function subscribeSearchingCarrierRequests(
  onData: (rows: OpenCarrierRequestRow[]) => void,
  onError?: (e: Error) => void,
  /**
   * Solo tras el primer snapshot: IDs de solicitudes nuevas en esta actualización.
   * Útil para avisar al transportista una sola vez cuando entra un pedido en vivo.
   */
  onAdded?: (addedIds: string[], rows: OpenCarrierRequestRow[]) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }
  const q = query(
    collection(db, 'requests'),
    where('status', '==', 'searching_carrier' as ShippingRequestStatus),
    limit(40)
  );
  let firstSnapshot = true;
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData(rows);
      if (firstSnapshot) {
        firstSnapshot = false;
        return;
      }
      const added = snap
        .docChanges()
        .filter((c) => c.type === 'added')
        .map((c) => c.doc.id);
      if (added.length > 0) onAdded?.(added, rows);
    },
    (err) => onError?.(err as Error)
  );
}
