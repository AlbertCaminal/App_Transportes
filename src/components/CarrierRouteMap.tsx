import MapMockup from './MapMockup';
import type { CarrierRouteMapProps } from './CarrierRouteMap.types';

/** Implementación por defecto (iOS/Android/Jest). En web Metro usa `CarrierRouteMap.web.tsx`. */
export default function CarrierRouteMap({
  originAddress: _origin,
  carrierStartLngLat: _carrier,
  bottomChromeInsetPx: _b,
  etaChipBottomAdjustPx: _e,
  ...rest
}: CarrierRouteMapProps) {
  return <MapMockup {...rest} />;
}
