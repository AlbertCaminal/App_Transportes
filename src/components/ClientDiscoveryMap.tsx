import MapMockup from './MapMockup';
import type { ClientDiscoveryMapProps } from './ClientDiscoveryMap.types';

/**
 * Implementación por defecto (iOS / Android / Jest): cae al mock SVG.
 * En web Metro usa `ClientDiscoveryMap.web.tsx`. El descubrimiento de
 * rutas abiertas con marcadores reales requiere Mapbox GL JS y por
 * ahora se entrega solo en web.
 */
export default function ClientDiscoveryMap({
  openRoutes: _openRoutes,
  selectedRouteId: _selectedRouteId,
  onSelectRoute: _onSelectRoute,
  originAddress: _originAddress,
  carrierLngLat: _carrierLngLat,
  suppressMockCarrier = false,
  ...rest
}: ClientDiscoveryMapProps) {
  return <MapMockup {...rest} suppressMockCarrier={suppressMockCarrier} />;
}
