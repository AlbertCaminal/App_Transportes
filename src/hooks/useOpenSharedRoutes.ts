import { useEffect, useState } from 'react';
import { subscribeOpenSharedRoutes, type OpenSharedRouteRow } from '../services/firestore/sharedOpenRoutes';

/**
 * Listado en vivo de rutas abiertas (Open Route + en búsqueda) que el cliente
 * puede ver en su mapa. Si pasamos un `currentClientUid`, se excluyen las
 * propias para evitar mostrarlas como descubrimiento ajeno.
 */
export function useOpenSharedRoutes(enabled: boolean, currentClientUid?: string | null) {
  const [rows, setRows] = useState<OpenSharedRouteRow[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setError(null);
      return;
    }
    return subscribeOpenSharedRoutes(
      (r) => {
        if (currentClientUid) {
          setRows(r.filter((row) => row['clientId'] !== currentClientUid));
        } else {
          setRows(r);
        }
        setError(null);
      },
      (e) => setError(e)
    );
  }, [enabled, currentClientUid]);

  return { rows, error };
}
