/**
 * Mapbox GL JS (web): misión en azul (como cliente: recogida → paradas); tramo activo
 * transportista → siguiente objetivo en amarillo; chip con duración, distancia y llegada ~hora.
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getMapboxAccessToken,
  isMapboxConfigured,
  mapboxStyleUri,
  MAPBOX_DEFAULT_CENTER,
  MAPBOX_DEFAULT_ZOOM_IDLE,
} from '../config/mapbox';
import type { AppPalette } from '../theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { geocodeInOrder } from '../services/mapbox/geocodeCache';
import {
  fetchDrivingRoute,
  formatDistanceM,
  formatDurationSec,
  type DirectionsResult,
} from '../services/mapbox/directions';
import { useT } from '../i18n/useT';
import { useAppStore } from '../store/appStore';
import { haversineDistanceM } from '../utils/carrierOpenJobPopup';
import { formatApproxEtaClock } from '../utils/formatApproxEtaClock';
import { removeMapboxAttributionFromContainer } from '../utils/mapboxWebAttribution';
import {
  computeWebEtaChipLayout,
  createWebMapOverlayStyleSheet,
  webCarrierTruckMarkerEl,
  webOriginMarkerEl,
  webParadaLabelMarkerEl,
} from '../utils/mapboxWebUi';
import MapMockup from './MapMockup';
import type { CarrierRouteMapProps } from './CarrierRouteMap.types';

const MISSION_SOURCE_ID = 'carrier-mission-route';
const MISSION_LAYER_ID = 'carrier-mission-line';
const CARRIER_LEG_SOURCE_ID = 'carrier-carrier-leg';
const CARRIER_LEG_LAYER_ID = 'carrier-carrier-leg-line';

/** Transportista ~dentro de la parada durante este tiempo → siguiente objetivo (misma lógica que el mapa cliente). */
const NEAR_STOP_METERS = 120;
const DWELL_AT_STOP_MS = 9500;

function mapStyleReady(map: mapboxgl.Map | null): boolean {
  if (!map) return false;
  try {
    return map.isStyleLoaded();
  } catch {
    return false;
  }
}

function removeCarrierMissionLayers(map: mapboxgl.Map): void {
  try {
    if (map.getLayer(CARRIER_LEG_LAYER_ID)) map.removeLayer(CARRIER_LEG_LAYER_ID);
    if (map.getSource(CARRIER_LEG_SOURCE_ID)) map.removeSource(CARRIER_LEG_SOURCE_ID);
    if (map.getLayer(MISSION_LAYER_ID)) map.removeLayer(MISSION_LAYER_ID);
    if (map.getSource(MISSION_SOURCE_ID)) map.removeSource(MISSION_SOURCE_ID);
  } catch {
    /* ignore */
  }
}

function ensureMapboxWorker(): void {
  if (typeof window === 'undefined') return;
  mapboxgl.workerUrl = `${window.location.origin}/mapbox-gl-csp-worker.js`;
}

function carrierRadarIdleElement(t: AppPalette): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.width = '128px';
  wrap.style.height = '128px';
  wrap.style.pointerEvents = 'none';
  wrap.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('div');
  ring.style.position = 'absolute';
  ring.style.left = '50%';
  ring.style.top = '50%';
  ring.style.transform = 'translate(-50%, -50%)';
  ring.style.width = '112px';
  ring.style.height = '112px';
  ring.style.borderRadius = '50%';
  ring.style.boxSizing = 'border-box';
  ring.style.border = `2px solid ${t.electricBlue}`;
  ring.style.opacity = '0.35';

  const dot = document.createElement('div');
  dot.style.position = 'absolute';
  dot.style.left = '50%';
  dot.style.top = '50%';
  dot.style.transform = 'translate(-50%, -50%)';
  dot.style.width = '16px';
  dot.style.height = '16px';
  dot.style.borderRadius = '8px';
  dot.style.backgroundColor = t.electricBlue;
  dot.style.border = `2px solid ${t.borderStrong}`;
  dot.style.boxShadow = `0 0 14px ${t.electricBlue}aa`;
  dot.style.zIndex = '1';

  wrap.appendChild(ring);
  wrap.appendChild(dot);
  return wrap;
}

type InnerProps = CarrierRouteMapProps;

function CarrierRouteMapboxInner({
  isTracking = false,
  isProgrammed = false,
  isOpenRoute = false,
  originSet = false,
  destinations = [],
  originAddress,
  carrierStartLngLat = null,
  bottomFade = true,
  bottomChromeInsetPx = 0,
  etaChipBottomAdjustPx = 0,
}: InnerProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createWebMapOverlayStyleSheet(theme), [theme]);
  const tr = useT();
  const colorScheme = useAppStore((s) => s.colorScheme);
  const lang = useAppStore((s) => s.lang);
  const insets = useSafeAreaInsets();
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [styleReady, setStyleReady] = useState(false);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const idleCarrierMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const destKey = useMemo(() => destinations.join('\n'), [destinations]);
  const carrierKey = useMemo(
    () =>
      carrierStartLngLat && carrierStartLngLat.length >= 2
        ? `${carrierStartLngLat[0]},${carrierStartLngLat[1]}`
        : '',
    [carrierStartLngLat]
  );
  const [geoloading, setGeoloading] = useState(false);
  const [missionCoords, setMissionCoords] = useState<[number, number][]>([]);
  const [missionGeometry, setMissionGeometry] = useState<GeoJSON.LineString | null>(null);

  const missionCoordsKey = useMemo(
    () => missionCoords.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join('|'),
    [missionCoords]
  );

  const [etaTargetIdx, setEtaTargetIdx] = useState<number | null>(null);
  const [etaLegFinished, setEtaLegFinished] = useState(false);
  const dwellNearSinceRef = useRef<number | null>(null);

  const [carrierLegDirections, setCarrierLegDirections] = useState<DirectionsResult | null>(null);
  /** Fuerza recalculo de la hora «llegada ~» cada minuto (reloj local). */
  const [etaClockTick, setEtaClockTick] = useState(0);

  const hasCarrier = Boolean(carrierKey && carrierStartLngLat);

  const clearDomMarkers = useCallback(() => {
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
  }, []);

  useEffect(() => {
    const token = getMapboxAccessToken();
    if (!token || !mapContainer) return;

    ensureMapboxWorker();
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer,
      style: mapboxStyleUri(colorScheme),
      center: MAPBOX_DEFAULT_CENTER,
      zoom: MAPBOX_DEFAULT_ZOOM_IDLE,
      attributionControl: false,
      dragRotate: false,
      pitch: 0,
      maxPitch: 0,
      touchPitch: false,
    });

    /** Inferior derecha: los controles propios van arriba (perfil / ayuda / servicio). */
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    const stripAttrib = () => removeMapboxAttributionFromContainer(map.getContainer());
    map.on('styledata', stripAttrib);

    const onLoad = () => {
      stripAttrib();
      setStyleReady(true);
    };
    map.once('load', onLoad);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => map.resize()) : null;
    ro?.observe(mapContainer);

    return () => {
      map.off('styledata', stripAttrib);
      setStyleReady(false);
      ro?.disconnect();
      idleCarrierMarkerRef.current?.remove();
      idleCarrierMarkerRef.current = null;
      clearDomMarkers();
      try {
        removeCarrierMissionLayers(map);
        map.remove();
      } catch {
        try {
          map.remove();
        } catch {
          /* ignore */
        }
      }
      mapRef.current = null;
    };
  }, [mapContainer, clearDomMarkers, colorScheme]);

  useEffect(() => {
    setEtaLegFinished(false);
    dwellNearSinceRef.current = null;
    if (missionCoords.length >= 1) setEtaTargetIdx(0);
    else setEtaTargetIdx(null);
  }, [missionCoordsKey, missionCoords.length]);

  useEffect(() => {
    if (!isTracking || etaLegFinished || etaTargetIdx === null || missionCoords.length === 0) return;

    const step = () => {
      if (!carrierStartLngLat) return;
      const target = missionCoords[etaTargetIdx];
      if (!target) return;
      const d = haversineDistanceM(carrierStartLngLat, target);
      if (d <= NEAR_STOP_METERS) {
        if (dwellNearSinceRef.current === null) dwellNearSinceRef.current = Date.now();
        else if (Date.now() - dwellNearSinceRef.current >= DWELL_AT_STOP_MS) {
          dwellNearSinceRef.current = null;
          if (etaTargetIdx >= missionCoords.length - 1) setEtaLegFinished(true);
          else setEtaTargetIdx((k) => (k === null ? null : k + 1));
        }
      } else {
        dwellNearSinceRef.current = null;
      }
    };

    const id = setInterval(step, 2000);
    step();
    return () => clearInterval(id);
  }, [isTracking, etaLegFinished, etaTargetIdx, missionCoordsKey, carrierStartLngLat, missionCoords]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (
      !isTracking ||
      etaLegFinished ||
      etaTargetIdx === null ||
      !carrierStartLngLat ||
      missionCoords.length === 0 ||
      !missionCoords[etaTargetIdx]
    ) {
      setCarrierLegDirections(null);
      return () => {
        cancelled = true;
      };
    }
    const targetStop = missionCoords[etaTargetIdx];
    const dlng = carrierStartLngLat[0] - targetStop[0];
    const dlat = carrierStartLngLat[1] - targetStop[1];
    if (dlng * dlng + dlat * dlat < 1e-12) {
      setCarrierLegDirections(null);
      return () => {
        cancelled = true;
      };
    }
    timer = setTimeout(() => {
      void (async () => {
        try {
          const dr = await fetchDrivingRoute([carrierStartLngLat!, targetStop]);
          if (cancelled) return;
          setCarrierLegDirections(dr && Number.isFinite(dr.durationSec) && dr.durationSec > 0 ? dr : null);
        } catch {
          if (!cancelled) setCarrierLegDirections(null);
        }
      })();
    }, 550);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isTracking, carrierStartLngLat, missionCoords, missionCoordsKey, etaTargetIdx, etaLegFinished]);

  useEffect(() => {
    let cancelled = false;
    if (!originSet || geoloading) {
      return () => {
        cancelled = true;
      };
    }
    if (missionCoords.length < 2) {
      setMissionGeometry(null);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const dr = await fetchDrivingRoute(missionCoords);
      if (cancelled) return;
      setMissionGeometry(dr?.geometry ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [originSet, geoloading, missionCoordsKey, missionCoords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady) return;

    if (originSet) {
      idleCarrierMarkerRef.current?.remove();
      idleCarrierMarkerRef.current = null;
      return;
    }

    removeCarrierMissionLayers(map);
    clearDomMarkers();

    if (!carrierStartLngLat || carrierStartLngLat.length < 2) {
      idleCarrierMarkerRef.current?.remove();
      idleCarrierMarkerRef.current = null;
      map.flyTo({
        center: MAPBOX_DEFAULT_CENTER,
        zoom: MAPBOX_DEFAULT_ZOOM_IDLE,
        duration: 600,
      });
      return;
    }

    if (!idleCarrierMarkerRef.current) {
      idleCarrierMarkerRef.current = new mapboxgl.Marker({
        element: carrierRadarIdleElement(theme),
        anchor: 'center',
      })
        .setLngLat(carrierStartLngLat)
        .addTo(map);
      map.flyTo({
        center: carrierStartLngLat,
        zoom: Math.max(MAPBOX_DEFAULT_ZOOM_IDLE, 13.2),
        duration: 650,
      });
      return;
    }

    idleCarrierMarkerRef.current.setLngLat(carrierStartLngLat);
  }, [originSet, styleReady, carrierKey, carrierStartLngLat, clearDomMarkers, theme]);

  useEffect(() => {
    let cancelled = false;

    if (!originSet) {
      setGeoloading(false);
      setMissionCoords([]);
      return () => {
        cancelled = true;
      };
    }

    const ordered: string[] = [];
    const o = originAddress?.trim();
    if (o) ordered.push(o);
    for (const d of destinations) {
      const t = d.trim();
      if (t) ordered.push(t);
    }

    if (ordered.length === 0) {
      setMissionCoords([]);
      setGeoloading(false);
      return () => {
        cancelled = true;
      };
    }

    const handle = setTimeout(() => {
      if (cancelled) return;
      setGeoloading(true);
      void (async () => {
        const raw = await geocodeInOrder(ordered);
        if (cancelled) return;
        const pts = raw.filter((x): x is [number, number] => x != null);
        setMissionCoords(pts);
        setGeoloading(false);
      })();
    }, 700);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [originSet, originAddress, destKey, destinations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !mapStyleReady(map)) return;

    if (!originSet) return;

    if (geoloading) return;

    removeCarrierMissionLayers(map);
    clearDomMarkers();

    const lineCoords: [number, number][] =
      (missionGeometry?.coordinates as [number, number][] | undefined) ?? missionCoords;

    if (lineCoords.length >= 2) {
      try {
        map.addSource(MISSION_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lineCoords },
          },
        });
        map.addLayer({
          id: MISSION_LAYER_ID,
          type: 'line',
          source: MISSION_SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': theme.electricBlue,
            'line-width': 4,
            'line-opacity': 0.85,
            ...(isOpenRoute ? { 'line-dasharray': [2, 2] } : {}),
          } as mapboxgl.LinePaint,
        });
      } catch {
        removeCarrierMissionLayers(map);
      }
    }

    if (
      isTracking &&
      carrierLegDirections?.geometry &&
      carrierLegDirections.geometry.coordinates.length >= 2
    ) {
      try {
        map.addSource(CARRIER_LEG_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: carrierLegDirections.geometry,
          },
        });
        map.addLayer({
          id: CARRIER_LEG_LAYER_ID,
          type: 'line',
          source: CARRIER_LEG_SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#f59e0b',
            'line-width': 5,
            'line-opacity': 0.9,
            'line-dasharray': [1.8, 2],
          } as mapboxgl.LinePaint,
        });
      } catch {
        try {
          if (map.getLayer(CARRIER_LEG_LAYER_ID)) map.removeLayer(CARRIER_LEG_LAYER_ID);
          if (map.getSource(CARRIER_LEG_SOURCE_ID)) map.removeSource(CARRIER_LEG_SOURCE_ID);
        } catch {
          /* ignore */
        }
      }
    }

    const bounds = new mapboxgl.LngLatBounds(
      lineCoords[0] ?? MAPBOX_DEFAULT_CENTER,
      lineCoords[0] ?? MAPBOX_DEFAULT_CENTER
    );
    for (const c of lineCoords) bounds.extend(c);
    for (const c of missionCoords) bounds.extend(c);
    if (hasCarrier && carrierStartLngLat) bounds.extend(carrierStartLngLat as [number, number]);

    try {
      if (lineCoords.length >= 2 || missionCoords.length > 0 || hasCarrier) {
        map.fitBounds(bounds, { padding: 56, maxZoom: 14.5, duration: 650 });
      } else {
        map.flyTo({ center: MAPBOX_DEFAULT_CENTER, zoom: 11, duration: 500 });
      }
    } catch {
      map.flyTo({ center: MAPBOX_DEFAULT_CENTER, zoom: 11, duration: 500 });
    }

    if (hasCarrier && carrierStartLngLat) {
      const hm = new mapboxgl.Marker({ element: webCarrierTruckMarkerEl('Tú', theme) })
        .setLngLat(carrierStartLngLat)
        .addTo(map);
      markersRef.current.push(hm);
    }

    if (originAddress?.trim() && missionCoords[0]) {
      const om = new mapboxgl.Marker({ element: webOriginMarkerEl(isProgrammed, theme) })
        .setLngLat(missionCoords[0])
        .addTo(map);
      markersRef.current.push(om);
    }

    for (let i = 1; i < missionCoords.length; i++) {
      const m = new mapboxgl.Marker({ element: webParadaLabelMarkerEl(`Parada ${i}`, theme) })
        .setLngLat(missionCoords[i]!)
        .addTo(map);
      markersRef.current.push(m);
    }
  }, [
    missionGeometry,
    missionCoords,
    isProgrammed,
    isOpenRoute,
    isTracking,
    originAddress,
    carrierStartLngLat,
    hasCarrier,
    carrierLegDirections,
    clearDomMarkers,
    styleReady,
    originSet,
    geoloading,
    theme,
  ]);

  const showCarrierEtaChip =
    isTracking &&
    !etaLegFinished &&
    etaTargetIdx !== null &&
    carrierStartLngLat != null &&
    carrierLegDirections != null &&
    Number.isFinite(carrierLegDirections.durationSec) &&
    carrierLegDirections.durationSec > 0;

  useEffect(() => {
    if (!showCarrierEtaChip) return;
    const id = setInterval(() => setEtaClockTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [showCarrierEtaChip]);

  const chipTitle =
    etaTargetIdx !== null && missionCoords.length >= 2 && etaTargetIdx >= 1
      ? tr('clientHome.carrierEtaStopApprox', { n: etaTargetIdx })
      : tr('clientHome.carrierToPickupTitle');

  const etaArrivalClock = useMemo(() => {
    // `etaClockTick` se incrementa cada 60s en un useEffect aparte para forzar el recálculo
    // del reloj de llegada estimada y mantenerlo al día sin re-renders externos.
    void etaClockTick;
    if (!carrierLegDirections) return '';
    return formatApproxEtaClock(carrierLegDirections.durationSec, lang);
  }, [carrierLegDirections, lang, etaClockTick]);

  const { width: winW } = useWindowDimensions();
  const etaChipLayout = useMemo(
    () => computeWebEtaChipLayout(winW, insets.bottom, bottomChromeInsetPx, etaChipBottomAdjustPx),
    [winW, insets.bottom, bottomChromeInsetPx, etaChipBottomAdjustPx]
  );

  const chipAccessibilityLabel = useMemo(() => {
    if (!carrierLegDirections) return undefined;
    return [
      chipTitle,
      `${tr('carrierOpen.routeDurationLabel')}: ${formatDurationSec(carrierLegDirections.durationSec)}`,
      `${tr('carrierOpen.routeDistanceLabel')}: ${formatDistanceM(carrierLegDirections.distanceM)}`,
      `${tr('clientHome.carrierApproxArrivalLabel')}: ${etaArrivalClock}`,
      tr('clientHome.carrierEtaFootnote'),
    ].join('. ');
  }, [carrierLegDirections, chipTitle, etaArrivalClock, tr]);

  return (
    <View style={styles.root} pointerEvents="box-none">
      <div
        ref={setMapContainer}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        }}
      />
      {geoloading ? (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={theme.electricBlue} />
        </View>
      ) : null}

      {showCarrierEtaChip && carrierLegDirections ? (
        <View
          style={[styles.etaChip, etaChipLayout]}
          pointerEvents="none"
          accessible
          accessibilityLabel={chipAccessibilityLabel}
          accessibilityRole="text"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.etaTitle} accessible={false} allowFontScaling={false}>
            {chipTitle}
          </Text>
          <View style={styles.etaRow}>
            <Text style={styles.etaLabel} accessible={false} allowFontScaling={false}>
              {tr('carrierOpen.routeDurationLabel')}
            </Text>
            <Text style={styles.etaValue} accessible={false} allowFontScaling={false}>
              {formatDurationSec(carrierLegDirections.durationSec)}
            </Text>
          </View>
          <View style={styles.etaRow}>
            <Text style={styles.etaLabel} accessible={false} allowFontScaling={false}>
              {tr('carrierOpen.routeDistanceLabel')}
            </Text>
            <Text style={styles.etaValue} accessible={false} allowFontScaling={false}>
              {formatDistanceM(carrierLegDirections.distanceM)}
            </Text>
          </View>
          <View style={styles.etaRow}>
            <Text style={styles.etaLabel} accessible={false} allowFontScaling={false}>
              {tr('clientHome.carrierApproxArrivalLabel')}
            </Text>
            <Text style={styles.etaValue} accessible={false} allowFontScaling={false}>
              {etaArrivalClock}
            </Text>
          </View>
          <Text style={styles.etaFootnote} accessible={false} allowFontScaling={false}>
            {tr('clientHome.carrierEtaFootnote')}
          </Text>
        </View>
      ) : null}

      {bottomFade ? <View style={styles.vignette} pointerEvents="none" /> : null}
    </View>
  );
}

export default function CarrierRouteMap(props: CarrierRouteMapProps) {
  if (!isMapboxConfigured()) {
    const { bottomChromeInsetPx: _b, etaChipBottomAdjustPx: _e, ...rest } = props;
    return <MapMockup {...rest} />;
  }
  return <CarrierRouteMapboxInner {...props} />;
}
