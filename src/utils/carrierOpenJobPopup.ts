/**
 * Evita repetir el popup de “nuevo envío” al recargar o al re-suscribirse.
 */
const STORAGE_KEY = 'barcelona-logistics:carrier-open-job-popup:v1';
const MAX_STORED_IDS = 400;

export function loadCarrierPopupShownIds(): Set<string> {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

/** Marca un pedido como ya notificado por popup (una vez por solicitud). */
export function rememberCarrierPopupShown(requestId: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const s = loadCarrierPopupShownIds();
    s.add(requestId);
    const arr = [...s].slice(-MAX_STORED_IDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    /* ignore quota / private mode */
  }
}

export function haversineDistanceM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const lat1 = (a[1] * Math.PI) / 180;
  const lat2 = (b[1] * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export function requestCreatedMs(job: Record<string, unknown>): number {
  const c = job['createdAt'];
  if (
    c &&
    typeof c === 'object' &&
    c !== null &&
    'toMillis' in c &&
    typeof (c as { toMillis: unknown }).toMillis === 'function'
  ) {
    return (c as { toMillis: () => number }).toMillis();
  }
  if (c && typeof c === 'object' && c !== null && 'seconds' in c) {
    const sec = Number((c as { seconds: unknown }).seconds);
    if (Number.isFinite(sec)) return sec * 1000;
  }
  return 0;
}

/** Entre varios IDs añadidos en el mismo snapshot, el más reciente por `createdAt`. */
export function pickLatestJobAmongIds(ids: string[], rows: { id: string }[]): string | null {
  const scored = ids
    .map((id) => {
      const row = rows.find((r) => r.id === id) as Record<string, unknown> | undefined;
      return { id, t: row ? requestCreatedMs(row) : -1 };
    })
    .sort((a, b) => b.t - a.t || b.id.localeCompare(a.id));
  return scored[0]?.id ?? null;
}
