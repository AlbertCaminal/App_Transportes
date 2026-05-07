/**
 * Quita logo Mapbox y el panel © Mapbox / © OpenStreetMap del DOM del mapa (solo web).
 * Usar junto con `attributionControl: false`. Las condiciones de uso de Mapbox pueden
 * exigir que la atribución aparezca en otro lugar de la aplicación.
 */
export function removeMapboxAttributionFromContainer(container: HTMLElement): void {
  try {
    container
      .querySelectorAll(
        '.mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib, .mapboxgl-compact-show-button, .mapboxgl-ctrl-attrib-button'
      )
      .forEach((node) => {
        node.remove();
      });
  } catch {
    /* ignore */
  }
}
