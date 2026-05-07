/** Props compartidas entre la vista mock (nativo) y Mapbox (web). */
export type CarrierRouteMapProps = {
  isTracking?: boolean;
  isProgrammed?: boolean;
  isOpenRoute?: boolean;
  originSet?: boolean;
  destinations?: string[];
  /** Recogida; en web se geocodifica una vez por texto (con caché). */
  originAddress?: string;
  /** Posición actual [lng, lat] para trazar desde el transportista hasta la recogida (p. ej. web). */
  carrierStartLngLat?: [number, number] | null;
  /**
   * Si `true` (por defecto), pinta una viñeta oscura del 35% inferior para
   * fundir con el sheet. Desactívala cuando el mapa esté a pantalla completa.
   */
  bottomFade?: boolean;
  /**
   * Evita solapar el chip ETA con el pill «Cerrar mapa» u otros controles inferiores.
   */
  bottomChromeInsetPx?: number;
  /**
   * Desplaza el chip ETA desde la base del mapa (solo web). Valores negativos lo
   * bajan para compensar una cabecera más alta (vehículo + EN SERVICIO).
   */
  etaChipBottomAdjustPx?: number;
};
