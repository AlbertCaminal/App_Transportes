/**
 * Datos de mapa del cliente a partir de `requests/{id}` en Firestore.
 */

/** Interpreta `carrierLocation` (GeoPoint del SDK o mapa { lng, lat }). */
export function parseCarrierLngLat(raw: unknown): [number, number] | null {
  if (raw == null) return null;
  if (typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if ('latitude' in o && 'longitude' in o) {
      const lat = Number(o.latitude);
      const lng = Number(o.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
    }
    if ('lat' in o && 'lng' in o) {
      const lat = Number(o.lat);
      const lng = Number(o.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
    }
    if ('_latitude' in o && '_longitude' in o) {
      const lat = Number(o._latitude);
      const lng = Number(o._longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
    }
  }
  return null;
}

/** Origen + destinos para pintar la misión en el mapa durante seguimiento. */
export function liveRequestToMapSnapshot(data: Record<string, unknown> | null): {
  origin: string;
  destinations: string[];
} | null {
  if (!data) return null;
  const origin = data.origin;
  if (typeof origin !== 'string' || origin.trim().length < 2) return null;
  const o = origin.trim();
  const st = data.serviceType;
  if (st === 'express') {
    const dest = data.expressDestination;
    const d = typeof dest === 'string' && dest.trim().length > 1 ? [dest.trim()] : [];
    return { origin: o, destinations: d };
  }
  if (st === 'programmed' && Array.isArray(data.packages)) {
    const dests = (data.packages as unknown[])
      .map((p) => {
        if (!p || typeof p !== 'object') return '';
        const dest = (p as { destination?: unknown }).destination;
        return typeof dest === 'string' ? dest.trim() : '';
      })
      .filter((s) => s.length > 2);
    return { origin: o, destinations: dests };
  }
  return { origin: o, destinations: [] };
}
