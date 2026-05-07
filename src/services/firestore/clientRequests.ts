import { collection, doc, limit, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { getFirestoreDb } from '../../config/firebase';

export type RequestRow = { id: string; data: Record<string, unknown> };

function timestampMillis(v: unknown): number {
  if (
    v &&
    typeof v === 'object' &&
    'toMillis' in v &&
    typeof (v as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (v as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function byCreatedAtDesc(a: RequestRow, b: RequestRow): number {
  return timestampMillis(a.data['createdAt']) - timestampMillis(b.data['createdAt']);
}

function byAssignedAtDesc(a: RequestRow, b: RequestRow): number {
  const ma = timestampMillis(a.data['assignedAt']);
  const mb = timestampMillis(b.data['assignedAt']);
  if (mb !== ma) return mb - ma;
  return timestampMillis(b.data['createdAt']) - timestampMillis(a.data['createdAt']);
}

/**
 * Suscripción en tiempo real a las solicitudes del cliente (`clientId` == uid).
 * Ordenación por `createdAt` en cliente (evita índice compuesto obligatorio con `orderBy` en servidor).
 */
export function subscribeClientRequests(
  clientId: string,
  onData: (rows: RequestRow[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) {
    onData([]);
    return () => undefined;
  }
  const q = query(collection(db, 'requests'), where('clientId', '==', clientId), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const rows: RequestRow[] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      rows.sort((a, b) => byCreatedAtDesc(b, a));
      onData(rows);
    },
    (err) => onError?.(err as Error)
  );
}

/**
 * Solicitudes donde este usuario figura como `carrierId` (asignadas u otras).
 * Orden por `assignedAt` en cliente para evitar índice compuesto.
 */
export function subscribeCarrierRequests(
  carrierUid: string,
  onData: (rows: RequestRow[]) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db || !carrierUid.trim()) {
    onData([]);
    return () => undefined;
  }
  const q = query(collection(db, 'requests'), where('carrierId', '==', carrierUid.trim()), limit(40));
  return onSnapshot(
    q,
    (snap) => {
      const rows: RequestRow[] = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      rows.sort(byAssignedAtDesc);
      onData(rows);
    },
    (err) => onError?.(err as Error)
  );
}

/**
 * Un documento concreto (p. ej. el envío recién confirmado: seguimiento en vivo).
 */
export function subscribeShippingRequestById(
  requestId: string,
  onData: (data: Record<string, unknown> | null) => void,
  onError?: (e: Error) => void
): Unsubscribe {
  const db = getFirestoreDb();
  if (!db) {
    onData(null);
    return () => undefined;
  }
  const ref = doc(db, 'requests', requestId);
  return onSnapshot(
    ref,
    (snap) => onData(snap.exists() ? snap.data() : null),
    (err) => onError?.(err as Error)
  );
}
