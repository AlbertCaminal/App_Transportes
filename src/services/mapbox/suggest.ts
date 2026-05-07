import { getMapboxAccessToken } from '../../config/mapbox';
import { canConsumeMapbox, noteMapboxConsumption } from './quota';

/**
 * Sugerencia de dirección devuelta por Mapbox Geocoding.
 * `placeName` es la cadena legible (ej. "Carrer de Provença, 123, Barcelona").
 */
export interface AddressSuggestion {
  id: string;
  placeName: string;
  center: [number, number];
}

const STORAGE_KEY = 'barcelona-logistics:mapbox-suggest:v1';
const MAX_CACHE_ENTRIES = 200;
const memory = new Map<string, AddressSuggestion[]>();
const inflight = new Map<string, Promise<AddressSuggestion[]>>();
let storageHydrated = false;

function normalizeQuery(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

function readStorage(): Record<string, AddressSuggestion[]> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === 'object' ? (o as Record<string, AddressSuggestion[]>) : {};
  } catch {
    return {};
  }
}

function writeStorage(rec: Record<string, AddressSuggestion[]>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys = Object.keys(rec);
    if (keys.length <= MAX_CACHE_ENTRIES) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
      return;
    }
    const trimmed: Record<string, AddressSuggestion[]> = {};
    for (const k of keys.slice(keys.length - MAX_CACHE_ENTRIES)) {
      trimmed[k] = rec[k];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota o modo privado */
  }
}

/** Hidrata la caché de memoria desde localStorage la primera vez. */
function hydrate(): void {
  if (storageHydrated) return;
  storageHydrated = true;
  const disk = readStorage();
  for (const [k, v] of Object.entries(disk)) {
    if (Array.isArray(v)) memory.set(k, v);
  }
}

function setCached(key: string, items: AddressSuggestion[]): void {
  memory.set(key, items);
  // Evicción LRU-aproximada: re-insertar para empujar al final.
  if (memory.size > MAX_CACHE_ENTRIES) {
    const overflow = memory.size - MAX_CACHE_ENTRIES;
    let i = 0;
    for (const k of memory.keys()) {
      if (i++ >= overflow) break;
      memory.delete(k);
    }
  }
  // Persistir snapshot acumulado.
  const snapshot: Record<string, AddressSuggestion[]> = {};
  for (const [k, v] of memory.entries()) snapshot[k] = v;
  writeStorage(snapshot);
}

/** Tipos por defecto de los resultados (dirección, POI, lugar). */
const DEFAULT_TYPES = 'address,poi,place';

/**
 * Autocompletado real de direcciones (Mapbox Geocoding API forward).
 *
 * - Sesgado a Barcelona (proximity) y España (country=es), idioma `es`.
 * - Cache en memoria + localStorage por consulta normalizada para evitar
 *   peticiones repetidas mientras el usuario escribe y borra.
 * - Dedupe de peticiones en vuelo: dos llamadas iguales casi simultáneas
 *   comparten el mismo `fetch` (común en componentes que tipean rápido).
 * - Quota guard: si se excede el presupuesto mensual, devuelve la caché
 *   (o `[]`) sin llamar a la API.
 * - Si no hay token o el texto es corto (<3), devuelve `[]`.
 *
 * Nota: el debounce y el `AbortController` los aporta el componente que
 * llama (ver `AddressAutocompleteInput`).
 */
export async function suggestAddresses(
  query: string,
  options?: { signal?: AbortSignal }
): Promise<AddressSuggestion[]> {
  const token = getMapboxAccessToken();
  const raw = query.trim();
  if (!token || raw.length < 3) return [];
  if (options?.signal?.aborted) return [];

  hydrate();
  const cacheKey = normalizeQuery(raw);
  const hit = memory.get(cacheKey);
  if (hit) return hit;

  // Reutiliza una petición en vuelo para la misma query.
  const flying = inflight.get(cacheKey);
  if (flying) return flying;

  if (!canConsumeMapbox('geocoding')) {
    // Sin cupo: devolvemos lo que haya en caché (vacío en este caso).
    return memory.get(cacheKey) ?? [];
  }

  const path = encodeURIComponent(raw);
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&autocomplete=true&limit=5&language=es&country=es` +
    `&proximity=2.1734%2C41.3851` +
    `&types=${encodeURIComponent(DEFAULT_TYPES)}`;

  const promise = (async (): Promise<AddressSuggestion[]> => {
    let res: Response;
    try {
      res = await fetch(url, options?.signal ? { signal: options.signal } : undefined);
    } catch {
      return [];
    } finally {
      // El consumo se anota incluso si falla: el plan de Mapbox descuenta el intento.
      noteMapboxConsumption('geocoding');
    }
    if (!res.ok) return [];

    let data: {
      features?: {
        id?: string;
        place_name?: string;
        text?: string;
        center?: [number, number];
      }[];
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return [];
    }

    const features = data.features ?? [];
    const out: AddressSuggestion[] = [];
    for (const f of features) {
      const c = f.center;
      if (!c || c.length < 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
      const placeName = (f.place_name ?? f.text ?? '').trim();
      if (!placeName) continue;
      out.push({
        id: f.id ?? `${c[0]},${c[1]}`,
        placeName,
        center: [c[0], c[1]],
      });
    }
    setCached(cacheKey, out);
    return out;
  })();

  inflight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(cacheKey);
  }
}
