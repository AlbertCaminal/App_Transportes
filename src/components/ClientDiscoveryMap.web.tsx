/**
 * Mapa cliente (web): pinta la propia misión + marcadores de rutas abiertas
 * con `openRoutePreferred=true`. Al pulsar un marcador, emite `onSelectRoute`
 * para que el padre muestre el preview/CTA "Unirme con mi paquete".
 */
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ActivityIndicator, Text, useWindowDimensions } from 'react-native';

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
import { useAppStore } from '../store/appStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapMockup from './MapMockup';
import type { ClientDiscoveryMapProps, OpenSharedRouteMapItem } from './ClientDiscoveryMap.types';

const MISSION_SOURCE_ID = 'client-mission-route';
const MISSION_LAYER_ID = 'client-mission-line';
const SHARED_SOURCE_ID = 'client-shared-route';
const SHARED_LAYER_ID = 'client-shared-line';
const CARRIER_LEG_SOURCE_ID = 'client-carrier-leg';
const CARRIER_LEG_LAYER_ID = 'client-carrier-leg-line';

/** Referencias estables: los defaults `= []` en props crean un array nuevo cada render y disparan efectos en bucle. */
const EMPTY_DESTINATIONS: string[] = [];
const EMPTY_OPEN_ROUTES: OpenSharedRouteMapItem[] = [];

function mapStyleReady(map: mapboxgl.Map | null): boolean {
  if (!map) return false;
  try {
    return map.isStyleLoaded();
  } catch {
    return false;
  }
}

/** Transportista ~dentro de la parada durante este tiempo → parada completada y pasamos a la siguiente. */
const NEAR_STOP_METERS = 120;
const DWELL_AT_STOP_MS = 9500;

function ensureMapboxWorker(): void {
  if (typeof window === 'undefined') return;
  mapboxgl.workerUrl = `${window.location.origin}/mapbox-gl-csp-worker.js`;
}

function sharedRouteElement(active: boolean, t: AppPalette): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cursor = 'pointer';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.alignItems = 'center';
  wrap.style.width = '32px';
  wrap.style.height = '32px';
  wrap.style.borderRadius = '999px';
  wrap.style.background = active ? t.electricBlue : t.brandBlue;
  wrap.style.opacity = active ? '1' : '0.92';
  wrap.style.border = `2px solid ${t.mapSharedMarkerBorder}`;
  wrap.style.boxShadow = active ? `0 0 14px ${t.electricBlue}` : `0 0 6px ${t.brandBlue}80`;
  wrap.style.alignItems = 'center';
  wrap.style.justifyContent = 'center';
  wrap.style.fontFamily = 'system-ui, sans-serif';
  wrap.style.fontSize = '16px';
  wrap.textContent = '👥';
  return wrap;
}

function ClientDiscoveryMapInner({
  isTracking = false,
  isProgrammed = false,
  isOpenRoute = false,
  originSet = false,
  destinations = EMPTY_DESTINATIONS,
  originAddress,
  openRoutes = EMPTY_OPEN_ROUTES,
  selectedRouteId = null,
  onSelectRoute,
  carrierLngLat = null,
  bottomFade = true,
  bottomChromeInsetPx = 0,
}: ClientDiscoveryMapProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createWebMapOverlayStyleSheet(theme), [theme]);
  const tr = useT();
  const colorScheme = useAppStore((s) => s.colorScheme);
  const lang = useAppStore((s) => s.lang);
  const insets = useSafeAreaInsets();
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [styleReady, setStyleReady] = useState(false);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const missionMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const sharedMarkersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const carrierMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [missionGeoLoading, setMissionGeoLoading] = useState(false);
  const [missionCoords, setMissionCoords] = useState<[number, number][]>([]);
  const [missionGeometry, setMissionGeometry] = useState<GeoJSON.LineString | null>(null);
  /** Ruta drive-traffic transportista → parada activa + ETA. */
  const [carrierLegDirections, setCarrierLegDirections] = useState<DirectionsResult | null>(null);
  /**
   * Índice en `missionCoords` del próximo objetivo del ETA (origen/recogida = 0, entregas = 1…).
   * Siempre empieza en 0 para ir primero al punto de recogida; luego avanza por cada parada de entrega.
   */
  const [etaTargetIdx, setEtaTargetIdx] = useState<number | null>(null);
  /** Tras completar la última parada geocodificada ya no mostramos ETA. */
  const [etaLegFinished, setEtaLegFinished] = useState(false);
  const dwellNearSinceRef = useRef<number | null>(null);
  const [etaClockTick, setEtaClockTick] = useState(0);

  const missionCoordsKey = useMemo(
    () => missionCoords.map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join('|'),
    [missionCoords]
  );

  const [sharedGeo, setSharedGeo] = useState<
    Map<string, { origin: [number, number]; firstDestination?: [number, number] }>
  >(new Map());
  const [sharedGeometry, setSharedGeometry] = useState<GeoJSON.LineString | null>(null);

  const destKey = useMemo(() => destinations.join('\n'), [destinations]);
  const openRoutesKey = useMemo(
    () => openRoutes.map((r) => `${r.id}:${r.origin}|${r.firstDestination ?? ''}`).join('\n'),
    [openRoutes]
  );

  // Inicializa el mapa una vez.
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
    /** Esquina inferior derecha: evita solaparse con los FAB superiores (perfil / ayuda). */
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    mapRef.current = map;

    const stripAttrib = () => removeMapboxAttributionFromContainer(map.getContainer());
    map.on('styledata', stripAttrib);
    map.once('load', () => {
      stripAttrib();
      setStyleReady(true);
    });
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            try {
              if (mapRef.current !== map) return;
              if (!mapStyleReady(map)) return;
              map.resize();
            } catch {
              /* mapa retirado del DOM */
            }
          })
        : null;
    ro?.observe(mapContainer);

    /**
     * Snapshot del Map de markers compartidos. Capturamos la referencia al objeto
     * Map dentro del effect para que el cleanup no dependa de `sharedMarkersRef.current`
     * (la regla `react-hooks/exhaustive-deps` advierte que el `.current` puede haber
     * cambiado entre el setup y el cleanup). El Map en sí es persistente, así que
     * `.values()` en el cleanup sigue devolviendo los markers actuales.
     */
    const sharedMarkers = sharedMarkersRef.current;
    return () => {
      map.off('styledata', stripAttrib);
      setStyleReady(false);
      ro?.disconnect();
      try {
        for (const m of missionMarkersRef.current) m.remove();
      } catch {
        /* ignore */
      }
      missionMarkersRef.current = [];
      try {
        for (const m of sharedMarkers.values()) m.remove();
      } catch {
        /* ignore */
      }
      sharedMarkers.clear();
      try {
        carrierMarkerRef.current?.remove();
      } catch {
        /* ignore */
      }
      carrierMarkerRef.current = null;
      try {
        if (mapRef.current === map) {
          if (mapStyleReady(map)) {
            if (map.getLayer(MISSION_LAYER_ID)) map.removeLayer(MISSION_LAYER_ID);
            if (map.getSource(MISSION_SOURCE_ID)) map.removeSource(MISSION_SOURCE_ID);
            if (map.getLayer(SHARED_LAYER_ID)) map.removeLayer(SHARED_LAYER_ID);
            if (map.getSource(SHARED_SOURCE_ID)) map.removeSource(SHARED_SOURCE_ID);
            if (map.getLayer(CARRIER_LEG_LAYER_ID)) map.removeLayer(CARRIER_LEG_LAYER_ID);
            if (map.getSource(CARRIER_LEG_SOURCE_ID)) map.removeSource(CARRIER_LEG_SOURCE_ID);
          }
          map.remove();
        }
      } catch {
        try {
          map.remove();
        } catch {
          /* ignore */
        }
      }
      mapRef.current = null;
    };
  }, [mapContainer, colorScheme]);

  /**
   * Marcador del transportista en vivo. Se posiciona con `setLngLat`, no en
   * coordenadas de pantalla, así que sigue al mapa cuando el usuario lo mueve.
   * Se actualiza in-place (sin recrear el DOM) cada vez que llega una nueva
   * posición de Firestore.
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !mapStyleReady(map)) return;
    if (!carrierLngLat) {
      carrierMarkerRef.current?.remove();
      carrierMarkerRef.current = null;
      return;
    }
    try {
      if (!carrierMarkerRef.current) {
        const el = webCarrierTruckMarkerEl('Transportista', theme);
        carrierMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat(carrierLngLat).addTo(map);
      } else {
        carrierMarkerRef.current.setLngLat(carrierLngLat);
      }
    } catch {
      try {
        carrierMarkerRef.current?.remove();
      } catch {
        /* ignore */
      }
      carrierMarkerRef.current = null;
    }
  }, [carrierLngLat, styleReady, theme]);

  useEffect(() => {
    setEtaLegFinished(false);
    dwellNearSinceRef.current = null;
    if (missionCoords.length >= 1) setEtaTargetIdx(0);
    else setEtaTargetIdx(null);
  }, [missionCoordsKey, missionCoords.length]);

  /** Proximidad + permanencia en la parada → siguiente objetivo o fin del ETA. */
  useEffect(() => {
    if (!isTracking || etaLegFinished || etaTargetIdx === null || missionCoords.length === 0) return;

    const step = () => {
      if (!carrierLngLat) return;
      const target = missionCoords[etaTargetIdx];
      if (!target) return;
      const d = haversineDistanceM(carrierLngLat, target);
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
  }, [isTracking, etaLegFinished, etaTargetIdx, missionCoordsKey, carrierLngLat, missionCoords]);

  /** Ruta por carretera: transportista → parada activa (`missionCoords[etaTargetIdx]`). */
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (
      etaLegFinished ||
      etaTargetIdx === null ||
      !carrierLngLat ||
      missionCoords.length === 0 ||
      !missionCoords[etaTargetIdx]
    ) {
      setCarrierLegDirections(null);
      return () => {
        cancelled = true;
      };
    }
    const targetStop = missionCoords[etaTargetIdx];
    const dlng = carrierLngLat[0] - targetStop[0];
    const dlat = carrierLngLat[1] - targetStop[1];
    if (dlng * dlng + dlat * dlat < 1e-12) {
      setCarrierLegDirections(null);
      return () => {
        cancelled = true;
      };
    }
    timer = setTimeout(() => {
      void (async () => {
        try {
          const dr = await fetchDrivingRoute([carrierLngLat, targetStop]);
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
  }, [carrierLngLat, missionCoords, missionCoordsKey, etaTargetIdx, etaLegFinished]);

  // Geocodifica la propia misión + Directions opcional.
  // Debounce 700 ms: si no, escribir manualmente la dirección dispara una
  // petición por cada tecla. Tras pausar (o elegir una sugerencia, que
  // precachea la respuesta), se hace 1 sola petición al backend.
  useEffect(() => {
    let cancelled = false;
    if (!originSet) {
      setMissionCoords([]);
      setMissionGeometry(null);
      setMissionGeoLoading(false);
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
      setMissionGeometry(null);
      setMissionGeoLoading(false);
      return () => {
        cancelled = true;
      };
    }
    const handle = setTimeout(() => {
      if (cancelled) return;
      setMissionGeoLoading(true);
      void (async () => {
        const raw = await geocodeInOrder(ordered);
        if (cancelled) return;
        const pts = raw.filter((x): x is [number, number] => x != null);
        setMissionCoords(pts);
        if (pts.length >= 2) {
          const dr = await fetchDrivingRoute(pts);
          if (cancelled) return;
          setMissionGeometry(dr?.geometry ?? null);
        } else {
          setMissionGeometry(null);
        }
        setMissionGeoLoading(false);
      })();
    }, 700);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [originSet, originAddress, destKey]); // eslint-disable-line react-hooks/exhaustive-deps -- `destinations` codificado en `destKey`; la ref del array puede cambiar cada render sin cambiar el contenido.

  // Geocodifica las rutas abiertas (origen + primer destino).
  // Dep.: sólo `openRoutesKey` — la referencia de `openRoutes` puede cambiar cada render con el mismo contenido.
  useEffect(() => {
    let cancelled = false;
    if (openRoutes.length === 0) {
      setSharedGeo((prev) => (prev.size === 0 ? prev : new Map()));
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const next = new Map<string, { origin: [number, number]; firstDestination?: [number, number] }>();
      for (const r of openRoutes) {
        const inputs = [r.origin, ...(r.firstDestination ? [r.firstDestination] : [])];
        const geo = await geocodeInOrder(inputs);
        if (cancelled) return;
        const origin = geo[0];
        if (!origin) continue;
        const firstDest = geo[1] ?? undefined;
        next.set(r.id, { origin, firstDestination: firstDest ?? undefined });
      }
      if (!cancelled) setSharedGeo(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [openRoutesKey]); // eslint-disable-line react-hooks/exhaustive-deps -- `openRoutes` alineado con `openRoutesKey`; incluir la ref del array reintroduce el bucle infinito.

  // Trayecto de la ruta abierta seleccionada (Directions).
  useEffect(() => {
    let cancelled = false;
    if (!selectedRouteId) {
      setSharedGeometry(null);
      return () => {
        cancelled = true;
      };
    }
    const g = sharedGeo.get(selectedRouteId);
    if (!g || !g.firstDestination) {
      setSharedGeometry(null);
      return () => {
        cancelled = true;
      };
    }
    void (async () => {
      const dr = await fetchDrivingRoute([g.origin, g.firstDestination!]);
      if (cancelled) return;
      setSharedGeometry(dr?.geometry ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedRouteId, sharedGeo]);

  // Pinta la misión propia (línea + marcadores).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !mapStyleReady(map)) return;

    try {
      if (map.getLayer(MISSION_LAYER_ID)) map.removeLayer(MISSION_LAYER_ID);
      if (map.getSource(MISSION_SOURCE_ID)) map.removeSource(MISSION_SOURCE_ID);
      for (const m of missionMarkersRef.current) m.remove();
      missionMarkersRef.current = [];

      if (!originSet || missionGeoLoading) {
        return;
      }
      if (missionCoords.length === 0) return;

      const line: [number, number][] =
        (missionGeometry?.coordinates as [number, number][] | undefined) ?? missionCoords;

      if (line.length >= 2) {
        map.addSource(MISSION_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: line },
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
      }

      const om = new mapboxgl.Marker({ element: webOriginMarkerEl(isProgrammed, theme) })
        .setLngLat(missionCoords[0])
        .addTo(map);
      missionMarkersRef.current.push(om);
      for (let i = 1; i < missionCoords.length; i++) {
        const m = new mapboxgl.Marker({ element: webParadaLabelMarkerEl(`Parada ${i}`, theme) })
          .setLngLat(missionCoords[i])
          .addTo(map);
        missionMarkersRef.current.push(m);
      }
    } catch {
      /* style/map retirado durante el efecto */
    }
  }, [
    styleReady,
    originSet,
    missionGeoLoading,
    missionCoords,
    missionGeometry,
    isOpenRoute,
    isProgrammed,
    theme,
  ]);

  /**
   * Trayecto transportista → recogida (encima de la línea de misión para que se vea bien).
   */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !mapStyleReady(map)) return;

    const removeLeg = () => {
      try {
        if (map.getLayer(CARRIER_LEG_LAYER_ID)) map.removeLayer(CARRIER_LEG_LAYER_ID);
        if (map.getSource(CARRIER_LEG_SOURCE_ID)) map.removeSource(CARRIER_LEG_SOURCE_ID);
      } catch {
        /* ignore */
      }
    };

    try {
      removeLeg();
      const legGeom = carrierLegDirections?.geometry;
      if (!legGeom || legGeom.coordinates.length < 2) return;

      map.addSource(CARRIER_LEG_SOURCE_ID, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: legGeom,
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
      removeLeg();
    }

    return removeLeg;
  }, [styleReady, carrierLegDirections]);

  const showCarrierEtaChip =
    isTracking &&
    !etaLegFinished &&
    etaTargetIdx !== null &&
    carrierLngLat != null &&
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
    () => computeWebEtaChipLayout(winW, insets.bottom, bottomChromeInsetPx),
    [winW, insets.bottom, bottomChromeInsetPx]
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

  // Pinta los marcadores de rutas abiertas y, si hay seleccionada, la línea.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReady || !mapStyleReady(map)) return;

    try {
      const wanted = new Set(Array.from(sharedGeo.keys()));
      for (const [id, marker] of sharedMarkersRef.current.entries()) {
        if (!wanted.has(id)) {
          marker.remove();
          sharedMarkersRef.current.delete(id);
        }
      }
      for (const [id, geo] of sharedGeo.entries()) {
        const existing = sharedMarkersRef.current.get(id);
        const active = id === selectedRouteId;
        if (existing) {
          existing.getElement().style.background = active ? theme.electricBlue : theme.brandBlue;
          existing.getElement().style.opacity = active ? '1' : '0.92';
          existing.getElement().style.boxShadow = active
            ? `0 0 14px ${theme.electricBlue}`
            : `0 0 6px ${theme.brandBlue}80`;
          continue;
        }
        const el = sharedRouteElement(active, theme);
        el.addEventListener('click', () => {
          onSelectRoute?.(id);
        });
        const m = new mapboxgl.Marker({ element: el }).setLngLat(geo.origin).addTo(map);
        sharedMarkersRef.current.set(id, m);
      }

      if (map.getLayer(SHARED_LAYER_ID)) map.removeLayer(SHARED_LAYER_ID);
      if (map.getSource(SHARED_SOURCE_ID)) map.removeSource(SHARED_SOURCE_ID);

      if (selectedRouteId && sharedGeometry && sharedGeometry.coordinates.length >= 2) {
        map.addSource(SHARED_SOURCE_ID, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: sharedGeometry,
          },
        });
        map.addLayer({
          id: SHARED_LAYER_ID,
          type: 'line',
          source: SHARED_SOURCE_ID,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': theme.brandBlue,
            'line-width': 5,
            'line-opacity': 0.95,
            'line-dasharray': [2, 1.5],
          } as mapboxgl.LinePaint,
        });

        const bounds = new mapboxgl.LngLatBounds(
          sharedGeometry.coordinates[0] as [number, number],
          sharedGeometry.coordinates[0] as [number, number]
        );
        for (const c of sharedGeometry.coordinates) bounds.extend(c as [number, number]);
        try {
          map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 });
        } catch {
          /* ignore */
        }
      }
    } catch {
      /* mapa desmontado */
    }
  }, [styleReady, sharedGeo, selectedRouteId, sharedGeometry, onSelectRoute, theme]);

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
      {missionGeoLoading ? (
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

// Necesario para el fallback en `OpenSharedRouteMapItem`-import remoto, evita error TS si no se usa.
export type { OpenSharedRouteMapItem };

export default function ClientDiscoveryMap(props: ClientDiscoveryMapProps) {
  if (!isMapboxConfigured()) {
    const {
      openRoutes: _openRoutes,
      selectedRouteId: _sel,
      onSelectRoute: _ev,
      carrierLngLat: _carrierLngLat,
      bottomChromeInsetPx: _bottomChromeInsetPx,
      suppressMockCarrier = false,
      ...rest
    } = props;
    return <MapMockup {...rest} suppressMockCarrier={suppressMockCarrier} />;
  }
  const { suppressMockCarrier: _suppressMockCarrier, ...rest } = props;
  return <ClientDiscoveryMapInner {...rest} />;
}
