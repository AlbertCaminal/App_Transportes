import { getMapboxAccessToken, MAPBOX_DEFAULT_CENTER } from '../../config/mapbox';
import { canConsumeMapbox, noteMapboxConsumption } from './quota';

/**
 * Resultado de una llamada a Mapbox Directions (perfil `driving-traffic`).
 * - `geometry`: GeoJSON LineString con la polilínea exacta de la ruta.
 * - `durationSec` y `distanceM`: estimaciones del trayecto completo.
 */
export interface DirectionsResult {
  geometry: GeoJSON.LineString;
  durationSec: number;
  distanceM: number;
}

const STORAGE_KEY = 'barcelona-logistics:mapbox-directions:v1';
const MAX_CACHE_ENTRIES = 120;
const memory = new Map<string, DirectionsResult>();
const inflight = new Map<string, Promise<DirectionsResult | null>>();
let storageHydrated = false;

function coordKey(coords: [number, number][]): string {
  return coords.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join('|');
}

function readStorage(): Record<string, DirectionsResult> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === 'object' ? (o as Record<string, DirectionsResult>) : {};
  } catch {
    return {};
  }
}

function writeStorage(rec: Record<string, DirectionsResult>): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keys = Object.keys(rec);
    if (keys.length <= MAX_CACHE_ENTRIES) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
      return;
    }
    const trimmed: Record<string, DirectionsResult> = {};
    for (const k of keys.slice(keys.length - MAX_CACHE_ENTRIES)) {
      trimmed[k] = rec[k];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota o modo privado */
  }
}

function hydrate(): void {
  if (storageHydrated) return;
  storageHydrated = true;
  const disk = readStorage();
  for (const [k, v] of Object.entries(disk)) {
    if (v && typeof v === 'object' && (v as DirectionsResult).geometry) {
      memory.set(k, v as DirectionsResult);
    }
  }
}

function setCached(key: string, value: DirectionsResult): void {
  memory.set(key, value);
  if (memory.size > MAX_CACHE_ENTRIES) {
    const overflow = memory.size - MAX_CACHE_ENTRIES;
    let i = 0;
    for (const k of memory.keys()) {
      if (i++ >= overflow) break;
      memory.delete(k);
    }
  }
  const snapshot: Record<string, DirectionsResult> = {};
  for (const [k, v] of memory.entries()) snapshot[k] = v;
  writeStorage(snapshot);
}

/**
 * Trayecto óptimo entre 2 o más puntos `[lng, lat]` (en orden) con perfil
 * `driving-traffic` (más rápido considerando tráfico). Caché en memoria por
 * combinación exacta de coordenadas para evitar peticiones duplicadas.
 *
 * @returns `null` si no hay token, faltan puntos o falla la red/HTTP.
 */
export async function fetchDrivingRoute(coords: [number, number][]): Promise<DirectionsResult | null> {
  const token = getMapboxAccessToken();
  if (!token) return null;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2) return null;
    if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;
  }
  if (coords.length > 25) {
    coords = coords.slice(0, 25);
  }

  hydrate();
  const key = coordKey(coords);
  const hit = memory.get(key);
  if (hit) return hit;

  // Dedupe: dos componentes pidiendo la misma ruta a la vez comparten fetch.
  const flying = inflight.get(key);
  if (flying) return flying;

  if (!canConsumeMapbox('directions')) return memory.get(key) ?? null;

  const path = coords.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${path}` +
    `?access_token=${encodeURIComponent(token)}` +
    `&geometries=geojson&overview=full&language=es&steps=false`;

  const promise = (async (): Promise<DirectionsResult | null> => {
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      return null;
    } finally {
      noteMapboxConsumption('directions');
    }
    if (!res.ok) return null;

    let data: {
      routes?: {
        duration?: number;
        distance?: number;
        geometry?: GeoJSON.LineString;
      }[];
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return null;
    }
    const route = data.routes?.[0];
    if (
      !route ||
      !route.geometry ||
      route.geometry.type !== 'LineString' ||
      !Array.isArray(route.geometry.coordinates) ||
      route.geometry.coordinates.length < 2
    ) {
      return null;
    }

    const result: DirectionsResult = {
      geometry: route.geometry,
      durationSec: typeof route.duration === 'number' ? route.duration : 0,
      distanceM: typeof route.distance === 'number' ? route.distance : 0,
    };
    setCached(key, result);
    return result;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/** Centro útil para `fitBounds` cuando no hay coords aún. */
export const DIRECTIONS_FALLBACK_CENTER: [number, number] = MAPBOX_DEFAULT_CENTER;

/** Formatea duración en `Xh Ym` o `Y min`. */
export function formatDurationSec(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '—';
  const total = Math.round(sec / 60);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Formatea metros como `X,X km` o `Y m` (es-ES). */
export function formatDistanceM(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km.toFixed(km >= 10 ? 0 : 1).replace('.', ',')} km`;
}
