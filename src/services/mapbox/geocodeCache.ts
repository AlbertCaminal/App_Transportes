import { getMapboxAccessToken } from '../../config/mapbox';
import { canConsumeMapbox, noteMapboxConsumption } from './quota';

const STORAGE_KEY = 'barcelona-logistics:mapbox-geocode:v1';
const REVERSE_STORAGE_KEY = 'barcelona-logistics:mapbox-geocode-reverse:v1';
const MAX_CACHE_ENTRIES = 120;

const memory = new Map<string, [number, number]>();
const reverseMemory = new Map<string, string>();
const inflightForward = new Map<string, Promise<[number, number] | null>>();
const inflightReverse = new Map<string, Promise<string | null>>();

function normalizeQuery(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

function readStorage(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === 'object' ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeStorage(rec: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys = Object.keys(rec);
    if (keys.length <= MAX_CACHE_ENTRIES) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
      return;
    }
    const trimmed: Record<string, string> = {};
    for (const k of keys.slice(keys.length - MAX_CACHE_ENTRIES)) {
      trimmed[k] = rec[k];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota o modo privado */
  }
}

function getCached(normalized: string): [number, number] | null {
  const m = memory.get(normalized);
  if (m) return m;
  const disk = readStorage()[normalized];
  if (!disk) return null;
  const parts = disk.split(',').map(Number);
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) {
    const pair: [number, number] = [parts[0], parts[1]];
    memory.set(normalized, pair);
    return pair;
  }
  return null;
}

function setCached(normalized: string, lng: number, lat: number): void {
  memory.set(normalized, [lng, lat]);
  const rec = readStorage();
  rec[normalized] = `${lng},${lat}`;
  writeStorage(rec);
}

/**
 * Geocodificación directa (Mapbox Geocoding API). Sin Matrix ni Directions.
 * Resultados cacheados en memoria + localStorage para no repetir peticiones
 * (cuota free). Devuelve `null` sin lanzar petición si se ha consumido el
 * presupuesto mensual.
 */
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  const token = getMapboxAccessToken();
  if (!token) return null;
  const raw = address.trim();
  if (!raw) return null;
  const cacheKey = normalizeQuery(raw);
  const hit = getCached(cacheKey);
  if (hit) return hit;

  const flying = inflightForward.get(cacheKey);
  if (flying) return flying;

  if (!canConsumeMapbox('geocoding')) return null;

  const path = encodeURIComponent(raw);
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1&language=es&country=es` +
    `&proximity=2.1734%2C41.3851` +
    `&types=address,poi,place`;

  const promise = (async (): Promise<[number, number] | null> => {
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    } finally {
      noteMapboxConsumption('geocoding');
    }
    if (!res.ok) return null;
    let data: { features?: { center?: [number, number] }[] };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return null;
    }
    const c = data.features?.[0]?.center;
    if (!c || c.length < 2) return null;
    const [lng, lat] = c;
    setCached(cacheKey, lng, lat);
    return [lng, lat];
  })();

  inflightForward.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    inflightForward.delete(cacheKey);
  }
}

/** Misma longitud que `addresses`; direcciones repetidas reutilizan caché (una petición HTTP). */
export async function geocodeInOrder(addresses: string[]): Promise<([number, number] | null)[]> {
  return Promise.all(addresses.map((a) => geocodeAddress(a)));
}

/**
 * Inserta una entrada en la caché manualmente. Útil cuando ya se conoce el
 * `[lng, lat]` (por ejemplo, al elegir una sugerencia de autocompletado): así
 * evitamos una segunda petición de geocoding al confirmar la dirección.
 */
export function primeGeocodeCache(address: string, lng: number, lat: number): void {
  const raw = address.trim();
  if (!raw || !Number.isFinite(lng) || !Number.isFinite(lat)) return;
  setCached(normalizeQuery(raw), lng, lat);
}

function reverseKey(lng: number, lat: number): string {
  /** Redondeo a 5 decimales: ~1 m de precisión, suficiente para reverse. */
  return `${lng.toFixed(5)},${lat.toFixed(5)}`;
}

function readReverseStorage(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REVERSE_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === 'object' ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeReverseStorage(rec: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys = Object.keys(rec);
    if (keys.length <= MAX_CACHE_ENTRIES) {
      localStorage.setItem(REVERSE_STORAGE_KEY, JSON.stringify(rec));
      return;
    }
    const trimmed: Record<string, string> = {};
    for (const k of keys.slice(keys.length - MAX_CACHE_ENTRIES)) {
      trimmed[k] = rec[k];
    }
    localStorage.setItem(REVERSE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota o modo privado */
  }
}

/**
 * Geocodificación inversa (Mapbox `mapbox.places`): de coordenadas a texto.
 * Cacheada en memoria + localStorage para no quemar cuota cuando el GPS del
 * dispositivo emite la misma posición varias veces.
 */
export async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
  const token = getMapboxAccessToken();
  if (!token) return null;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

  const key = reverseKey(lng, lat);
  const memo = reverseMemory.get(key);
  if (memo) return memo;
  const disk = readReverseStorage()[key];
  if (disk) {
    reverseMemory.set(key, disk);
    return disk;
  }

  const flying = inflightReverse.get(key);
  if (flying) return flying;

  if (!canConsumeMapbox('geocoding')) return null;

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1&language=es&types=address,poi,place`;

  const promise = (async (): Promise<string | null> => {
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    } finally {
      noteMapboxConsumption('geocoding');
    }
    if (!res.ok) return null;
    let data: { features?: { place_name?: string; text?: string }[] };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return null;
    }
    const f = data.features?.[0];
    const text = (f?.place_name ?? f?.text ?? null) || null;
    if (text) {
      reverseMemory.set(key, text);
      const rec = readReverseStorage();
      rec[key] = text;
      writeReverseStorage(rec);
    }
    return text;
  })();

  inflightReverse.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightReverse.delete(key);
  }
}

const DELIVERABLE_CACHE = new Map<string, boolean>();

/**
 * Comprueba que el texto resuelve a una dirección/punto concreto (no solo ciudad).
 * Usa tipos `address` y `poi` únicamente y umbral de relevancia; reutiliza el token Mapbox del cliente.
 */
export async function validateDeliverableAddress(address: string): Promise<boolean> {
  const token = getMapboxAccessToken();
  const raw = address.trim();
  if (!token || raw.length < 4) return false;

  const cacheKey = `${normalizeQuery(raw)}:d`;
  const memo = DELIVERABLE_CACHE.get(cacheKey);
  if (memo != null) return memo;

  if (!canConsumeMapbox('geocoding')) return false;

  const path = encodeURIComponent(raw);
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${path}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1&language=es&country=es` +
    `&proximity=2.1734%2C41.3851` +
    `&types=address,poi`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    noteMapboxConsumption('geocoding');
    DELIVERABLE_CACHE.set(cacheKey, false);
    return false;
  }
  noteMapboxConsumption('geocoding');
  if (!res.ok) {
    DELIVERABLE_CACHE.set(cacheKey, false);
    return false;
  }

  let data: {
    features?: {
      center?: [number, number];
      relevance?: number;
      place_type?: string[];
    }[];
  };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    DELIVERABLE_CACHE.set(cacheKey, false);
    return false;
  }

  const feat = data.features?.[0];
  const types = feat?.place_type ?? [];
  const rel = feat?.relevance ?? 0;
  const center = feat?.center;
  const ok =
    Boolean(center?.length && center.length >= 2) &&
    rel >= 0.65 &&
    (types.includes('address') || types.includes('poi'));

  DELIVERABLE_CACHE.set(cacheKey, ok);
  if (ok && center) {
    setCached(normalizeQuery(raw), center[0], center[1]);
  }
  return ok;
}
