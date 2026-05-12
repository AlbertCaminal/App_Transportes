import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  Radar,
  List,
  Power,
  Bell,
  MapPin,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  Settings,
  Calendar,
  Truck,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ChevronDown,
  HelpCircle,
  User,
  Package,
  Box,
  Wallet,
  Weight,
  ShieldCheck,
} from 'lucide-react-native';
import CarrierRouteMap from './CarrierRouteMap';
import LocationPermissionGate from './LocationPermissionGate';
import { getCarrierCopy } from './carrier/carrierCopy';
import { Language, CarrierData, PackagePhysicalSpec } from '../../shared/types';
import type { AppPalette } from '../theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useT } from '../i18n/useT';
import type { TranslationKey } from '../i18n';
import { useAppStore } from '../store/appStore';
import { isFirebaseConfigured } from '../config/firebase';
import {
  isMapboxConfigured,
  MAP_WEB_BOTTOM_CHROME_RESERVE_PX,
  MAP_WEB_COMPACT_SHEET_RESERVE_PX,
} from '../config/mapbox';
import {
  useSearchingCarrierRequests,
  useCarrierFirestoreRequests,
  useShippingRequestDocument,
} from '../hooks/useClientRequestSubscriptions';
import type { OpenCarrierRequestRow } from '../services/firestore/shippingRequestsQuery';
import {
  claimShippingRequestCallable,
  releaseShippingRequestCallable,
  messageForReleaseShippingRequestError,
} from '../services/firebase/shippingCallable';
import type { RequestRow } from '../services/firestore/clientRequests';
import { geocodeInOrder } from '../services/mapbox/geocodeCache';
import { getCurrentDevicePositionOnce, useDeviceLocation } from '../hooks/useDeviceLocation';
import { usePublishCarrierLocation } from '../hooks/usePublishCarrierLocation';
import {
  formatCargoSummaryFromRequest,
  formatPackageSpecsLine,
  getPackagePhotoUrlsFromRequest,
  getPrimarySpecsFromRequest,
} from '../utils/packageSpecsFormat';
import { formatVehicleSummary } from '../utils/vehicleDisplay';
import {
  formatShippingRequestRouteLine,
  getShippingRequestMapDestinations,
} from '../utils/openRequestFormat';
import {
  haversineDistanceM,
  loadCarrierPopupShownIds,
  pickLatestJobAmongIds,
  rememberCarrierPopupShown,
} from '../utils/carrierOpenJobPopup';

const DEMO_CARRIER_NOTIF_SESSION_KEY = 'barcelona-logistics:carrier-demo-notif:v1';

function formatKmForNotif(lang: Language, km: number): string {
  const localeTag = lang === 'en' ? 'en-GB' : lang === 'ca' ? 'ca-ES' : 'es-ES';
  return new Intl.NumberFormat(localeTag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(km);
}

interface Route {
  id: number;
  /** ID del documento `requests/*` que originó esta entrada (si viene de la nube). */
  requestId?: string;
  date: string;
  dateObj: Date;
  route: string;
  price: string;
  dims: PackagePhysicalSpec;
  status: 'pending' | 'confirmed';
}

interface Props {
  lang: Language;
  carrier: CarrierData;
  onOpenLegalHelp: () => void;
  onBack: () => void;
}

const { height: SCREEN_H } = Dimensions.get('window');

function messageForClaimError(
  e: unknown,
  tr: (key: TranslationKey, options?: Record<string, unknown>) => string
): string {
  const o = e as { code?: string; message?: string };
  const code = (o.code ?? '').toLowerCase();
  const msg = (o.message ?? '').toLowerCase();
  if (code === 'functions/unauthenticated' || code === 'unauthenticated') {
    return tr('carrierOpen.claimErrSignedOut');
  }
  if (code === 'functions/permission-denied' || /permission-denied/i.test(msg)) {
    if (/firestore-service-account/i.test(o.message ?? '')) {
      return tr('carrierOpen.claimErrFirestoreIam');
    }
    return tr('carrierOpen.claimErrPermission');
  }
  if (code === 'functions/aborted' || /concurrent-claim/i.test(msg)) {
    return tr('carrierOpen.claimErrConcurrent');
  }
  if (code === 'functions/failed-precondition' || /failed-precondition/i.test(msg)) {
    return tr('carrierOpen.claimErrGone');
  }
  if (code === 'functions/not-found') {
    return tr('carrierOpen.claimErrGone');
  }
  if (e instanceof Error && e.message === 'firebase/not-initialized') {
    return tr('carrierOpen.claimErrNotConfigured');
  }
  if (code === 'functions/internal' || /^internal$/i.test((o.message ?? '').trim())) {
    return tr('carrierOpen.claimErrInternal');
  }
  if (
    code.includes('network') ||
    msg.includes('network') ||
    msg.includes('fetch') ||
    code === 'functions/unavailable' ||
    code === 'functions/deadline-exceeded'
  ) {
    return tr('carrierOpen.claimErrNetwork');
  }
  if (
    typeof o.message === 'string' &&
    o.message.length > 12 &&
    __DEV__ &&
    !/^(internal|unknown error)$/i.test(o.message.trim())
  ) {
    return o.message;
  }
  return tr('carrierOpen.claimErr');
}

function CargoDimensionBars({
  spec,
  compact,
  theme,
}: {
  spec: PackagePhysicalSpec;
  compact?: boolean;
  theme: AppPalette;
}) {
  const { lengthCm, widthCm, heightCm } = spec;
  const maxEdge = Math.max(lengthCm, widthCm, heightCm, 1);
  const hMax = compact ? 32 : 72;
  const bars = [
    { k: 'L', v: lengthCm },
    { k: 'W', v: widthCm },
    { k: 'H', v: heightCm },
  ];
  return (
    <View style={{ gap: compact ? 6 : 12 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          height: compact ? 44 : 88,
          gap: compact ? 6 : 10,
        }}
      >
        {bars.map((b) => (
          <View key={b.k} style={{ flex: 1, alignItems: 'center' }}>
            <View
              style={{
                width: '100%',
                height: Math.max(8, (b.v / maxEdge) * hMax),
                backgroundColor: theme.electricBlue,
                borderRadius: compact ? 6 : 10,
              }}
            />
            <Text
              style={{
                marginTop: 4,
                fontSize: compact ? 10 : 12,
                fontWeight: '900',
                color: theme.textOnDarkMuted,
              }}
            >
              {b.k} {Math.round(b.v)}
            </Text>
          </View>
        ))}
      </View>
      {!compact ? (
        <Text style={{ fontSize: 11, fontWeight: '900', color: theme.white, textAlign: 'center' }}>
          {formatPackageSpecsLine(spec)}
        </Text>
      ) : null}
    </View>
  );
}

export default function CarrierHome({ lang, carrier, onOpenLegalHelp, onBack }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => carrierHomeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const sheetBottomAir = 8 + Math.min(insets.bottom, 12);
  const [isActive, setIsActive] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [view, setView] = useState<'radar' | 'board' | 'calendar'>('radar');
  /** Estado del mapa: compacto (cabecera) o expandido a pantalla completa. */
  const [mapExpanded, setMapExpanded] = useState(false);
  /** Alto real del contenedor raíz: evita una franja vacía debajo del mapa a pantalla completa en web. */
  const [rootLayoutH, setRootLayoutH] = useState(SCREEN_H);
  const mapHeightAnim = useRef(new RNAnimated.Value(MAP_H)).current;
  useEffect(() => {
    RNAnimated.timing(mapHeightAnim, {
      toValue: mapExpanded ? Math.max(rootLayoutH, MAP_H) : MAP_H,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [mapExpanded, mapHeightAnim, rootLayoutH]);
  // El calendario reemplaza al mapa: forzamos compacto al cambiar de vista.
  useEffect(() => {
    if (view === 'calendar') setMapExpanded(false);
  }, [view]);
  const toggleMapExpanded = useCallback(() => setMapExpanded((v) => !v), []);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const [routes, setRoutes] = useState<Route[]>([]);

  const confirmedRoutes = useMemo(() => routes.filter((r) => r.status === 'confirmed'), [routes]);

  const user = useAppStore((s) => s.user);
  const openAccountSettings = useAppStore((s) => s.openAccountSettings);
  const canUseOpenRequests = isFirebaseConfigured() && user != null;
  const tr = useT();

  const [notifPayload, setNotifPayload] = useState<{
    routeLine: string;
    price: string;
    distanceKm: number;
  } | null>(null);

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const handleOpenJobsAdded = useCallback(
    async ({ ids, rows }: { ids: string[]; rows: OpenCarrierRequestRow[] }) => {
      if (!isActiveRef.current) return;
      if (!isMapboxConfigured()) return;

      const shown = loadCarrierPopupShownIds();
      const rowById = new Map(rows.map((r) => [r.id, r]));
      const freshIds = ids.filter((id) => !shown.has(id));
      const expressFresh = freshIds.filter((id) => {
        const row = rowById.get(id) as Record<string, unknown> | undefined;
        return row?.['serviceType'] === 'express';
      });
      if (expressFresh.length === 0) return;

      const chosenId = pickLatestJobAmongIds(expressFresh, rows);
      if (!chosenId) return;

      const job = rowById.get(chosenId) as Record<string, unknown> | undefined;
      if (!job) return;

      const origin = String(job['origin'] ?? '').trim();
      if (!origin) return;

      const carrierPos = await getCurrentDevicePositionOnce();
      if (!carrierPos) return;

      const geocoded = await geocodeInOrder([origin]);
      const pickup = geocoded[0];
      if (!pickup) return;

      const distM = haversineDistanceM(carrierPos, pickup);
      if (distM > 10_000) return;

      rememberCarrierPopupShown(chosenId);
      const distanceKm = Math.round((distM / 1000) * 10) / 10;

      setNotifPayload({
        routeLine: formatShippingRequestRouteLine(job),
        price: String(job['priceFinal'] ?? job['priceFull'] ?? '—'),
        distanceKm,
      });
      setShowNotification(true);
    },
    []
  );

  const { rows: openJobs, error: openJobsError } = useSearchingCarrierRequests(canUseOpenRequests, {
    onOpenJobsAdded: handleOpenJobsAdded,
  });
  const [detailJob, setDetailJob] = useState<OpenCarrierRequestRow | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  /** Tras reclamar: recogida + paradas; lo consume el mapa real (Mapbox) o el mock. */
  const [assignedMapRoute, setAssignedMapRoute] = useState<{
    origin?: string;
    destinations: string[];
    programmed: boolean;
  } | null>(null);
  /** Pedido en curso tras reclamar desde la nube (publicación GPS para el cliente). */
  const [activeCarrierRequestId, setActiveCarrierRequestId] = useState<string | null>(null);

  /** Menú al pulsar una ruta activa: mapa o liberar asignación. */
  const [activeRouteMenu, setActiveRouteMenu] = useState<RequestRow | null>(null);
  const [releaseInFlightId, setReleaseInFlightId] = useState<string | null>(null);

  const carrierUid = user?.uid;
  const { rows: carrierFirestoreRows, ready: carrierFirestoreReady } = useCarrierFirestoreRequests(
    carrierUid,
    canUseOpenRequests
  );
  const primaryAssignedRequestId = useMemo(() => {
    for (const r of carrierFirestoreRows) {
      if (r.data['status'] === 'assigned') return r.id;
    }
    return null;
  }, [carrierFirestoreRows]);

  useEffect(() => {
    if (!canUseOpenRequests || !carrierFirestoreReady) return;

    if (!activeCarrierRequestId && primaryAssignedRequestId) {
      setActiveCarrierRequestId(primaryAssignedRequestId);
      setIsActive(true);
      setView('radar');
      setMapExpanded(true);
      return;
    }

    if (!activeCarrierRequestId) return;

    const row = carrierFirestoreRows.find((r) => r.id === activeCarrierRequestId);
    if (row != null && row.data['status'] !== 'assigned') {
      const releasedId = activeCarrierRequestId;
      setActiveCarrierRequestId(null);
      setAssignedMapRoute(null);
      setRoutes((prev) => prev.filter((r) => r.requestId !== releasedId));
    }
  }, [
    activeCarrierRequestId,
    canUseOpenRequests,
    carrierFirestoreReady,
    carrierFirestoreRows,
    primaryAssignedRequestId,
  ]);

  const assignedLiveEnabled = Boolean(isFirebaseConfigured() && activeCarrierRequestId);
  const { data: assignedRequestLive } = useShippingRequestDocument(
    activeCarrierRequestId,
    assignedLiveEnabled
  );
  const hadAssignedRequestLiveRef = useRef(false);
  useEffect(() => {
    if (!assignedLiveEnabled) {
      hadAssignedRequestLiveRef.current = false;
      return;
    }
    if (assignedRequestLive) {
      hadAssignedRequestLiveRef.current = true;
      return;
    }
    if (hadAssignedRequestLiveRef.current && assignedRequestLive === null) {
      setActiveCarrierRequestId(null);
      setAssignedMapRoute(null);
      hadAssignedRequestLiveRef.current = false;
      const title = tr('carrierOpen.shipmentCancelledTitle');
      const body = tr('carrierOpen.shipmentCancelledBody');
      if (Platform.OS === 'web') window.alert(`${title}\n\n${body}`);
      else Alert.alert(title, body, [{ text: tr('common.ok'), style: 'default' }]);
    }
  }, [assignedLiveEnabled, assignedRequestLive, tr]);

  useEffect(() => {
    if (!assignedLiveEnabled || !assignedRequestLive) return;
    setAssignedMapRoute((prev) => {
      if (prev != null) return prev;
      const snap = assignedRequestLive as Record<string, unknown>;
      return {
        origin: typeof snap['origin'] === 'string' ? (snap['origin'] as string) : undefined,
        destinations: getShippingRequestMapDestinations(snap),
        programmed: snap['serviceType'] === 'programmed',
      };
    });
  }, [assignedLiveEnabled, assignedRequestLive]);

  /** Si el documento pasa a otro estado (p. ej. liberación → searching_carrier), dejamos de centrar el mapa en él. */
  useEffect(() => {
    if (!assignedLiveEnabled || !assignedRequestLive) return;
    const st = assignedRequestLive['status'];
    if (typeof st === 'string' && st !== 'assigned') {
      setActiveCarrierRequestId(null);
      setAssignedMapRoute(null);
    }
  }, [assignedLiveEnabled, assignedRequestLive]);

  const activeAssignedRoutesForRadar = useMemo((): RequestRow[] => {
    const assigned = carrierFirestoreRows.filter((r) => r.data['status'] === 'assigned');
    if (assigned.length > 0) return assigned;
    if (
      canUseOpenRequests &&
      activeCarrierRequestId &&
      assignedRequestLive &&
      assignedRequestLive['status'] === 'assigned'
    ) {
      return [{ id: activeCarrierRequestId, data: assignedRequestLive as Record<string, unknown> }];
    }
    return [];
  }, [canUseOpenRequests, carrierFirestoreRows, activeCarrierRequestId, assignedRequestLive]);

  const deviceLoc = useDeviceLocation();
  const [locGateDismissed, setLocGateDismissed] = useState(false);

  useEffect(() => {
    if (!isActive) setLocGateDismissed(false);
  }, [isActive]);

  usePublishCarrierLocation(isActive ? activeCarrierRequestId : null, deviceLoc.position);

  /**
   * En servicio: GPS para radar en vivo y avisos de proximidad (antes sólo tras reclamar).
   * Importante: dependemos sólo de `requestDeviceLoc` (callback estable del hook,
   * envuelto en `useCallback([])`). Si pusiéramos `deviceLoc` entero, el efecto se
   * re-ejecutaría en cada render porque el hook devuelve un objeto literal nuevo
   * (`{ ...state, request, reset }`), reiniciando el intervalo de 55 s y disparando
   * peticiones de geolocation continuas.
   */
  const { request: requestDeviceLoc } = deviceLoc;
  useEffect(() => {
    if (!isActive) return;
    void requestDeviceLoc();
    const timer = setInterval(() => void requestDeviceLoc(), 55_000);
    return () => clearInterval(timer);
  }, [isActive, requestDeviceLoc]);

  useEffect(() => {
    if (canUseOpenRequests) return;
    if (!isActive) {
      setShowNotification(false);
      setNotifPayload(null);
      return;
    }
    if (Platform.OS === 'web') {
      try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(DEMO_CARRIER_NOTIF_SESSION_KEY)) {
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const timer = setTimeout(() => {
      if (Platform.OS === 'web') {
        try {
          sessionStorage?.setItem(DEMO_CARRIER_NOTIF_SESSION_KEY, '1');
        } catch {
          /* ignore */
        }
      }
      const pendingDemo = routes.filter((r) => r.status === 'pending');
      if (pendingDemo[0]) {
        const r = pendingDemo[0];
        setNotifPayload({
          routeLine: r.route,
          price: r.price,
          distanceKm: 1.4,
        });
      } else {
        setNotifPayload({
          routeLine: "Carrer d'Aragó",
          price: '+14,50€',
          distanceKm: 1.4,
        });
      }
      setShowNotification(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [canUseOpenRequests, isActive, routes]);

  const handleConfirmRoute = (route: Route) => {
    setRoutes((prev) => prev.map((r) => (r.id === route.id ? { ...r, status: 'confirmed' } : r)));
    const parts = route.route.split(/\s*➔\s*/);
    const origin = parts[0]?.trim() ?? '';
    const destinations = parts
      .slice(1)
      .map((p) => p.trim())
      .filter(Boolean);
    setAssignedMapRoute({
      origin: origin.length > 0 ? origin : undefined,
      destinations,
      programmed: false,
    });
    setView('radar');
    setIsActive(true);
    setMapExpanded(true);
  };

  const t = getCarrierCopy(lang);

  const openActiveRouteOnMap = useCallback((row: RequestRow) => {
    setActiveRouteMenu(null);
    setActiveCarrierRequestId(row.id);
    setIsActive(true);
    setView('radar');
    setMapExpanded(true);
  }, []);

  const executeReleaseActiveRoute = useCallback(
    async (requestId: string) => {
      if (!isFirebaseConfigured()) {
        const m = tr('carrierOpen.releaseRouteErrNotConfigured');
        if (Platform.OS === 'web') window.alert(m);
        else Alert.alert('', m);
        return;
      }
      setReleaseInFlightId(requestId);
      try {
        await releaseShippingRequestCallable(requestId);
        setActiveRouteMenu(null);
        setRoutes((prev) => prev.filter((r) => r.requestId !== requestId));
        setActiveCarrierRequestId((cur) => {
          if (cur === requestId) {
            setAssignedMapRoute(null);
            return null;
          }
          return cur;
        });
      } catch (e) {
        const userMsg = messageForReleaseShippingRequestError(e, tr);
        if (Platform.OS === 'web') window.alert(userMsg);
        else Alert.alert('', userMsg);
      } finally {
        setReleaseInFlightId(null);
      }
    },
    [tr]
  );

  const confirmReleaseActiveRoute = useCallback(
    (requestId: string) => {
      const run = () => void executeReleaseActiveRoute(requestId);
      if (Platform.OS === 'web') {
        const ok = window.confirm(
          `${tr('carrierOpen.releaseRouteConfirmTitle')}\n\n${tr('carrierOpen.releaseRouteConfirmMessage')}`
        );
        if (ok) run();
        return;
      }
      Alert.alert(tr('carrierOpen.releaseRouteConfirmTitle'), tr('carrierOpen.releaseRouteConfirmMessage'), [
        { text: tr('common.cancel'), style: 'cancel' },
        { text: tr('carrierOpen.releaseRouteConfirmOk'), style: 'destructive', onPress: run },
      ]);
    },
    [executeReleaseActiveRoute, tr]
  );

  const openJobDetail = (job: OpenCarrierRequestRow) => {
    setClaimError(null);
    setDetailJob(job);
  };

  const closeJobDetail = () => {
    setClaimError(null);
    setDetailJob(null);
  };

  const handleClaimOpen = async (requestId: string) => {
    setClaimError(null);
    if (!isFirebaseConfigured()) {
      const m = tr('carrierOpen.claimErrNotConfigured');
      setClaimError(m);
      if (Platform.OS === 'web') window.alert(m);
      else Alert.alert('', m);
      return;
    }
    const jobSnap = openJobs.find((j) => j.id === requestId) as Record<string, unknown> | undefined;
    setClaimingId(requestId);
    try {
      await claimShippingRequestCallable(requestId);
      setActiveCarrierRequestId(requestId.trim());
      if (jobSnap) {
        const line = formatShippingRequestRouteLine(jobSnap);
        const spec = getPrimarySpecsFromRequest(jobSnap) ?? {
          lengthCm: 50,
          widthCm: 35,
          heightCm: 28,
          weightKg: 9,
        };
        const price = String(jobSnap['priceFinal'] ?? jobSnap['priceFull'] ?? '—');
        const slot = String(jobSnap['timeSlot'] ?? '—');
        const dateObj = new Date();
        const claimedRequestId = requestId.trim();
        setRoutes((prev) => [
          ...prev.filter((r) => r.requestId !== claimedRequestId),
          {
            id: Date.now(),
            requestId: claimedRequestId,
            date: slot,
            dateObj,
            route: line,
            price,
            dims: spec,
            status: 'confirmed',
          },
        ]);
        setAssignedMapRoute({
          origin: typeof jobSnap['origin'] === 'string' ? (jobSnap['origin'] as string) : undefined,
          destinations: getShippingRequestMapDestinations(jobSnap),
          programmed: jobSnap['serviceType'] === 'programmed',
        });
      }
      setView('radar');
      setIsActive(true);
      setMapExpanded(true);
      setDetailJob(null);
    } catch (e) {
      const userMsg = messageForClaimError(e, tr);
      setClaimError(userMsg);
      if (Platform.OS === 'web') window.alert(userMsg);
      else Alert.alert('', userMsg);
    } finally {
      setClaimingId(null);
    }
  };

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const currentMonthDays = daysInMonth(calendarDate.getMonth(), calendarDate.getFullYear());
  const startOffset = firstDayOfMonth(calendarDate.getMonth(), calendarDate.getFullYear());

  const missionsForSelectedDay = useMemo(() => {
    return confirmedRoutes.filter(
      (r) =>
        r.dateObj.getDate() === selectedDay &&
        r.dateObj.getMonth() === calendarDate.getMonth() &&
        r.dateObj.getFullYear() === calendarDate.getFullYear()
    );
  }, [selectedDay, confirmedRoutes, calendarDate]);

  const hasMissionsOnDay = (day: number) =>
    confirmedRoutes.some(
      (r) =>
        r.dateObj.getDate() === day &&
        r.dateObj.getMonth() === calendarDate.getMonth() &&
        r.dateObj.getFullYear() === calendarDate.getFullYear()
    );

  const emptySlots = startOffset === 0 ? 6 : startOffset - 1;

  const showLocGate =
    isActive &&
    !locGateDismissed &&
    deviceLoc.position == null &&
    (deviceLoc.status === 'denied' || deviceLoc.status === 'unavailable');

  return (
    <View style={styles.root} onLayout={(e) => setRootLayoutH(e.nativeEvent.layout.height)}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={tr('common.back')}
        style={styles.carrierBackFloating}
      >
        <ChevronLeft color={theme.white} size={24} />
      </Pressable>

      {view !== 'calendar' ? (
        <RNAnimated.View style={[styles.mapSection, { height: mapHeightAnim }]}>
          <CarrierRouteMap
            isTracking={isActive}
            isOpenRoute={assignedMapRoute != null}
            isProgrammed={assignedMapRoute?.programmed ?? false}
            originSet={assignedMapRoute != null}
            originAddress={assignedMapRoute?.origin}
            destinations={assignedMapRoute?.destinations ?? []}
            carrierStartLngLat={deviceLoc.position}
            bottomFade={false}
            bottomChromeInsetPx={
              mapExpanded ? MAP_WEB_BOTTOM_CHROME_RESERVE_PX : MAP_WEB_COMPACT_SHEET_RESERVE_PX
            }
          />
          {isActive && deviceLoc.position == null && !showLocGate ? (
            <View style={styles.radarOverlay} pointerEvents="none">
              <RadarRipple styles={styles} />
            </View>
          ) : null}
          <View style={styles.mapHeader}>
            <View style={styles.profileChip}>
              <View style={styles.profileIcon}>
                <Truck color={theme.electricBlue} size={22} />
              </View>
              <View>
                <Text style={styles.profileMeta}>{formatVehicleSummary(carrier.vehicle)}</Text>
                <Text style={styles.profileName}>{carrier.name}</Text>
              </View>
            </View>
            <View style={styles.mapHeaderRight}>
              <Pressable
                onPress={openAccountSettings}
                accessibilityRole="button"
                accessibilityLabel={tr('accountSettings.title')}
                style={({ pressed }) => [styles.helpHeaderBtn, pressed && { opacity: 0.85 }]}
              >
                <User color={theme.white} size={24} />
              </Pressable>
              <Pressable
                onPress={onOpenLegalHelp}
                accessibilityRole="button"
                accessibilityLabel="Legal y ayuda"
                style={({ pressed }) => [styles.helpHeaderBtn, pressed && { opacity: 0.85 }]}
              >
                <HelpCircle color={theme.white} size={24} />
              </Pressable>
              <Pressable
                onPress={() => {
                  const next = !isActive;
                  setIsActive(next);
                  if (next) void deviceLoc.request();
                }}
                accessibilityRole="button"
                accessibilityLabel={isActive ? 'Desactivar servicio' : 'Activar servicio'}
                style={[styles.powerBtn, isActive ? styles.powerBtnOn : styles.powerBtnOff]}
              >
                <Power color={isActive ? '#fff' : theme.gray500} size={18} />
                <Text style={[styles.powerTxt, isActive && { color: '#fff' }]}>
                  {isActive ? t.active : t.inactive}
                </Text>
              </Pressable>
            </View>
          </View>
          {mapExpanded ? (
            <Pressable
              onPress={toggleMapExpanded}
              accessibilityRole="button"
              accessibilityLabel="Cerrar el mapa"
              style={({ pressed }) => [styles.mapCollapseBtn, pressed && { opacity: 0.85 }]}
            >
              <ChevronDown color={theme.white} size={22} />
              <Text style={styles.mapCollapseTxt}>Cerrar mapa</Text>
            </Pressable>
          ) : null}
        </RNAnimated.View>
      ) : null}

      {!(mapExpanded && view !== 'calendar') ? (
        <View style={styles.sheetOuter}>
          <ScrollView
            style={[styles.sheet, view === 'calendar' && styles.sheetCalendar]}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            {view !== 'calendar' ? (
              <Pressable
                onPress={toggleMapExpanded}
                accessibilityRole="button"
                accessibilityLabel={mapExpanded ? 'Cerrar mapa' : 'Abrir mapa a pantalla completa'}
                hitSlop={20}
                style={styles.handleHit}
              >
                <View style={styles.handle} />
              </Pressable>
            ) : null}

            <View style={styles.tabs}>
              <Pressable
                onPress={() => setView('radar')}
                accessibilityRole="button"
                accessibilityLabel={t.radar}
                accessibilityState={{ selected: view === 'radar' }}
                style={[styles.tab, view === 'radar' && styles.tabActive]}
              >
                <Radar color={view === 'radar' ? '#fff' : theme.gray600} size={16} />
                <Text style={[styles.tabTxt, view === 'radar' && styles.tabTxtActive]}>
                  {t.radar.toUpperCase()}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setView('board')}
                accessibilityRole="button"
                accessibilityLabel={t.board}
                accessibilityState={{ selected: view === 'board' }}
                style={[styles.tab, view === 'board' && styles.tabActive]}
              >
                <List color={view === 'board' ? '#fff' : theme.gray600} size={16} />
                <Text style={[styles.tabTxt, view === 'board' && styles.tabTxtActive]}>
                  {t.board.toUpperCase()}
                </Text>
              </Pressable>
            </View>

            {view === 'radar' && (
              <>
                {activeAssignedRoutesForRadar.length > 0 ? (
                  <View style={[styles.section, styles.activeRoutesSheetBlock]}>
                    <Text style={styles.sectionTitle}>{t.activeRoutes}</Text>
                    <View style={styles.activeRoutesList}>
                      {activeAssignedRoutesForRadar.map((row) => {
                        const snap = row.data;
                        const line = formatShippingRequestRouteLine(snap);
                        const price = String(snap['priceFinal'] ?? snap['priceFull'] ?? '—');
                        const slot = String(snap['timeSlot'] ?? '—');
                        const programmed = snap['serviceType'] === 'programmed';
                        const selected = row.id === activeCarrierRequestId;
                        return (
                          <Pressable
                            key={row.id}
                            onPress={() => setActiveRouteMenu(row)}
                            style={({ pressed }) => [
                              styles.routeCard,
                              styles.activeRouteCardInList,
                              selected ? styles.routeCardSelected : null,
                              pressed ? { opacity: 0.92 } : null,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={line}
                          >
                            <View style={styles.routeCardTop}>
                              <View style={styles.routeBadge}>
                                <Text style={styles.routeBadgeTxt} numberOfLines={1}>
                                  {programmed ? 'PROG.' : 'EXPRESS'}
                                </Text>
                              </View>
                              <Text style={styles.routePrice}>{price}</Text>
                            </View>
                            <View style={styles.routeMid}>
                              <View style={styles.routeDots}>
                                <View style={styles.dotG} />
                                <View style={styles.dotLine} />
                                <View style={styles.dotB} />
                              </View>
                              <View style={styles.routeMidCol}>
                                <Text style={styles.routeTxt} numberOfLines={4}>
                                  {line}
                                </Text>
                                <Text style={styles.activeRouteSlot}>{slot}</Text>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View style={[styles.section, styles.todayActivitySection]}>
                  <Text style={styles.sectionTitle}>{t.todayActivity}</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>{t.earnings}</Text>
                      <Text style={styles.statVal}>84.20€</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabelMuted}>Entregas</Text>
                      <Text style={styles.statVal}>12</Text>
                    </View>
                  </View>
                  {confirmedRoutes.length > 0 && (
                    <View style={styles.nextMission}>
                      <Text style={styles.nextMissionLbl}>{t.nextMissionConfirmed}</Text>
                      <View style={styles.nextMissionRow}>
                        <View>
                          <Text style={styles.routeMain}>{confirmedRoutes[0].route}</Text>
                          <Text style={styles.routeSub}>{confirmedRoutes[0].date}</Text>
                        </View>
                        <View style={styles.clockBox}>
                          <Clock color={theme.electricBlue} size={20} />
                        </View>
                      </View>
                    </View>
                  )}
                  <View style={styles.demandCard}>
                    <View style={styles.demandLeft}>
                      <View style={styles.demandIcon}>
                        <TrendingUp color={theme.electricBlue} size={24} />
                      </View>
                      <View>
                        <Text style={styles.demandTitle}>Demanda Alta</Text>
                        <Text style={styles.demandSub}>Cerca de Plaza de Sants</Text>
                      </View>
                    </View>
                    <ChevronRight color={theme.textOnDarkMuted} size={20} />
                  </View>
                </View>
              </>
            )}

            {view === 'board' && (
              <View style={styles.section}>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionTitle}>{t.board}</Text>
                  <View style={styles.iconRow}>
                    <Pressable
                      onPress={() => setView('calendar')}
                      accessibilityRole="button"
                      accessibilityLabel={t.calendarTitle}
                      style={styles.iconBtn}
                    >
                      <Calendar color={theme.electricBlue} size={16} />
                    </Pressable>
                    <Pressable
                      onPress={onOpenLegalHelp}
                      accessibilityRole="button"
                      accessibilityLabel="Legal y ayuda"
                      style={styles.iconBtn}
                    >
                      <HelpCircle color={theme.electricBlue} size={16} />
                    </Pressable>
                    <Pressable
                      onPress={openAccountSettings}
                      accessibilityRole="button"
                      accessibilityLabel={tr('accountSettings.title')}
                      style={styles.iconBtn}
                    >
                      <Settings color={theme.electricBlue} size={16} />
                    </Pressable>
                  </View>
                </View>

                {canUseOpenRequests ? (
                  <View style={styles.openCloudBlock}>
                    <Text style={styles.subsectionTitle}>{tr('carrierOpen.title')}</Text>
                    {openJobsError ? (
                      <Text style={styles.openJobErr}>{tr('carrierOpen.loadError')}</Text>
                    ) : null}
                    {openJobs.length === 0 && !openJobsError ? (
                      <Text style={styles.openJobEmpty}>{tr('carrierOpen.empty')}</Text>
                    ) : null}
                    {openJobs.map((job) => {
                      const line = formatShippingRequestRouteLine(job);
                      const price = String(job['priceFinal'] ?? job['priceFull'] ?? '—');
                      const slot = String(job['timeSlot'] ?? '—');
                      const modeExpress = job['serviceType'] === 'express';
                      const photoUrls = getPackagePhotoUrlsFromRequest(job as Record<string, unknown>);
                      const thumb = photoUrls[0];
                      return (
                        <Pressable
                          key={job.id}
                          onPress={() => openJobDetail(job)}
                          style={({ pressed }) => [styles.routeCard, pressed && { opacity: 0.92 }]}
                          accessibilityRole="button"
                          accessibilityLabel={tr('carrierOpen.openDetail')}
                        >
                          <View style={styles.routeCardTop}>
                            <View style={styles.routeBadge}>
                              <Text style={styles.routeBadgeTxt} numberOfLines={1}>
                                {modeExpress ? 'EXPRESS' : 'PROG.'}
                              </Text>
                            </View>
                            <Text style={styles.routePrice}>{price}</Text>
                          </View>
                          <View style={styles.routeMid}>
                            <View style={styles.routeDots}>
                              <View style={styles.dotG} />
                              <View style={styles.dotLine} />
                              <View style={styles.dotB} />
                            </View>
                            <View style={styles.routeMidCol}>
                              <Text style={styles.routeTxt} numberOfLines={3}>
                                {line}
                              </Text>
                              <View style={styles.cargoInline}>
                                {thumb ? (
                                  <Image
                                    source={{ uri: thumb }}
                                    style={{
                                      width: 52,
                                      height: 52,
                                      borderRadius: 10,
                                      backgroundColor: theme.gray800,
                                    }}
                                    contentFit="cover"
                                  />
                                ) : null}
                                <Text style={styles.cargoSummaryTxt} numberOfLines={2}>
                                  {formatCargoSummaryFromRequest(job as Record<string, unknown>)}
                                </Text>
                              </View>
                              <View style={styles.sizeChip}>
                                <Clock color={theme.electricBlue} size={14} />
                                <Text style={styles.sizeChipTxt} numberOfLines={1}>
                                  {slot}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.openDetailRow}>
                            <Text style={styles.openDetailTxt}>{tr('carrierOpen.openDetail')}</Text>
                            <ChevronRight color={theme.electricBlue} size={18} />
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}

                {!canUseOpenRequests
                  ? routes
                      .filter((r) => r.status === 'pending')
                      .map((r) => (
                        <View key={r.id} style={styles.routeCard}>
                          <View style={styles.routeCardTop}>
                            <View style={styles.routeBadge}>
                              <Text style={styles.routeBadgeTxt}>{r.date}</Text>
                            </View>
                            <Text style={styles.routePrice}>{r.price}</Text>
                          </View>
                          <View style={styles.routeMid}>
                            <View style={styles.routeDots}>
                              <View style={styles.dotG} />
                              <View style={styles.dotLine} />
                              <View style={styles.dotB} />
                            </View>
                            <View style={styles.routeMidCol}>
                              <Text style={styles.routeTxt}>{r.route}</Text>
                              <View style={styles.cargoInline}>
                                <CargoDimensionBars spec={r.dims} compact theme={theme} />
                                <Text style={styles.cargoSummaryTxt} numberOfLines={2}>
                                  {formatPackageSpecsLine(r.dims)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Pressable
                            onPress={() => handleConfirmRoute(r)}
                            accessibilityRole="button"
                            accessibilityLabel={t.confirm}
                            style={styles.confirmBtn}
                          >
                            <Check color="#fff" size={16} />
                            <Text style={styles.confirmBtnTxt}>{t.confirm}</Text>
                          </Pressable>
                        </View>
                      ))
                  : null}
              </View>
            )}

            {view === 'calendar' && (
              <View style={styles.calWrap}>
                <View style={styles.calHeader}>
                  <Pressable
                    onPress={() => setView('board')}
                    accessibilityRole="button"
                    accessibilityLabel="Volver al tablón"
                    style={styles.iconBtn}
                  >
                    <ChevronLeft color={theme.white} size={20} />
                  </Pressable>
                  <Text style={styles.calTitle}>{t.calendarTitle}</Text>
                  <Pressable
                    onPress={openAccountSettings}
                    accessibilityRole="button"
                    accessibilityLabel={tr('accountSettings.title')}
                    style={styles.iconBtn}
                  >
                    <User color={theme.white} size={20} />
                  </Pressable>
                </View>
                <View style={styles.monthRow}>
                  <Pressable
                    onPress={() =>
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Mes anterior"
                  >
                    <ChevronLeft color={theme.gray500} size={24} />
                  </Pressable>
                  <Text style={styles.monthTxt}>
                    {calendarDate.toLocaleString(lang === 'ca' ? 'ca-ES' : 'es-ES', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Mes siguiente"
                  >
                    <ChevronRightIcon color={theme.gray500} size={24} />
                  </Pressable>
                </View>
                <View style={styles.dowRow}>
                  {['DL', 'DT', 'DC', 'DJ', 'DV', 'DS', 'DG'].map((d) => (
                    <Text key={d} style={styles.dowCell}>
                      {d}
                    </Text>
                  ))}
                </View>
                <View style={styles.daysGrid}>
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <View key={`e-${i}`} style={styles.dayCellEmpty} />
                  ))}
                  {Array.from({ length: currentMonthDays }).map((_, i) => {
                    const day = i + 1;
                    const isToday =
                      new Date().getDate() === day && new Date().getMonth() === calendarDate.getMonth();
                    const hasM = hasMissionsOnDay(day);
                    const isSel = selectedDay === day;
                    return (
                      <Pressable
                        key={day}
                        onPress={() => setSelectedDay(day)}
                        accessibilityRole="button"
                        accessibilityLabel={`Día ${day}`}
                        accessibilityState={{ selected: isSel }}
                        style={[
                          styles.dayBtn,
                          isSel && styles.dayBtnSel,
                          !isSel && isToday && styles.dayBtnToday,
                        ]}
                      >
                        <Text style={[styles.dayBtnTxt, isSel && { color: '#fff' }]}>{day}</Text>
                        {hasM ? (
                          <View style={[styles.dotMission, isSel && { backgroundColor: '#fff' }]} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.missionsHdr}>Missions del dia {selectedDay}</Text>
                {missionsForSelectedDay.length > 0 ? (
                  missionsForSelectedDay.map((m) => (
                    <View key={m.id} style={styles.missionRow}>
                      <View style={styles.missionLeft}>
                        <View style={styles.missionIcon}>
                          <Clock color={theme.electricBlue} size={20} />
                        </View>
                        <View>
                          <Text style={styles.missionRoute}>{m.route}</Text>
                          <Text style={styles.missionDate}>{m.date}</Text>
                        </View>
                      </View>
                      <Text style={styles.missionPrice}>{m.price}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noMissions}>{t.noMissions}</Text>
                )}
              </View>
            )}
          </ScrollView>
          <View
            pointerEvents="none"
            accessible={false}
            style={{ height: sheetBottomAir, backgroundColor: theme.bgRoot }}
          />
        </View>
      ) : null}

      <Modal visible={detailJob != null} animationType="slide" transparent onRequestClose={closeJobDetail}>
        <View style={styles.detailBackdrop}>
          <View style={styles.detailSheet}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.detailSheetTitle}>{tr('carrierOpen.detailTitle')}</Text>
              {detailJob ? (
                <>
                  <PackagePhotoStrip
                    urls={getPackagePhotoUrlsFromRequest(detailJob as Record<string, unknown>)}
                    theme={theme}
                  />
                  {(() => {
                    const isExpress = detailJob['serviceType'] === 'express';
                    return (
                      <View style={styles.serviceTypeRow}>
                        <View style={styles.serviceTypePill}>
                          <Truck color={theme.electricBlue} size={14} />
                          <Text style={styles.serviceTypePillTxt}>
                            {isExpress ? t.serviceExpress : t.serviceProgrammed}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                  {(() => {
                    const spec = getPrimarySpecsFromRequest(detailJob as Record<string, unknown>);
                    if (!spec) return null;
                    const dimsTxt = `${Math.round(spec.lengthCm)} × ${Math.round(spec.widthCm)} × ${Math.round(spec.heightCm)} cm`;
                    const w = spec.weightKg;
                    const weightTxt = `${w >= 10 ? w.toFixed(1) : w.toFixed(2)} kg`;
                    const volumeL = (spec.lengthCm * spec.widthCm * spec.heightCm) / 1000;
                    const volumeTxt = volumeL >= 100 ? `${volumeL.toFixed(0)} L` : `${volumeL.toFixed(1)} L`;
                    return (
                      <View style={styles.pkgInfoCard}>
                        <View style={styles.pkgInfoRow}>
                          <View style={styles.pkgInfoIcon}>
                            <Package color={theme.electricBlue} size={18} />
                          </View>
                          <Text style={styles.pkgInfoLabel}>{t.pkgDimensions}</Text>
                          <Text style={styles.pkgInfoValue}>{dimsTxt}</Text>
                        </View>
                        <View style={styles.pkgInfoDivider} />
                        <View style={styles.pkgInfoRow}>
                          <View style={styles.pkgInfoIcon}>
                            <Weight color={theme.electricBlue} size={18} />
                          </View>
                          <Text style={styles.pkgInfoLabel}>{t.pkgWeight}</Text>
                          <Text style={styles.pkgInfoValue}>{weightTxt}</Text>
                        </View>
                        <View style={styles.pkgInfoDivider} />
                        <View style={styles.pkgInfoRow}>
                          <View style={styles.pkgInfoIcon}>
                            <Box color={theme.electricBlue} size={18} />
                          </View>
                          <Text style={styles.pkgInfoLabel}>{t.pkgVolume}</Text>
                          <Text style={styles.pkgInfoValue}>{volumeTxt}</Text>
                        </View>
                      </View>
                    );
                  })()}
                  <View style={styles.pkgSectionHead}>
                    <MapPin color={theme.electricBlue} size={14} />
                    <Text style={styles.pkgSectionLabel}>{t.routeLabel}</Text>
                  </View>
                  <Text style={[styles.pkgStreet, { marginBottom: 16 }]} numberOfLines={5}>
                    {formatShippingRequestRouteLine(detailJob as Record<string, unknown>)}
                  </Text>
                  <View style={styles.pkgTwoColRow}>
                    <View style={styles.pkgTwoColItem}>
                      <View style={styles.pkgSectionHead}>
                        <Wallet color={theme.electricBlue} size={14} />
                        <Text style={styles.pkgSectionLabel}>{t.earnings}</Text>
                      </View>
                      <Text style={styles.pkgMoney}>
                        {String(detailJob['priceFinal'] ?? detailJob['priceFull'] ?? '—')}
                      </Text>
                    </View>
                    <View style={styles.pkgTwoColItem}>
                      <View style={styles.pkgSectionHead}>
                        <Clock color={theme.electricBlue} size={14} />
                        <Text style={styles.pkgSectionLabel}>{t.pickupSlot}</Text>
                      </View>
                      <Text style={styles.pkgTwoColValue}>{String(detailJob['timeSlot'] ?? '—')}</Text>
                    </View>
                  </View>
                  <View style={styles.clientStrip}>
                    <View style={styles.clientAvatar}>
                      <User color={theme.electricBlue} size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clientLine}>{t.clientLabel}</Text>
                      <View style={styles.clientSubRow}>
                        <ShieldCheck color={theme.success} size={12} />
                        <Text style={styles.clientSub}>{t.clientVerified}</Text>
                      </View>
                    </View>
                  </View>
                  {claimError ? (
                    <Text style={styles.claimErrInline} accessibilityLiveRegion="polite">
                      {claimError}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => void handleClaimOpen(detailJob.id)}
                    disabled={claimingId === detailJob.id}
                    style={[
                      styles.confirmBtn,
                      { marginTop: 12 },
                      claimingId === detailJob.id && { opacity: 0.7 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={tr('carrierOpen.claim')}
                  >
                    {claimingId === detailJob.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Check color="#fff" size={16} />
                    )}
                    <Text style={styles.confirmBtnTxt}>
                      {claimingId === detailJob.id ? tr('carrierOpen.claiming') : tr('carrierOpen.claim')}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={closeJobDetail}
                    style={{ alignItems: 'center', paddingVertical: 16 }}
                    accessibilityRole="button"
                    accessibilityLabel={tr('common.cancel')}
                  >
                    <Text style={{ color: theme.gray600, fontWeight: '800' }}>{tr('common.cancel')}</Text>
                  </Pressable>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeRouteMenu != null}
        animationType="slide"
        transparent
        onRequestClose={() => setActiveRouteMenu(null)}
      >
        <View style={styles.detailBackdrop}>
          <View style={styles.routeActionSheet}>
            <Text style={styles.detailSheetTitle}>{tr('carrierOpen.activeRouteChooseTitle')}</Text>
            {activeRouteMenu ? (
              <Text style={styles.routeActionLine} numberOfLines={5}>
                {formatShippingRequestRouteLine(activeRouteMenu.data)}
              </Text>
            ) : null}
            <Pressable
              onPress={() => {
                if (activeRouteMenu) openActiveRouteOnMap(activeRouteMenu);
              }}
              disabled={releaseInFlightId != null}
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.92 }]}
              accessibilityRole="button"
              accessibilityLabel={tr('carrierOpen.activeRouteOpenMap')}
            >
              <MapPin color="#fff" size={16} />
              <Text style={styles.confirmBtnTxt}>{tr('carrierOpen.activeRouteOpenMap').toUpperCase()}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                const r = activeRouteMenu;
                if (!r) return;
                confirmReleaseActiveRoute(r.id);
              }}
              disabled={releaseInFlightId != null}
              style={({ pressed }) => [
                styles.routeActionDangerBtn,
                (pressed || releaseInFlightId != null) && { opacity: 0.72 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={tr('carrierOpen.activeRouteRelease')}
            >
              {releaseInFlightId != null && activeRouteMenu && releaseInFlightId === activeRouteMenu.id ? (
                <ActivityIndicator color="#fecaca" />
              ) : (
                <Text style={styles.routeActionDangerTxt}>{tr('carrierOpen.activeRouteRelease')}</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => setActiveRouteMenu(null)}
              disabled={releaseInFlightId != null}
              style={({ pressed }) => [styles.routeActionCloseBtn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel={tr('common.cancel')}
            >
              <Text style={styles.routeActionCloseTxt}>{tr('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotification && notifPayload != null} transparent animationType="slide">
        <View style={styles.notifWrap}>
          <View style={styles.notifCard}>
            <View style={styles.notifTop}>
              <View style={styles.bellBadge}>
                <Bell color="#fff" size={20} />
              </View>
              <Text style={styles.notifTitle}>{t.newOrder}</Text>
              <View style={styles.notifLoc}>
                <MapPin color={theme.textOnDarkSecondary} size={16} />
                <Text style={styles.notifLocTxt}>
                  {notifPayload
                    ? tr('carrierOpen.notifDistanceKm', {
                        km: formatKmForNotif(lang, notifPayload.distanceKm),
                      })
                    : ''}
                </Text>
              </View>
            </View>
            <View style={styles.notifBody}>
              {notifPayload ? (
                <>
                  <Text style={styles.notifHintTxt}>{tr('carrierOpen.notifHint')}</Text>
                  <Text style={styles.pkgMeta}>Ruta</Text>
                  <Text style={styles.pkgStreet} numberOfLines={3}>
                    {notifPayload.routeLine}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      marginTop: 16,
                      marginBottom: 22,
                    }}
                  >
                    <Text style={styles.pkgMeta}>{t.earnings}</Text>
                    <Text style={styles.pkgMoney}>{notifPayload.price}</Text>
                  </View>
                  <View style={styles.notifActions}>
                    <Pressable
                      onPress={() => {
                        setShowNotification(false);
                        setNotifPayload(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={tr('common.cancel')}
                      style={styles.rejectBtn}
                    >
                      <X color={theme.gray500} size={16} />
                      <Text style={styles.rejectTxt}>{tr('common.cancel')}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setShowNotification(false);
                        setNotifPayload(null);
                        setView('board');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={tr('carrierOpen.openBoard')}
                      style={styles.acceptBtn}
                    >
                      <List color="#fff" size={16} />
                      <Text style={styles.acceptTxt}>{tr('carrierOpen.openBoard')}</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <LocationPermissionGate
        visible={showLocGate}
        status={deviceLoc.status}
        onAllow={() => void deviceLoc.request()}
        onCancel={() => setLocGateDismissed(true)}
      />
    </View>
  );
}

function PackagePhotoStrip({ urls, theme }: { urls: string[]; theme: AppPalette }) {
  if (urls.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 10, marginBottom: 16, flexDirection: 'row' }}
    >
      {urls.map((uri) => (
        <Image
          key={uri}
          source={{ uri }}
          style={{ width: 120, height: 120, borderRadius: 14, backgroundColor: theme.deepNight }}
          contentFit="cover"
        />
      ))}
    </ScrollView>
  );
}

function RadarRipple({ styles: radarStyles }: { styles: ReturnType<typeof carrierHomeStyles> }) {
  const s = useSharedValue(0.5);
  useEffect(() => {
    s.value = withRepeat(withTiming(2.5, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
  }, [s]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: 0.35 - s.value * 0.1,
  }));
  return (
    <View style={radarStyles.radarCenter}>
      <Animated.View style={[radarStyles.radarRing, ringStyle]} />
      <View style={radarStyles.radarDot} />
    </View>
  );
}

/** Misma fracción que `ClientHome` con `step !== 'home'` (`WIN_H * 0.38`): ETA + sheet alineados al flujo con seguimiento. */
const MAP_H = SCREEN_H * 0.38;

function carrierHomeStyles(theme: AppPalette) {
  return StyleSheet.create({
    root: { flex: 1, minHeight: 0, backgroundColor: theme.deepNight },
    /** Sheet + franja inferior (`theme.bgRoot`): hueco visible y layout estable en web. */
    sheetOuter: { flex: 1, minHeight: 0 },
    /** `height` lo gobierna `mapHeightAnim`; aquí solo dejamos el contexto de posición. */
    mapSection: { position: 'relative', overflow: 'hidden' },
    radarOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 5,
    },
    radarCenter: { alignItems: 'center', justifyContent: 'center' },
    radarRing: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 4,
      borderColor: theme.electricBlue,
    },
    radarDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.electricBlue,
    },
    carrierBackFloating: {
      position: 'absolute',
      top: 28,
      left: 22,
      zIndex: 40,
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: theme.mapHudFloatingBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.mapHudFloatingBorder,
    },
    mapHeader: {
      position: 'absolute',
      top: 28,
      left: 88,
      right: 24,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 30,
    },
    mapHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    helpHeaderBtn: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: theme.mapHudFloatingBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.mapHudFloatingBorder,
    },
    profileChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.mapHudFloatingBg,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.mapHudFloatingBorder,
    },
    profileIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: 'rgba(48,112,240,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileMeta: {
      fontSize: 12,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    profileName: { fontSize: 15, fontWeight: '900', color: theme.white },
    powerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 22,
      paddingVertical: 15,
      borderRadius: 18,
      borderWidth: 2,
    },
    powerBtnOn: { backgroundColor: theme.success, borderColor: theme.success },
    powerBtnOff: { backgroundColor: theme.mapHudFloatingBg, borderColor: theme.mapHudFloatingBorder },
    powerTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5, color: theme.textOnDarkSecondary },
    sheet: {
      flex: 1,
      backgroundColor: theme.deepNight,
      borderTopLeftRadius: 48,
      borderTopRightRadius: 48,
      marginTop: -16,
      borderTopWidth: 1,
      borderColor: theme.borderSubtle,
    },
    sheetCalendar: {
      marginTop: 0,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      flexGrow: 1,
    },
    sheetContent: { padding: 28, paddingBottom: 28 },
    handle: {
      width: 48,
      height: 5,
      backgroundColor: theme.fillMedium,
      borderRadius: 4,
      alignSelf: 'center',
    },
    /** Área pulsable más amplia para que el handle sea fácil de tocar. */
    handleHit: {
      paddingTop: 8,
      paddingBottom: 16,
      alignItems: 'center',
      marginBottom: 4,
    },
    mapCollapseBtn: {
      position: 'absolute',
      bottom: 28,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 30,
      backgroundColor: theme.mapHudBarBg,
      borderWidth: 1,
      borderColor: theme.mapCollapseBorder,
      zIndex: 60,
    },
    mapCollapseTxt: {
      color: theme.white,
      fontSize: 12,
      fontWeight: '900',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    tabs: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceDark,
      padding: 6,
      borderRadius: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
    },
    tabActive: { backgroundColor: theme.electricBlue },
    tabTxt: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: theme.textOnDarkSecondary },
    tabTxtActive: { color: '#fff' },
    section: { gap: 20 },
    /** Separación respecto a «Rutas activas» / pestañas. */
    todayActivitySection: { marginTop: 28 },
    rowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '900',
      color: theme.textOnDarkSecondary,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    activeRoutesSheetBlock: { gap: 14 },
    activeRoutesList: { gap: 12 },
    activeRouteCardInList: { marginBottom: 0 },
    routeCardSelected: {
      borderColor: 'rgba(48,112,240,0.55)',
      borderWidth: 2,
    },
    activeRouteSlot: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textOnDarkSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    openCloudBlock: { gap: 14, marginBottom: 8 },
    subsectionTitle: {
      fontSize: 12,
      fontWeight: '900',
      color: theme.electricBlue,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    openJobEmpty: { color: theme.textOnDarkSecondary, fontSize: 15, fontWeight: '600', lineHeight: 22 },
    openJobErr: { color: theme.textOnDarkMuted, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    statsRow: { flexDirection: 'row', gap: 16 },
    statCard: {
      flex: 1,
      backgroundColor: theme.surfaceDark,
      padding: 22,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.electricBlue,
      marginBottom: 6,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    statLabelMuted: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkSecondary,
      marginBottom: 6,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    statVal: { fontSize: 28, fontWeight: '900', color: theme.white },
    nextMission: {
      padding: 22,
      backgroundColor: 'rgba(48,112,240,0.05)',
      borderRadius: 32,
      borderWidth: 1,
      borderColor: 'rgba(48,112,240,0.2)',
    },
    nextMissionLbl: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.electricBlue,
      letterSpacing: 1.5,
      marginBottom: 14,
      textTransform: 'uppercase',
    },
    nextMissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    routeMain: { fontWeight: '700', color: theme.white, fontSize: 16 },
    routeSub: { fontSize: 13, color: theme.textOnDarkSecondary, fontWeight: '700', marginTop: 4 },
    clockBox: {
      backgroundColor: theme.surfaceDark,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    demandCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 22,
      backgroundColor: theme.surfaceDark,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    demandLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    demandIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.deepNight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    demandTitle: { fontSize: 14, fontWeight: '900', color: theme.white },
    demandSub: {
      fontSize: 12,
      color: theme.textOnDarkSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 4,
    },
    iconRow: { flexDirection: 'row', gap: 8 },
    iconBtn: {
      padding: 10,
      backgroundColor: theme.surfaceDark,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    routeCard: {
      padding: 22,
      backgroundColor: theme.surfaceDark,
      borderRadius: 36,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      marginBottom: 14,
    },
    routeCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
    routeBadge: {
      backgroundColor: 'rgba(48,112,240,0.1)',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      overflow: 'hidden',
    },
    routeBadgeTxt: { color: theme.chipValueBlue, fontSize: 11, fontWeight: '900' },
    routePrice: { fontSize: 20, fontWeight: '900', color: theme.white },
    routeMid: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    routeMidCol: { flex: 1, gap: 10, minWidth: 0 },
    cargoInline: { gap: 8 },
    cargoSummaryTxt: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.textOnDarkSecondary,
    },
    routeDots: { alignItems: 'center' },
    dotG: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.gray800 },
    dotLine: { width: 2, height: 14, backgroundColor: theme.divider },
    dotB: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.electricBlue },
    routeTxt: { flex: 1, fontSize: 15, fontWeight: '700', color: theme.textOnDarkSecondary },
    sizeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.deepNight,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    sizeChipTxt: { fontSize: 12, fontWeight: '900', color: theme.chipValueBlue },
    confirmBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: theme.electricBlue,
      paddingVertical: 18,
      borderRadius: 16,
    },
    confirmBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
    calWrap: { paddingBottom: 24 },
    calHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    calTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: theme.white,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    monthRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    monthTxt: { fontSize: 14, fontWeight: '900', color: theme.electricBlue, textTransform: 'capitalize' },
    dowRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    dowCell: {
      flex: 1,
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      paddingBottom: 8,
    },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
    dayCellEmpty: { width: '14.28%', height: 44 },
    dayBtn: {
      width: '14.28%',
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      backgroundColor: theme.surfaceDark,
      marginBottom: 8,
    },
    dayBtnSel: { backgroundColor: theme.electricBlue, borderColor: theme.electricBlue },
    dayBtnToday: { backgroundColor: 'rgba(48,112,240,0.05)', borderColor: 'rgba(48,112,240,0.3)' },
    dayBtnTxt: { fontSize: 13, fontWeight: '900', color: theme.textOnDarkSecondary },
    dotMission: {
      position: 'absolute',
      bottom: 6,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.electricBlue,
    },
    missionsHdr: {
      fontSize: 12,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    missionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 18,
      backgroundColor: theme.surfaceDark,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      marginBottom: 12,
    },
    missionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    missionIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(48,112,240,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    missionRoute: { fontSize: 12, fontWeight: '900', color: theme.white },
    missionDate: {
      fontSize: 12,
      color: theme.textOnDarkMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 4,
    },
    missionPrice: { fontSize: 14, fontWeight: '900', color: theme.success },
    noMissions: {
      textAlign: 'center',
      paddingVertical: 36,
      color: theme.textOnDarkSecondary,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    notifWrap: { flex: 1, justifyContent: 'flex-end', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
    notifCard: { borderRadius: 48, overflow: 'hidden', borderWidth: 1, borderColor: theme.borderStrong },
    notifTop: { backgroundColor: theme.electricBlue, padding: 36, paddingTop: 48 },
    bellBadge: {
      position: 'absolute',
      top: 22,
      right: 22,
      backgroundColor: theme.fillMedium,
      padding: 10,
      borderRadius: 999,
    },
    notifTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10 },
    notifLoc: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    notifLocTxt: {
      fontSize: 10,
      fontWeight: '900',
      color: theme.textOnDarkSecondary,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    notifBody: { backgroundColor: theme.surfaceDark, padding: 28 },
    notifRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 22,
    },
    pkgIcon: {
      width: 64,
      height: 64,
      borderRadius: 24,
      backgroundColor: theme.deepNight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    pkgMeta: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    pkgStreet: { fontSize: 17, fontWeight: '800', color: theme.white, lineHeight: 24 },
    pkgMoney: { fontSize: 22, fontWeight: '900', color: theme.success },
    serviceTypeRow: { flexDirection: 'row', marginBottom: 14 },
    serviceTypePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: theme.langChipSelectedBg,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    serviceTypePillTxt: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.chipValueBlue,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    pkgInfoCard: {
      backgroundColor: theme.deepNight,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      paddingVertical: 4,
      marginBottom: 18,
    },
    pkgInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 12,
    },
    pkgInfoIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.langChipSelectedBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pkgInfoLabel: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: theme.textOnDarkSecondary,
    },
    pkgInfoValue: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.white,
      letterSpacing: 0.3,
    },
    pkgInfoDivider: {
      height: 1,
      backgroundColor: theme.divider,
      marginHorizontal: 14,
    },
    pkgSectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    pkgSectionLabel: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    pkgTwoColRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    pkgTwoColItem: {
      flex: 1,
      backgroundColor: theme.deepNight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    pkgTwoColValue: {
      fontSize: 18,
      fontWeight: '900',
      color: theme.white,
      letterSpacing: 0.5,
    },
    clientStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: theme.deepNight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      marginBottom: 12,
    },
    clientAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.langChipSelectedBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clientLine: {
      fontSize: 14,
      fontWeight: '900',
      color: theme.white,
      marginBottom: 2,
    },
    clientSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clientSub: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textOnDarkMuted,
    },
    notifActions: { flexDirection: 'row', gap: 12 },
    rejectBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 18,
      backgroundColor: theme.deepNight,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    rejectTxt: { fontSize: 11, fontWeight: '900', color: theme.textOnDarkSecondary, letterSpacing: 1.5 },
    acceptBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 18,
      backgroundColor: theme.electricBlue,
      borderRadius: 16,
    },
    acceptTxt: { fontSize: 10, fontWeight: '900', color: '#fff', letterSpacing: 2 },
    notifHintTxt: {
      fontSize: 14,
      color: theme.textOnDarkSecondary,
      fontWeight: '600',
      marginBottom: 14,
      lineHeight: 21,
    },
    openDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.divider,
    },
    openDetailTxt: { fontSize: 11, fontWeight: '900', color: theme.electricBlue, letterSpacing: 1 },
    detailBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    detailSheet: {
      backgroundColor: theme.surfaceDark,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 36,
      maxHeight: SCREEN_H * 0.88,
      borderWidth: 1,
      borderColor: theme.borderMuted,
    },
    detailSheetTitle: { fontSize: 18, fontWeight: '900', color: theme.white, marginBottom: 16 },
    routeActionSheet: {
      backgroundColor: theme.surfaceDark,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      paddingBottom: 36,
      gap: 14,
      borderWidth: 1,
      borderColor: theme.borderMuted,
    },
    routeActionLine: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.textOnDarkSecondary,
      lineHeight: 22,
      marginBottom: 4,
    },
    routeActionDangerBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.45)',
      backgroundColor: 'rgba(239,68,68,0.12)',
      minHeight: 52,
    },
    routeActionDangerTxt: {
      color: '#fecaca',
      fontWeight: '900',
      fontSize: 11,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    routeActionCloseBtn: { alignItems: 'center', paddingVertical: 10 },
    routeActionCloseTxt: { color: theme.textOnDarkSecondary, fontWeight: '800', fontSize: 14 },
    claimErrInline: {
      marginTop: 4,
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(239,68,68,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.35)',
      color: '#fca5a5',
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
  });
}
