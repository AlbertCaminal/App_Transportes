import type { ColorScheme } from '../../shared/types';

/**
 * Estilo base Mapbox GL según tema de la app (light/dark).
 * @see https://docs.mapbox.com/data/tilesets/reference/mapbox-streets-v8/
 */
export function mapboxStyleUri(scheme: ColorScheme): string {
  return scheme === 'light' ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11';
}

/**
 * Token público de Mapbox (EXPO_PUBLIC_*). Restringe por URL en Mapbox Account → token.
 * @see https://docs.mapbox.com/help/getting-started/access-tokens/
 */
export function getMapboxAccessToken(): string {
  return (process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '').trim();
}

export function isMapboxConfigured(): boolean {
  return getMapboxAccessToken().length > 0;
}

/** Centro por defecto (Barcelonès) cuando no hay ruta. */
export const MAPBOX_DEFAULT_CENTER: [number, number] = [2.1734, 41.3851];

export const MAPBOX_DEFAULT_ZOOM_IDLE = 11.2;

/**
 * Margen inferior (px) que debe descontar el chip ETA cuando el padre muestra
 * el pill «Cerrar mapa» (bottom ~28 + altura del botón + separación).
 */
export const MAP_WEB_BOTTOM_CHROME_RESERVE_PX = 90;

/**
 * Mapa compacto con sheet visible: separación del chip ETA respecto al borde inferior
 * del mapa para que no lo tape el solapo del panel ni la zona del tirador.
 */
export const MAP_WEB_COMPACT_SHEET_RESERVE_PX = 52;

/**
 * Parsea un presupuesto mensual leído desde env (`EXPO_PUBLIC_*`) con fallback.
 * Nunca lanza; valores no numéricos o ≤0 caen al default. La lectura del valor
 * debe hacerse de forma estática en el call-site (`process.env.NOMBRE`), porque
 * Expo sustituye estas vars en build y la regla `expo/no-dynamic-env-var` prohíbe
 * el acceso dinámico (`process.env[varName]`).
 */
function parseBudget(raw: string | undefined, fallback: number): number {
  const n = raw != null ? Number(String(raw).trim()) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Presupuestos mensuales por familia de endpoint para no superar el plan
 * gratuito (~100 000 req/mes por API). Defaults conservadores con margen.
 */
export const MAPBOX_GEOCODING_MONTHLY_BUDGET = parseBudget(
  process.env.EXPO_PUBLIC_MAPBOX_GEOCODING_BUDGET,
  90_000
);
export const MAPBOX_DIRECTIONS_MONTHLY_BUDGET = parseBudget(
  process.env.EXPO_PUBLIC_MAPBOX_DIRECTIONS_BUDGET,
  90_000
);
