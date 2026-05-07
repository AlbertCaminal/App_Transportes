/**
 * Fila mínima usada por el mapa cliente para descubrir rutas abiertas.
 * Sólo se requieren los campos necesarios para renderizar el marcador y el
 * preview; el resto se maneja desde la pantalla padre (`ClientHome`).
 */
export interface OpenSharedRouteMapItem {
  id: string;
  /** Texto de origen (recogida) — se geocodifica con caché. */
  origin: string;
  /** Texto del primer destino, sólo para mostrar la línea de ruta. */
  firstDestination?: string;
  /** Si la ruta es del propio usuario; el padre puede excluirla antes. */
  isOwn?: boolean;
}

/**
 * Props del mapa de descubrimiento del cliente. Mantiene compatibilidad con
 * `MapMockup` (misma misión propia) y añade descubrimiento de rutas abiertas.
 */
export interface ClientDiscoveryMapProps {
  isTracking?: boolean;
  isProgrammed?: boolean;
  isOpenRoute?: boolean;
  originSet?: boolean;
  destinations?: string[];
  /** Origen de la propia misión del cliente (se geocodifica para pintar la ruta). */
  originAddress?: string;
  /** Rutas abiertas de OTROS clientes. */
  openRoutes?: OpenSharedRouteMapItem[];
  /** Marcador resaltado (devuelto por `onSelectRoute`). */
  selectedRouteId?: string | null;
  /** Tap en un marcador (para abrir el preview en la UI padre). */
  onSelectRoute?: (id: string) => void;
  /**
   * Posición en vivo del transportista asignado (`requests/{id}.carrierLocation`).
   * Si está presente, se pinta un marcador 🚚 que sigue la lng/lat (no se queda
   * fijo en pantalla al mover el mapa).
   */
  carrierLngLat?: [number, number] | null;
  /**
   * Si `true` (por defecto), el mapa pinta una viñeta oscura del 35% inferior
   * para fundir suavemente con el sheet del formulario. Pasar `false` cuando
   * el mapa está a pantalla completa: si no, se ve como un rectángulo negro.
   */
  bottomFade?: boolean;
  /**
   * Espacio extra desde la base del mapa (p. ej. altura del pill «Cerrar mapa»)
   * para que el panel ETA no se solape con los controles del padre.
   */
  bottomChromeInsetPx?: number;
  /**
   * Sin Mapbox, `MapMockup` animaba un camión ficticio al hacer seguimiento.
   * Con Firestore en vivo debe ser `true` para no mostrar esa animación.
   */
  suppressMockCarrier?: boolean;
}
