/**
 * Contadores mensuales por familia de API Mapbox para no superar el plan
 * gratuito (~100 000 req/mes por API). Persisten en `localStorage` cuando
 * existe (web) y en memoria en cualquier otro entorno (nativo, tests).
 *
 * El objetivo NO es bloquear al usuario, sino dejar de hacer peticiones
 * adicionales cuando el cupo del mes se haya consumido. Las cachés en
 * `suggest`, `geocodeCache` y `directions` siguen sirviendo respuestas
 * conocidas; el guard solo evita el fetch nuevo.
 *
 * Periodo: año-mes UTC (`YYYY-MM`). Cuando cambia el mes el contador
 * arranca a 0 automáticamente al leerlo.
 */
import { MAPBOX_DIRECTIONS_MONTHLY_BUDGET, MAPBOX_GEOCODING_MONTHLY_BUDGET } from '../../config/mapbox';

export type MapboxApiFamily = 'geocoding' | 'directions';

const STORAGE_KEY = 'barcelona-logistics:mapbox-quota:v1';

interface QuotaSnapshot {
  /** Año-mes UTC, p. ej. `2026-04`. */
  period: string;
  geocoding: number;
  directions: number;
}

const memorySnapshot: QuotaSnapshot = {
  period: currentPeriod(),
  geocoding: 0,
  directions: 0,
};
let hydrated = false;

function currentPeriod(now: Date = new Date()): string {
  const y = now.getUTCFullYear().toString().padStart(4, '0');
  const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${y}-${m}`;
}

function safeStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined') return null;
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (!ls) return null;
    return ls;
  } catch {
    return null;
  }
}

function readDisk(): QuotaSnapshot | null {
  const ls = safeStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuotaSnapshot> | null;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.period !== 'string' ||
      typeof parsed.geocoding !== 'number' ||
      typeof parsed.directions !== 'number'
    ) {
      return null;
    }
    return {
      period: parsed.period,
      geocoding: Math.max(0, Math.floor(parsed.geocoding)),
      directions: Math.max(0, Math.floor(parsed.directions)),
    };
  } catch {
    return null;
  }
}

function writeDisk(snap: QuotaSnapshot): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* quota o modo privado: ignorar, sigue funcionando en memoria */
  }
}

function ensureHydratedAndCurrent(): QuotaSnapshot {
  if (!hydrated) {
    const disk = readDisk();
    if (disk) {
      memorySnapshot.period = disk.period;
      memorySnapshot.geocoding = disk.geocoding;
      memorySnapshot.directions = disk.directions;
    }
    hydrated = true;
  }
  const period = currentPeriod();
  if (memorySnapshot.period !== period) {
    memorySnapshot.period = period;
    memorySnapshot.geocoding = 0;
    memorySnapshot.directions = 0;
    writeDisk(memorySnapshot);
  }
  return memorySnapshot;
}

function budgetFor(family: MapboxApiFamily): number {
  return family === 'geocoding' ? MAPBOX_GEOCODING_MONTHLY_BUDGET : MAPBOX_DIRECTIONS_MONTHLY_BUDGET;
}

/** Lectura no destructiva del estado actual (útil para UI/diagnóstico). */
export function getMapboxQuotaSnapshot(): {
  period: string;
  geocoding: { used: number; budget: number; remaining: number };
  directions: { used: number; budget: number; remaining: number };
} {
  const snap = ensureHydratedAndCurrent();
  const gB = budgetFor('geocoding');
  const dB = budgetFor('directions');
  return {
    period: snap.period,
    geocoding: { used: snap.geocoding, budget: gB, remaining: Math.max(0, gB - snap.geocoding) },
    directions: { used: snap.directions, budget: dB, remaining: Math.max(0, dB - snap.directions) },
  };
}

/** True si AÚN queda cupo (incluye el caso `budget = 0` ⇒ "ilimitado en práctica"). */
export function canConsumeMapbox(family: MapboxApiFamily, units = 1): boolean {
  const snap = ensureHydratedAndCurrent();
  const budget = budgetFor(family);
  if (budget <= 0) return true;
  return snap[family] + Math.max(1, units) <= budget;
}

/**
 * Anota una petición consumida. Llamar SOLO tras lanzar el `fetch` (no por
 * un cache hit). `units` permite contabilizar múltiples puntos en
 * Directions u optimización de rutas.
 */
export function noteMapboxConsumption(family: MapboxApiFamily, units = 1): void {
  const snap = ensureHydratedAndCurrent();
  snap[family] += Math.max(1, units);
  writeDisk(snap);
}

/** Solo para tests: vacía contadores y desactiva la hidratación previa. */
export function _resetMapboxQuotaForTests(): void {
  hydrated = false;
  memorySnapshot.period = currentPeriod();
  memorySnapshot.geocoding = 0;
  memorySnapshot.directions = 0;
  const ls = safeStorage();
  if (ls) {
    try {
      ls.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
