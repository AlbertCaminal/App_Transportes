import { useEffect, useRef, useState } from 'react';
import {
  subscribeCarrierRequests,
  subscribeClientRequests,
  subscribeShippingRequestById,
  type RequestRow,
} from '../services/firestore/clientRequests';
import { subscribeSearchingCarrierRequests } from '../services/firestore/shippingRequestsQuery';
import type { OpenCarrierRequestRow } from '../services/firestore/shippingRequestsQuery';

/**
 * Listado en vivo de `requests` del usuario (Firestore).
 */
export function useClientRequestList(clientId: string | undefined) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!clientId) {
      setRows([]);
      setError(null);
      return;
    }
    return subscribeClientRequests(
      clientId,
      (r) => {
        setRows(r);
        setError(null);
      },
      (e) => setError(e)
    );
  }, [clientId]);

  return { rows, error };
}

/**
 * Solicitudes Firestore donde `carrierId` == uid (recarga: recuperar envío `assigned`).
 */
export function useCarrierFirestoreRequests(carrierUid: string | undefined, enabled: boolean) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !carrierUid?.trim()) {
      setRows([]);
      setReady(true);
      setError(null);
      return;
    }
    setReady(false);
    return subscribeCarrierRequests(
      carrierUid.trim(),
      (r) => {
        setRows(r);
        setReady(true);
        setError(null);
      },
      (e) => {
        setError(e);
        setReady(true);
      }
    );
  }, [enabled, carrierUid]);

  return { rows, ready, error };
}

/**
 * Un documento `requests/{id}` (seguimiento tras confirmar).
 */
export function useShippingRequestDocument(requestId: string | null, enabled: boolean) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !requestId) {
      setData(null);
      setError(null);
      return;
    }
    return subscribeShippingRequestById(
      requestId,
      (d) => {
        setData(d);
        setError(null);
      },
      (e) => setError(e)
    );
  }, [requestId, enabled]);

  return { data, error };
}

/**
 * Ofertas abiertas en la nube (transportista con `appMode: carrier` en reglas).
 */
export function useSearchingCarrierRequests(
  enabled: boolean,
  options?: {
    /** Tras el primer snapshot de Firestore: nuevos documentos en esta actualización. */
    onOpenJobsAdded?: (payload: { ids: string[]; rows: OpenCarrierRequestRow[] }) => void;
  }
) {
  const [rows, setRows] = useState<OpenCarrierRequestRow[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const onAddedRef = useRef(options?.onOpenJobsAdded);
  onAddedRef.current = options?.onOpenJobsAdded;

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setError(null);
      return;
    }
    return subscribeSearchingCarrierRequests(
      (r) => {
        setRows(r);
        setError(null);
      },
      (e) => setError(e),
      (addedIds, rowsSnapshot) => {
        onAddedRef.current?.({ ids: addedIds, rows: rowsSnapshot });
      }
    );
  }, [enabled]);

  return { rows, error };
}
