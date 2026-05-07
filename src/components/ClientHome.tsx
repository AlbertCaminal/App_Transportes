import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Package,
  ChevronLeft,
  ChevronDown,
  LocateFixed,
  Search,
  Star,
  Phone,
  Clock,
  Zap,
  Calendar,
  MapPin,
  Check,
  Users,
  CheckCircle2,
  Trash2,
  X,
  Truck,
  Camera,
  ClipboardList,
  HelpCircle,
  User,
} from 'lucide-react-native';
import ClientDiscoveryMap from './ClientDiscoveryMap';
import AddressAutocompleteInput from './AddressAutocompleteInput';
import { useClientMissionSimulation } from '../hooks/useClientMissionSimulation';
import { useClientRequestList, useShippingRequestDocument } from '../hooks/useClientRequestSubscriptions';
import { useReviewTariffDelay } from '../hooks/useReviewTariffDelay';
import { computeMissionPrice } from '../utils/missionPricing';
import { Language, ServiceType, AppState, PackageItem, PackagePhysicalSpec } from '../../shared/types';
import type { AppPalette } from '../theme';
import { useAppTheme } from '../hooks/useAppTheme';
import { useT } from '../i18n/useT';
import * as ImagePicker from 'expo-image-picker';
import AuthUpsellModal from './AuthUpsellModal';
import { useAuthUpsellNavigation } from '../hooks/useAuthUpsellNavigation';
import { useAppStore } from '../store/appStore';
import { requiresGoogleSignIn } from '../utils/requiresGoogleSignIn';
import { isFirebaseConfigured } from '../config/firebase';
import { MAP_WEB_BOTTOM_CHROME_RESERVE_PX, MAP_WEB_COMPACT_SHEET_RESERVE_PX } from '../config/mapbox';
import { createShippingRequest } from '../services/firestore/shippingRequest';
import { uploadPackagePhotoForUser } from '../services/firebase/packagePhotoUpload';
import { buildShippingRequestPayload } from '../utils/shippingRequestPayload';
import { parseAssignedCarrier, parseRequestStatus } from '../utils/shippingRequestUi';
import { liveRequestToMapSnapshot, parseCarrierLngLat } from '../utils/liveRequestMap';
import { formatVehicleSummary } from '../utils/vehicleDisplay';
import {
  deleteShippingRequestCallable,
  messageForDeleteShippingRequestError,
} from '../services/firebase/shippingCallable';

const { height: WIN_H } = Dimensions.get('window');

/** Máximo de paradas en modo programado (coherente con `firestore.rules`). */
const MAX_PROGRAMMED_STOPS = 5;

type DimDraft = { lengthCm: string; widthCm: string; heightCm: string; weightKg: string };

const EMPTY_DRAFT: DimDraft = { lengthCm: '', widthCm: '', heightCm: '', weightKg: '' };

function parseDraft(d: DimDraft): PackagePhysicalSpec | null {
  const lengthCm = parseFloat(d.lengthCm.replace(',', '.'));
  const widthCm = parseFloat(d.widthCm.replace(',', '.'));
  const heightCm = parseFloat(d.heightCm.replace(',', '.'));
  const weightKg = parseFloat(d.weightKg.replace(',', '.'));
  if (![lengthCm, widthCm, heightCm, weightKg].every((x) => Number.isFinite(x) && x > 0)) return null;
  return { lengthCm, widthCm, heightCm, weightKg };
}

/** Precios guardados en `requests/{id}` para seguimiento sin rellenar el formulario. */
function priceResultFromLiveRequest(req: Record<string, unknown>): {
  full: string;
  final: string;
  savings: string;
  count: number;
} {
  const fullRaw = String(req['priceFull'] ?? '').trim();
  const finalRaw = String(req['priceFinal'] ?? '').trim();
  const full = fullRaw.length > 0 ? fullRaw : finalRaw.length > 0 ? finalRaw : '0.00';
  const final = finalRaw.length > 0 ? finalRaw : full;
  const nf = parseFloat(full.replace(',', '.'));
  const nl = parseFloat(final.replace(',', '.'));
  let savings = '0.00';
  if (Number.isFinite(nf) && Number.isFinite(nl) && nf >= nl) {
    savings = (nf - nl).toFixed(2);
  }
  const count =
    req['serviceType'] === 'express' ? 1 : Array.isArray(req['packages']) ? req['packages'].length : 1;
  return { full, final, savings, count };
}

type ProgramRow = { id: string; destination: string; photoUri?: string | null } & DimDraft;

interface Props {
  lang: Language;
  step: AppState['step'];
  onStepChange: (step: AppState['step']) => void;
  onBack: () => void;
  onOpenLegalHelp: () => void;
}

const legalA11y = { ca: 'Legal i ajuda', es: 'Legal y ayuda', en: 'Legal & help' } as const;

function stylesFor(theme: AppPalette) {
  return StyleSheet.create({
    root: { flex: 1, minHeight: 0, backgroundColor: theme.deepNight },
    matchBanner: {
      position: 'absolute',
      top: 48,
      left: 20,
      right: 20,
      zIndex: 50,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surfaceDark,
      padding: 14,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.electricBlue,
    },
    matchIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.electricBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    matchTitle: { fontSize: 12, fontWeight: '900', color: theme.white },
    matchSub: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.electricBlue,
      marginTop: 2,
      textTransform: 'uppercase',
    },
    mapWrap: { position: 'relative' },
    backFloating: {
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
    profileFloating: {
      position: 'absolute',
      top: 28,
      right: 80,
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
    /** Lista de envíos: a la izquierda del perfil (el ícono de ayuda sigue el más a la derecha). */
    shipmentsFloating: {
      position: 'absolute',
      top: 28,
      right: 138,
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
    helpFloating: {
      position: 'absolute',
      top: 28,
      right: 22,
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
    simOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 35,
    },
    simCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: theme.surfaceDark,
      paddingHorizontal: 22,
      paddingVertical: 14,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: 'rgba(48,112,240,0.4)',
    },
    simTxt: {
      color: theme.white,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    /** Contenedor del sheet + franja inferior (evita fallos de layout en web con flex + margin). */
    sheetOuter: { flex: 1, minHeight: 0 },
    sheet: {
      flex: 1,
      backgroundColor: theme.deepNight,
      borderTopLeftRadius: 48,
      borderTopRightRadius: 48,
      marginTop: -16,
      borderTopWidth: 1,
      borderColor: theme.borderSubtle,
    },
    sheetContent: { padding: 28, paddingBottom: 28 },
    statusContent: { padding: 28, paddingBottom: 28 },
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
    modeTabs: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceDark,
      padding: 6,
      borderRadius: 16,
      marginBottom: 22,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    modeTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
    },
    modeTabOn: { backgroundColor: theme.electricBlue },
    modeTabTxt: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, color: theme.textOnDarkMuted },
    fieldLbl: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginBottom: 10,
      paddingLeft: 6,
    },
    inputCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surfaceDark,
      padding: 20,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      marginBottom: 18,
      /**
       * `overflow: visible` permite que el dropdown del autocompletado
       * sobresalga por debajo de la tarjeta. Sin esto, en algunas
       * plataformas el desplegable se recorta al `borderRadius`.
       */
      overflow: 'visible',
    },
    /**
     * z-index estables por tipo de tarjeta: el origen queda por encima del
     * destino y este por encima de cualquier `stopCard` posterior. Necesario
     * en RN-web porque sin un valor explícito los hermanos posteriores
     * pintan encima del dropdown anterior.
     */
    inputCardOrigin: { zIndex: 300 },
    inputCardDestination: { zIndex: 250 },
    dotB: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.electricBlue,
    },
    dotO: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: theme.electricBlue,
    },
    input: { flex: 1, color: theme.white, fontSize: 15, fontWeight: '600' },
    inputSm: { flex: 1, color: theme.white, fontSize: 14, fontWeight: '600' },
    sizeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    sizeInner: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: theme.deepNight,
      padding: 4,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    sizeChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
    sizeChipOn: { backgroundColor: theme.electricBlue },
    sizeChipTxt: { fontSize: 10, fontWeight: '900', color: theme.textOnDarkMuted },
    daysScroll: { gap: 10, paddingBottom: 4 },
    dayPill: {
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: theme.borderSubtle,
      backgroundColor: theme.surfaceDark,
      alignItems: 'center',
    },
    dayPillOn: { backgroundColor: theme.electricBlue, borderColor: theme.electricBlue },
    dayPillSm: { fontSize: 10, fontWeight: '900', color: theme.textOnDarkMuted, textTransform: 'uppercase' },
    dayPillLg: { fontSize: 13, fontWeight: '900', color: theme.textOnDarkMuted },
    slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    slotBtn: {
      width: '47%',
      paddingVertical: 14,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: theme.borderSubtle,
      backgroundColor: theme.surfaceDark,
      alignItems: 'center',
    },
    slotBtnOn: { backgroundColor: 'rgba(48,112,240,0.1)', borderColor: theme.electricBlue },
    slotTxt: { fontSize: 12, fontWeight: '900', color: theme.textOnDarkMuted },
    stopCard: {
      backgroundColor: theme.surfaceDark,
      padding: 22,
      borderRadius: 36,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      gap: 14,
      marginBottom: 12,
      overflow: 'visible',
    },
    stopHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stopNum: {
      width: 32,
      height: 32,
      borderRadius: 12,
      backgroundColor: 'rgba(48,112,240,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stopNumTxt: { fontWeight: '900', color: theme.electricBlue, fontSize: 12 },
    stopTitle: {
      flex: 1,
      marginLeft: 10,
      fontSize: 11,
      fontWeight: '900',
      color: theme.white,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    stopInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.deepNight,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      overflow: 'visible',
      /**
       * En RN-web el dropdown absoluto del autocompletado comparte tarjeta con
       * las medidas debajo; sin z-index explícito en esta fila, los inputs
       * posteriores pintan encima del desplegable.
       */
      position: 'relative',
      zIndex: 100,
      elevation: 14,
    },
    dimLbl: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    dimGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    dimCell: { flexGrow: 1, flexBasis: '30%', minWidth: 88 },
    dimFieldLbl: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    dimInput: {
      backgroundColor: theme.deepNight,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      paddingVertical: 12,
      paddingHorizontal: 12,
      color: theme.white,
      fontSize: 15,
      fontWeight: '700',
    },
    addStop: {
      paddingVertical: 18,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.borderMuted,
      borderRadius: 32,
      alignItems: 'center',
    },
    addStopTxt: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    mapRefreshBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: 'rgba(48,112,240,0.10)',
      borderWidth: 1,
      borderColor: 'rgba(56,189,248,0.35)',
      alignSelf: 'flex-start',
    },
    mapRefreshTxt: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.electricBlue,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    /** Botón principal para adjuntar foto (express / paradas). */
    addPhotoBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      paddingVertical: 18,
      paddingHorizontal: 20,
      marginTop: 6,
      borderRadius: 26,
      backgroundColor: theme.surfaceDark,
      borderWidth: 1,
      borderColor: 'rgba(48,112,240,0.38)',
    },
    addPhotoBtnCompact: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 22,
      marginTop: 4,
    },
    addPhotoBtnPressed: {
      opacity: 0.9,
      backgroundColor: 'rgba(48,112,240,0.07)',
    },
    addPhotoIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 18,
      backgroundColor: 'rgba(48,112,240,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(56,189,248,0.35)',
    },
    addPhotoBtnLabel: {
      flexShrink: 1,
      fontSize: 14,
      fontWeight: '900',
      color: theme.white,
      letterSpacing: 0.2,
    },
    addPhotoSelectedCard: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      marginTop: 6,
      padding: 14,
      borderRadius: 26,
      backgroundColor: theme.surfaceDark,
      borderWidth: 1,
      borderColor: theme.borderMuted,
    },
    addPhotoThumb: {
      width: 78,
      height: 78,
      borderRadius: 18,
      backgroundColor: theme.gray800,
    },
    addPhotoThumbStop: {
      width: 68,
      height: 68,
      borderRadius: 16,
      backgroundColor: theme.gray800,
    },
    addPhotoRemoveBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 18,
      backgroundColor: 'rgba(48,112,240,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(56,189,248,0.32)',
    },
    addPhotoRemoveTxt: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.electricBlue,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    openRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderRadius: 36,
      borderWidth: 2,
      borderColor: theme.borderSubtle,
      backgroundColor: theme.surfaceDark,
      marginTop: 8,
      marginBottom: 20,
    },
    openRowOn: { borderColor: theme.electricBlue, backgroundColor: 'rgba(48,112,240,0.05)' },
    openLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
    openIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.deepNight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    openTitle: { fontSize: 12, fontWeight: '900', color: theme.textOnDarkMuted },
    openSub: {
      fontSize: 11,
      color: theme.textOnDarkMuted,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 4,
    },
    checkOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.gray800,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOuterOn: { backgroundColor: theme.electricBlue, borderColor: theme.electricBlue },
    cta: {
      backgroundColor: theme.electricBlue,
      paddingVertical: 20,
      borderRadius: 32,
      alignItems: 'center',
      marginBottom: 16,
    },
    ctaTxt: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 3 },
    priceCard: {
      backgroundColor: theme.surfaceDark,
      borderRadius: 48,
      padding: 28,
      borderWidth: 1,
      borderColor: theme.borderMuted,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 22,
    },
    priceMeta: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    priceHuge: { fontSize: 52, fontWeight: '900', color: theme.white },
    saveLbl: { fontSize: 11, fontWeight: '900', color: theme.electricBlue, textTransform: 'uppercase' },
    saveVal: { fontSize: 24, fontWeight: '900', color: theme.electricBlue },
    citaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 18,
      backgroundColor: theme.fillSoft,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      marginBottom: 22,
    },
    citaIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: 'rgba(48,112,240,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    citaMeta: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    citaVal: { fontSize: 12, fontWeight: '900', color: theme.white, textTransform: 'uppercase' },
    confirmWhite: {
      backgroundColor: theme.white,
      paddingVertical: 20,
      borderRadius: 28,
      alignItems: 'center',
    },
    confirmWhiteTxt: {
      color: theme.deepNight,
      fontWeight: '900',
      fontSize: 11,
      letterSpacing: 4,
      textTransform: 'uppercase',
    },
    driverCard: {
      backgroundColor: theme.surfaceDark,
      borderRadius: 48,
      padding: 28,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    driverTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 28,
    },
    driverRow: { flexDirection: 'row', alignItems: 'center', gap: 18, flex: 1 },
    driverImg: {
      width: 80,
      height: 80,
      borderRadius: 28,
      borderWidth: 2,
      borderColor: 'rgba(48,112,240,0.3)',
    },
    driverImgPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.deepNight,
      overflow: 'hidden',
    },
    assignedCarrierEyebrow: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkSecondary,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 18,
    },
    assignedCarrierHero: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 18,
      marginBottom: 22,
    },
    driverCompanyMeta: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textOnDarkSecondary,
    },
    driverName: { fontSize: 24, fontWeight: '900', color: theme.white },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      backgroundColor: 'rgba(48,112,240,0.1)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      alignSelf: 'flex-start',
    },
    ratingTxt: { fontSize: 12, fontWeight: '900', color: theme.electricBlue },
    ratingCnt: { fontSize: 11, fontWeight: '700', color: theme.textOnDarkMuted },
    phoneBtn: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.deepNight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    driverStats: {
      flexDirection: 'row',
      gap: 20,
      paddingTop: 22,
      borderTopWidth: 1,
      borderTopColor: theme.borderSubtle,
    },
    dStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    dStatIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.deepNight,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    dStatLbl: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkSecondary,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    dStatVal: { fontSize: 14, fontWeight: '900', color: theme.white, marginTop: 2 },
    finalCard: {
      backgroundColor: theme.surfaceDark,
      borderRadius: 48,
      padding: 28,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    finalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    finalMeta: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkSecondary,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 14 },
    finalPrice: { fontSize: 44, fontWeight: '900', color: theme.electricBlue },
    strike: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.textOnDarkSecondary,
      textDecorationLine: 'line-through',
    },
    matchOk: {
      alignItems: 'center',
      backgroundColor: 'rgba(48,112,240,0.1)',
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(48,112,240,0.2)',
    },
    matchOkTxt: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.electricBlue,
      marginTop: 4,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    finalDivider: { height: 1, backgroundColor: theme.divider, marginVertical: 20 },
    finalCitaLbl: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.textOnDarkSecondary,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    finalCitaVal: { fontSize: 14, fontWeight: '900', color: theme.white, textTransform: 'uppercase' },
    cancelMission: {
      paddingVertical: 20,
      backgroundColor: theme.surfaceDark,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      alignItems: 'center',
      alignSelf: 'stretch',
      marginTop: 8,
    },
    cancelMissionTxt: {
      color: theme.textOnDarkSecondary,
      fontWeight: '900',
      fontSize: 12,
      letterSpacing: 3,
      textTransform: 'uppercase',
    },
    shipmentsModalRoot: {
      flex: 1,
    },
    shipmentsModalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    shipmentsModalOuter: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 36,
      pointerEvents: 'box-none',
    },
    shipmentsModalCard: {
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      maxHeight: '88%',
      backgroundColor: theme.deepNight,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: theme.borderMuted,
      padding: 18,
    },
    shipmentsModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    shipmentsModalClose: {
      padding: 4,
    },
    shipmentsModalScroll: {
      flexGrow: 0,
      maxHeight: 440,
    },
    shipmentsModalScrollContent: {
      paddingBottom: 6,
    },
    myReqTitle: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.gray700,
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 14,
    },
    myReqEmpty: { color: theme.gray600, fontSize: 13, fontWeight: '600', marginBottom: 8 },
    myReqErrText: { color: theme.gray500, fontSize: 12, marginBottom: 8 },
    myReqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 14,
      backgroundColor: theme.surfaceDark,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      marginBottom: 10,
    },
    myReqOrigin: { color: theme.white, fontSize: 15, fontWeight: '800' },
    myReqMeta: { color: theme.gray600, fontSize: 11, fontWeight: '700', marginTop: 4 },
    myReqAction: { color: theme.electricBlue, fontSize: 12, fontWeight: '900' },
    waiting: { alignItems: 'center', paddingVertical: 48 },
    waitingTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: theme.white,
      marginBottom: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    waitingSub: {
      textAlign: 'center',
      color: theme.textOnDarkSecondary,
      fontWeight: '700',
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
      lineHeight: 20,
    },
  });
}

type ClientHomeStyles = ReturnType<typeof stylesFor>;

interface PackageDimsEditorProps {
  draft: DimDraft;
  onChange: (next: DimDraft) => void;
  styles: ClientHomeStyles;
  theme: AppPalette;
}

/**
 * Largo, ancho, alto (cm) y peso (kg).
 * Declarado fuera de `ClientHome` para no recrearse en cada render.
 */
const PackageDimsEditor = React.memo(function PackageDimsEditor({
  draft,
  onChange,
  styles,
  theme,
}: PackageDimsEditorProps) {
  const set =
    (key: keyof DimDraft) =>
    (text: string): void => {
      onChange({ ...draft, [key]: text });
    };
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.dimGrid}>
        {(
          [
            ['lengthCm', 'Largo'],
            ['widthCm', 'Ancho'],
            ['heightCm', 'Alto'],
          ] as const
        ).map(([key, lbl]) => (
          <View key={key} style={styles.dimCell}>
            <Text style={styles.dimFieldLbl}>{lbl} (cm)</Text>
            <TextInput
              value={draft[key]}
              onChangeText={set(key)}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.inputPlaceholder}
              style={styles.dimInput}
            />
          </View>
        ))}
      </View>
      <View>
        <Text style={styles.dimFieldLbl}>Peso (kg)</Text>
        <TextInput
          value={draft.weightKg}
          onChangeText={set('weightKg')}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={theme.inputPlaceholder}
          style={styles.dimInput}
        />
      </View>
    </View>
  );
});

export default function ClientHome({ lang, step, onStepChange, onBack, onOpenLegalHelp }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => stylesFor(theme), [theme]);
  const insets = useSafeAreaInsets();
  /** Franja mínima bajo el sheet (cap del safe area para no duplicar hueco enorme). */
  const sheetBottomAir = 8 + Math.min(insets.bottom, 12);
  const tr = useT();
  const user = useAppStore((s) => s.user);
  const openAccountSettings = useAppStore((s) => s.openAccountSettings);
  const clientTrackingRequestId = useAppStore((s) => s.clientTrackingRequestId);
  const setClientTrackingRequestId = useAppStore((s) => s.setClientTrackingRequestId);
  const { goToGoogleLogin } = useAuthUpsellNavigation();
  const [showAuthUpsell, setShowAuthUpsell] = useState(false);
  const [origin, setOrigin] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('express');
  const [expressDest, setExpressDest] = useState('');
  /**
   * Snapshot que pintará el mapa. Se actualiza solo en dos casos:
   *   1) El usuario elige una sugerencia del autocompletado (las coords ya
   *      están precacheadas → 0 peticiones a Mapbox).
   *   2) El usuario pulsa el botón "Mostrar en el mapa" tras escribir una
   *      dirección a mano (1 petición de geocoding + 1 de directions).
   * Mientras el usuario teclea no pasa nada → 0 consumo.
   */
  const [mapSnapshot, setMapSnapshot] = useState<{ origin: string; destinations: string[] }>({
    origin: '',
    destinations: [],
  });
  const [expressDims, setExpressDims] = useState<DimDraft>(EMPTY_DRAFT);
  const [expressPhotoUri, setExpressPhotoUri] = useState<string | null>(null);
  const [packages, setPackages] = useState<ProgramRow[]>([{ id: '1', destination: '', ...EMPTY_DRAFT }]);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState('10:00-12:00');
  const [isOpenRouteEnabled, setIsOpenRouteEnabled] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [hasSimulatedMatch, setHasSimulatedMatch] = useState(false);
  const [showMatchNotification, setShowMatchNotification] = useState(false);
  const [showCarrierInfo, setShowCarrierInfo] = useState(false);
  /** ID del envío confirmado; alimenta seguimiento en vivo con Firestore. */
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [showShipmentsModal, setShowShipmentsModal] = useState(false);
  const [missionDeleteInFlight, setMissionDeleteInFlight] = useState(false);

  const trackStep = step === 'tracking' || step === 'reservation-confirmed';

  const commitActiveRequestId = useCallback(
    (id: string | null) => {
      setActiveRequestId(id);
      setClientTrackingRequestId(id);
    },
    [setClientTrackingRequestId]
  );

  useEffect(() => {
    if (!trackStep) return;
    if (!activeRequestId && clientTrackingRequestId) {
      setActiveRequestId(clientTrackingRequestId);
    }
  }, [trackStep, activeRequestId, clientTrackingRequestId]);

  const useLiveRequestDoc = isFirebaseConfigured() && activeRequestId != null && trackStep;
  const { rows: myRequests, error: myRequestsError } = useClientRequestList(
    isFirebaseConfigured() && user ? user.uid : undefined
  );
  const { data: liveRequest, error: liveRequestError } = useShippingRequestDocument(
    activeRequestId,
    useLiveRequestDoc
  );

  const assignedCarrierLive = useMemo(() => {
    if (!liveRequest) return null;
    return parseAssignedCarrier(liveRequest['assignedCarrier']);
  }, [liveRequest]);

  const carrierLngLatLive = useMemo((): [number, number] | null => {
    if (!trackStep || !liveRequest) return null;
    return parseCarrierLngLat(liveRequest['carrierLocation']);
  }, [trackStep, liveRequest]);

  useEffect(() => {
    if (!trackStep || !liveRequest) return;
    const snap = liveRequestToMapSnapshot(liveRequest as Record<string, unknown>);
    if (snap) setMapSnapshot(snap);
  }, [trackStep, liveRequest]);

  const trackingFromFirestore = trackStep && isFirebaseConfigured() && activeRequestId != null;

  const mapProgrammed = useMemo(() => {
    if (trackingFromFirestore && liveRequest?.['serviceType'] === 'programmed') return true;
    if (trackingFromFirestore && liveRequest?.['serviceType'] === 'express') return false;
    return serviceType === 'programmed';
  }, [trackingFromFirestore, liveRequest, serviceType]);

  const mapOpenRoute = useMemo(() => {
    if (trackingFromFirestore && typeof liveRequest?.['openRoutePreferred'] === 'boolean') {
      return Boolean(liveRequest['openRoutePreferred']);
    }
    return isOpenRouteEnabled;
  }, [trackingFromFirestore, liveRequest, isOpenRouteEnabled]);

  useEffect(() => {
    if (step !== 'home') setShowShipmentsModal(false);
  }, [step]);

  useEffect(() => {
    if (!useLiveRequestDoc) return;
    if (!liveRequest) {
      setShowCarrierInfo(false);
      return;
    }
    const st = parseRequestStatus(liveRequest['status']);
    setShowCarrierInfo(st === 'assigned');
  }, [useLiveRequestDoc, liveRequest]);

  useClientMissionSimulation(
    step,
    isOpenRouteEnabled,
    hasSimulatedMatch,
    setIsSimulationActive,
    setShowMatchNotification,
    setShowCarrierInfo,
    setHasSimulatedMatch,
    useLiveRequestDoc
  );

  const scheduleTariffReview = useReviewTariffDelay();

  const onUpsellContinueGoogle = useCallback(async () => {
    setShowAuthUpsell(false);
    await goToGoogleLogin({ step: 'home', profile: 'client' });
  }, [goToGoogleLogin]);

  /**
   * Lista de destinos en función del modo (express vs programado). Se reutiliza
   * para validar diffs con el snapshot del mapa y para enviarlo al actualizar.
   */
  const currentDestinations = useMemo(() => {
    if (serviceType === 'express') {
      const t = expressDest.trim();
      return t ? [t] : [];
    }
    return packages.map((p) => p.destination.trim()).filter((d) => d.length > 4);
  }, [serviceType, expressDest, packages]);

  const mapDirty = useMemo(() => {
    if (origin.trim() !== mapSnapshot.origin.trim()) return true;
    if (currentDestinations.length !== mapSnapshot.destinations.length) return true;
    return currentDestinations.some((d, i) => d !== mapSnapshot.destinations[i]);
  }, [origin, currentDestinations, mapSnapshot]);

  /** Confirmar la vista del mapa con los textos actuales del formulario. */
  const refreshMapView = useCallback(() => {
    setMapSnapshot({ origin: origin.trim(), destinations: currentDestinations });
  }, [origin, currentDestinations]);

  /** Substitución parcial del snapshot (al elegir una sugerencia individual). */
  const commitMapPatch = useCallback((patch: Partial<{ origin: string; destinations: string[] }>) => {
    setMapSnapshot((prev) => ({
      origin: patch.origin ?? prev.origin,
      destinations: patch.destinations ?? prev.destinations,
    }));
  }, []);

  // Si el usuario cambia entre express/programado, descartamos los destinos
  // del modo anterior en el mapa para no mostrar info incoherente.
  useEffect(() => {
    setMapSnapshot((prev) => ({ origin: prev.origin, destinations: [] }));
  }, [serviceType]);

  const expressSpecsParsed = useMemo(() => parseDraft(expressDims), [expressDims]);

  const programmedItems: PackageItem[] = useMemo(() => {
    return packages
      .map((p) => {
        const specs = parseDraft({
          lengthCm: p.lengthCm,
          widthCm: p.widthCm,
          heightCm: p.heightCm,
          weightKg: p.weightKg,
        });
        if (!specs) return null;
        return { id: p.id, destination: p.destination, specs };
      })
      .filter((x): x is PackageItem => x != null);
  }, [packages]);

  const tariffInputsReady = useMemo(() => {
    if (!origin.trim()) return false;
    if (serviceType === 'express') {
      return Boolean(expressSpecsParsed && expressDest.trim().length > 0);
    }
    if (packages.length === 0) return false;
    return packages.every((p) => {
      if (!p.destination.trim()) return false;
      return (
        parseDraft({
          lengthCm: p.lengthCm,
          widthCm: p.widthCm,
          heightCm: p.heightCm,
          weightKg: p.weightKg,
        }) != null
      );
    });
  }, [origin, serviceType, expressSpecsParsed, expressDest, packages]);

  const priceResult = useMemo(() => {
    if (trackingFromFirestore && liveRequest) {
      return priceResultFromLiveRequest(liveRequest as Record<string, unknown>);
    }
    if (serviceType === 'express') {
      if (!expressSpecsParsed) {
        return { full: '0.00', final: '0.00', savings: '0.00', count: 1 };
      }
      return computeMissionPrice({
        serviceType: 'express',
        expressSpecs: expressSpecsParsed,
        hasSimulatedMatch,
      });
    }
    if (programmedItems.length !== packages.length || programmedItems.length === 0) {
      return { full: '0.00', final: '0.00', savings: '0.00', count: packages.length };
    }
    return computeMissionPrice({
      serviceType: 'programmed',
      packages: programmedItems,
      hasSimulatedMatch,
    });
  }, [
    trackingFromFirestore,
    liveRequest,
    packages.length,
    programmedItems,
    serviceType,
    expressSpecsParsed,
    hasSimulatedMatch,
  ]);

  const trackingDateOffset = useMemo(() => {
    if (trackingFromFirestore && liveRequest && typeof liveRequest['selectedDateOffset'] === 'number') {
      return liveRequest['selectedDateOffset'] as number;
    }
    return selectedDate;
  }, [trackingFromFirestore, liveRequest, selectedDate]);

  const trackingSlot = useMemo(() => {
    if (trackingFromFirestore && liveRequest && typeof liveRequest['timeSlot'] === 'string') {
      return liveRequest['timeSlot'] as string;
    }
    return selectedSlot;
  }, [trackingFromFirestore, liveRequest, selectedSlot]);

  const showCollectiveMatchUi = useMemo(() => {
    if (trackingFromFirestore && liveRequest) {
      return Boolean(liveRequest['hasSimulatedMatch']);
    }
    return hasSimulatedMatch;
  }, [trackingFromFirestore, liveRequest, hasSimulatedMatch]);

  const confirmMissionOrUpsell = useCallback(async () => {
    if (requiresGoogleSignIn(user)) {
      setShowAuthUpsell(true);
      return;
    }
    const uid = user?.uid;
    if (!uid) return;
    if (serviceType === 'express' && !expressSpecsParsed) return;
    if (serviceType === 'programmed' && programmedItems.length !== packages.length) return;

    let uploadWarn = false;
    let expressPhotoUrl: string | undefined;
    if (isFirebaseConfigured() && serviceType === 'express' && expressPhotoUri) {
      const url = await uploadPackagePhotoForUser(uid, expressPhotoUri);
      if (url) expressPhotoUrl = url;
      else uploadWarn = true;
    }

    let packagesForCreate: PackageItem[] = programmedItems;
    if (isFirebaseConfigured() && serviceType === 'programmed') {
      const built: PackageItem[] = [];
      for (const row of packages) {
        const specs = parseDraft({
          lengthCm: row.lengthCm,
          widthCm: row.widthCm,
          heightCm: row.heightCm,
          weightKg: row.weightKg,
        });
        if (!specs) return;
        let image: string | undefined;
        if (row.photoUri) {
          const url = await uploadPackagePhotoForUser(uid, row.photoUri);
          if (url) image = url;
          else uploadWarn = true;
        }
        built.push({ id: row.id, destination: row.destination.trim(), specs, image });
      }
      packagesForCreate = built;
    }

    if (uploadWarn) {
      Alert.alert('', tr('clientHome.photoUploadFailed'));
    }

    const payload =
      serviceType === 'express'
        ? buildShippingRequestPayload({
            lang,
            serviceType: 'express',
            origin,
            expressDestination: expressDest,
            expressPackage: expressSpecsParsed!,
            ...(expressPhotoUrl ? { expressPackagePhotoUrl: expressPhotoUrl } : {}),
            selectedDateOffset: selectedDate,
            timeSlot: selectedSlot,
            openRoutePreferred: isOpenRouteEnabled,
            priceResult,
            hasSimulatedMatch,
          })
        : buildShippingRequestPayload({
            lang,
            serviceType: 'programmed',
            origin,
            packages: packagesForCreate,
            selectedDateOffset: selectedDate,
            timeSlot: selectedSlot,
            openRoutePreferred: isOpenRouteEnabled,
            priceResult,
            hasSimulatedMatch,
          });
    const savedId = await createShippingRequest(uid, payload);
    if (isFirebaseConfigured() && savedId === null) {
      Alert.alert('', tr('clientHome.requestSaveFailed'));
    } else if (savedId) {
      commitActiveRequestId(savedId);
    }

    setExpressPhotoUri(null);
    onStepChange(serviceType === 'express' ? 'tracking' : 'reservation-confirmed');
  }, [
    user,
    lang,
    serviceType,
    origin,
    expressDest,
    expressSpecsParsed,
    expressPhotoUri,
    programmedItems,
    packages,
    selectedDate,
    selectedSlot,
    isOpenRouteEnabled,
    priceResult,
    hasSimulatedMatch,
    onStepChange,
    tr,
    commitActiveRequestId,
  ]);

  const finishCancelMissionLocally = useCallback(() => {
    setShowMatchNotification(false);
    commitActiveRequestId(null);
    setHasSimulatedMatch(false);
    setShowCarrierInfo(false);
    setMapSnapshot({ origin: '', destinations: [] });
    onStepChange('home');
  }, [commitActiveRequestId, onStepChange]);

  const executeCancelMission = useCallback(async () => {
    const rid = activeRequestId;
    if (!rid) {
      finishCancelMissionLocally();
      return;
    }
    if (!isFirebaseConfigured()) {
      const m = tr('clientHome.cancelMissionErrNotConfigured');
      if (Platform.OS === 'web') window.alert(m);
      else Alert.alert('', m);
      finishCancelMissionLocally();
      return;
    }
    setMissionDeleteInFlight(true);
    try {
      await deleteShippingRequestCallable(rid);
      finishCancelMissionLocally();
    } catch (e) {
      const userMsg = messageForDeleteShippingRequestError(e, tr);
      if (Platform.OS === 'web') window.alert(userMsg);
      else Alert.alert('', userMsg);
    } finally {
      setMissionDeleteInFlight(false);
    }
  }, [activeRequestId, finishCancelMissionLocally, tr]);

  const promptCancelMission = useCallback(() => {
    Alert.alert(tr('clientHome.cancelMissionConfirmTitle'), tr('clientHome.cancelMissionConfirmMessage'), [
      { text: tr('common.cancel'), style: 'cancel' },
      {
        text: tr('clientHome.cancelMissionConfirmDelete'),
        style: 'destructive',
        onPress: () => {
          void executeCancelMission();
        },
      },
    ]);
  }, [tr, executeCancelMission]);

  const getDayLabel = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d
      .toLocaleDateString(lang === 'ca' ? 'ca-ES' : 'es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
      .toUpperCase();
  };

  const timeSlots = [
    '08:00-10:00',
    '10:00-12:00',
    '12:00-14:00',
    '14:00-16:00',
    '16:00-18:00',
    '18:00-20:00',
    '20:00-22:00',
  ];

  const mapHCompact = step === 'home' ? WIN_H * 0.22 : WIN_H * 0.38;
  const [clientRootLayoutH, setClientRootLayoutH] = useState(WIN_H);
  const [mapExpanded, setMapExpanded] = useState(false);
  const mapHeightAnim = useRef(new Animated.Value(mapHCompact)).current;

  useEffect(() => {
    Animated.timing(mapHeightAnim, {
      toValue: mapExpanded ? Math.max(clientRootLayoutH, mapHCompact) : mapHCompact,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [mapExpanded, mapHCompact, clientRootLayoutH, mapHeightAnim]);

  // Si el step cambia (p. ej. confirmación), volvemos al estado compacto.
  useEffect(() => {
    setMapExpanded(false);
  }, [step]);

  const toggleMapExpanded = useCallback(() => setMapExpanded((v) => !v), []);

  const onDimsChangeExpress = useCallback((next: DimDraft) => {
    setExpressDims(next);
    setShowPrice(false);
  }, []);

  const onDimsChangePackage = useCallback((id: string, next: DimDraft) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...next } : p)));
    setShowPrice(false);
  }, []);

  const pickExpressPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    const a0 = res.assets?.[0];
    if (!res.canceled && a0?.uri) setExpressPhotoUri(a0.uri);
  }, []);

  const pickStopPhoto = useCallback(async (pkgId: string) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    const uri = res.assets?.[0]?.uri;
    if (!res.canceled && uri) {
      setPackages((prev) => prev.map((p) => (p.id === pkgId ? { ...p, photoUri: uri } : p)));
    }
  }, []);

  return (
    <View style={styles.root} onLayout={(e) => setClientRootLayoutH(e.nativeEvent.layout.height)}>
      <AuthUpsellModal
        visible={showAuthUpsell}
        onCancel={() => setShowAuthUpsell(false)}
        onContinueGoogle={onUpsellContinueGoogle}
      />
      <Modal
        visible={showShipmentsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShipmentsModal(false)}
      >
        <View style={styles.shipmentsModalRoot}>
          <Pressable
            style={styles.shipmentsModalBackdrop}
            accessibilityRole="button"
            accessibilityLabel={tr('common.cancel')}
            onPress={() => setShowShipmentsModal(false)}
          />
          <View style={styles.shipmentsModalOuter}>
            <View style={styles.shipmentsModalCard} accessibilityLabel={tr('clientHome.myShipments')}>
              <View style={styles.shipmentsModalHeader}>
                <Text style={[styles.myReqTitle, { marginBottom: 0, flex: 1 }]} numberOfLines={2}>
                  {tr('clientHome.myShipments')}
                </Text>
                <Pressable
                  onPress={() => setShowShipmentsModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel={tr('common.cancel')}
                  hitSlop={12}
                  style={({ pressed }) => [styles.shipmentsModalClose, pressed && { opacity: 0.7 }]}
                >
                  <X color={theme.gray500} size={22} />
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.shipmentsModalScroll}
                contentContainerStyle={styles.shipmentsModalScrollContent}
              >
                {myRequestsError ? (
                  <Text style={styles.myReqErrText}>{tr('clientHome.myShipmentsError')}</Text>
                ) : null}
                {!myRequestsError && myRequests.length === 0 ? (
                  <Text style={styles.myReqEmpty}>{tr('clientHome.myShipmentsEmpty')}</Text>
                ) : null}
                {myRequests.map((row) => {
                  const st0 = parseRequestStatus(row.data['status']) ?? 'pending';
                  const stLabel =
                    st0 === 'pending'
                      ? tr('clientHome.statusPending')
                      : st0 === 'searching_carrier'
                        ? tr('clientHome.statusSearching')
                        : st0 === 'assigned'
                          ? tr('clientHome.statusAssigned')
                          : tr('clientHome.statusCancelled');
                  const stype =
                    row.data['serviceType'] === 'programmed' ? 'reservation-confirmed' : 'tracking';
                  return (
                    <Pressable
                      key={row.id}
                      onPress={() => {
                        setShowShipmentsModal(false);
                        commitActiveRequestId(row.id);
                        onStepChange(stype);
                      }}
                      style={({ pressed }) => [styles.myReqRow, pressed && { opacity: 0.9 }]}
                      accessibilityRole="button"
                      accessibilityLabel={tr('clientHome.openShipment')}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.myReqOrigin} numberOfLines={1}>
                          {String(row.data['origin'] ?? '—')}
                        </Text>
                        <Text style={styles.myReqMeta} numberOfLines={1}>
                          {stLabel} · {row.id.slice(0, 8)}…
                        </Text>
                      </View>
                      <Text style={styles.myReqAction}>{tr('clientHome.openShipment')}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
      {showMatchNotification ? (
        <View style={styles.matchBanner}>
          <View style={styles.matchIcon}>
            <Users color="#fff" size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.matchTitle}>¡Ahorro Colectivo Aplicado!</Text>
            <Text style={styles.matchSub}>Alguien se ha unido a tu ruta</Text>
          </View>
          <Pressable
            onPress={() => setShowMatchNotification(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar notificación"
          >
            <X color={theme.gray500} size={18} />
          </Pressable>
        </View>
      ) : null}

      <Animated.View style={[styles.mapWrap, { height: mapHeightAnim }]}>
        <ClientDiscoveryMap
          isTracking={showCarrierInfo}
          isProgrammed={mapProgrammed}
          isOpenRoute={mapOpenRoute}
          originSet={mapSnapshot.origin.length > 4}
          originAddress={mapSnapshot.origin}
          destinations={mapSnapshot.destinations}
          carrierLngLat={carrierLngLatLive}
          suppressMockCarrier={trackingFromFirestore}
          bottomFade={false}
          bottomChromeInsetPx={
            mapExpanded ? MAP_WEB_BOTTOM_CHROME_RESERVE_PX : MAP_WEB_COMPACT_SHEET_RESERVE_PX
          }
        />
        <Pressable
          style={styles.backFloating}
          accessibilityRole="button"
          accessibilityLabel={step === 'home' ? 'Volver al perfil' : 'Volver al inicio del envío'}
          onPress={
            step === 'home'
              ? onBack
              : () => {
                  onStepChange('home');
                  commitActiveRequestId(null);
                  setHasSimulatedMatch(false);
                  setShowCarrierInfo(false);
                }
          }
        >
          <ChevronLeft color={theme.white} size={24} />
        </Pressable>
        <Pressable
          style={styles.profileFloating}
          accessibilityRole="button"
          accessibilityLabel={tr('accountSettings.title')}
          onPress={openAccountSettings}
        >
          <User color={theme.white} size={24} />
        </Pressable>
        {isFirebaseConfigured() && user && step === 'home' ? (
          <Pressable
            style={styles.shipmentsFloating}
            accessibilityRole="button"
            accessibilityLabel={tr('clientHome.myShipmentsFabA11y')}
            onPress={() => setShowShipmentsModal(true)}
          >
            <ClipboardList color={theme.white} size={24} />
          </Pressable>
        ) : null}
        <Pressable
          style={styles.helpFloating}
          accessibilityRole="button"
          accessibilityLabel={legalA11y[lang]}
          onPress={onOpenLegalHelp}
        >
          <HelpCircle color={theme.white} size={24} />
        </Pressable>
        {isSimulationActive ? (
          <View style={styles.simOverlay}>
            <View style={styles.simCard}>
              <ActivityIndicator color={theme.electricBlue} />
              <Text style={styles.simTxt}>Buscando ahorro colectivo...</Text>
            </View>
          </View>
        ) : null}
        {mapExpanded ? (
          <Pressable
            onPress={toggleMapExpanded}
            accessibilityRole="button"
            accessibilityLabel="Cerrar el mapa y volver al formulario"
            style={({ pressed }) => [styles.mapCollapseBtn, pressed && { opacity: 0.85 }]}
          >
            <ChevronDown color={theme.white} size={22} />
            <Text style={styles.mapCollapseTxt}>Cerrar mapa</Text>
          </Pressable>
        ) : null}
      </Animated.View>

      {step === 'home' ? (
        <View style={styles.sheetOuter}>
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            <Pressable
              onPress={toggleMapExpanded}
              accessibilityRole="button"
              accessibilityLabel={mapExpanded ? 'Cerrar mapa' : 'Abrir mapa a pantalla completa'}
              hitSlop={20}
              style={styles.handleHit}
            >
              <View style={styles.handle} />
            </Pressable>
            <View style={styles.modeTabs}>
              <Pressable
                onPress={() => {
                  setServiceType('express');
                  setShowPrice(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Modo express"
                accessibilityState={{ selected: serviceType === 'express' }}
                style={[styles.modeTab, serviceType === 'express' && styles.modeTabOn]}
              >
                <Zap color={serviceType === 'express' ? '#fff' : theme.textOnDarkMuted} size={18} />
                <Text style={[styles.modeTabTxt, serviceType === 'express' && { color: '#fff' }]}>
                  EXPRESS
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setServiceType('programmed');
                  setShowPrice(false);
                }}
                accessibilityRole="button"
                accessibilityLabel="Modo programado"
                accessibilityState={{ selected: serviceType === 'programmed' }}
                style={[styles.modeTab, serviceType === 'programmed' && styles.modeTabOn]}
              >
                <Package color={serviceType === 'programmed' ? '#fff' : theme.textOnDarkMuted} size={18} />
                <Text style={[styles.modeTabTxt, serviceType === 'programmed' && { color: '#fff' }]}>
                  PROGRAMAR
                </Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLbl}>Origen de Recogida</Text>
            <View style={[styles.inputCard, styles.inputCardOrigin]}>
              <View style={styles.dotB} />
              <AddressAutocompleteInput
                value={origin}
                onChangeText={setOrigin}
                onSelectSuggestion={(s) => commitMapPatch({ origin: s.placeName })}
                placeholder="Dirección en Barcelona"
                accessibilityLabel="Dirección de origen"
                containerStyle={{ flex: 1 }}
                inputStyle={styles.input}
              />
              <LocateFixed color={theme.gray700} size={16} />
            </View>

            {serviceType === 'express' ? (
              <View style={{ gap: 22 }}>
                <Text style={styles.fieldLbl}>Destino Directo</Text>
                <View style={[styles.inputCard, styles.inputCardDestination]}>
                  <View style={styles.dotO} />
                  <AddressAutocompleteInput
                    value={expressDest}
                    onChangeText={setExpressDest}
                    onSelectSuggestion={(s) => commitMapPatch({ destinations: [s.placeName] })}
                    placeholder="¿A dónde enviamos?"
                    accessibilityLabel="Dirección de destino"
                    containerStyle={{ flex: 1 }}
                    inputStyle={styles.input}
                  />
                  <Search color={theme.gray700} size={16} />
                </View>
                {mapDirty ? (
                  <Pressable
                    onPress={refreshMapView}
                    accessibilityRole="button"
                    accessibilityLabel="Mostrar la dirección actual en el mapa"
                    style={({ pressed }) => [styles.mapRefreshBtn, pressed && { opacity: 0.85 }]}
                  >
                    <MapPin color={theme.electricBlue} size={14} />
                    <Text style={styles.mapRefreshTxt}>Mostrar en el mapa</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.fieldLbl}>Medidas del paquete (cm) y peso (kg)</Text>
                <PackageDimsEditor
                  draft={expressDims}
                  onChange={onDimsChangeExpress}
                  styles={styles}
                  theme={theme}
                />
                <Text style={[styles.fieldLbl, { marginTop: 6 }]}>
                  {tr('clientHome.optionalPackagePhoto')}
                </Text>
                {expressPhotoUri ? (
                  <View style={styles.addPhotoSelectedCard}>
                    <Image
                      source={{ uri: expressPhotoUri }}
                      style={styles.addPhotoThumb}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => setExpressPhotoUri(null)}
                      accessibilityRole="button"
                      accessibilityLabel={tr('clientHome.removePhoto')}
                      style={({ pressed }) => [styles.addPhotoRemoveBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={styles.addPhotoRemoveTxt}>{tr('clientHome.removePhoto')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => void pickExpressPhoto()}
                    style={({ pressed }) => [styles.addPhotoBtn, pressed && styles.addPhotoBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={tr('clientHome.addPackagePhoto')}
                  >
                    <View style={styles.addPhotoIconWrap}>
                      <Camera color={theme.electricBlue} size={24} />
                    </View>
                    <Text style={styles.addPhotoBtnLabel}>{tr('clientHome.addPackagePhoto')}</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <View style={{ gap: 22 }}>
                <Text style={styles.fieldLbl}>Agenda de Recogida</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.daysScroll}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                    const parts = getDayLabel(offset).split(' ');
                    return (
                      <Pressable
                        key={offset}
                        onPress={() => setSelectedDate(offset)}
                        accessibilityRole="button"
                        accessibilityLabel={`Día ${getDayLabel(offset)}`}
                        accessibilityState={{ selected: selectedDate === offset }}
                        style={[styles.dayPill, selectedDate === offset && styles.dayPillOn]}
                      >
                        <Text style={[styles.dayPillSm, selectedDate === offset && { color: '#fff' }]}>
                          {parts[0]}
                        </Text>
                        <Text style={[styles.dayPillLg, selectedDate === offset && { color: '#fff' }]}>
                          {parts[1]} {parts[2]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={styles.slotGrid}>
                  {timeSlots.map((slot) => (
                    <Pressable
                      key={slot}
                      onPress={() => setSelectedSlot(slot)}
                      accessibilityRole="button"
                      accessibilityLabel={`Franja horaria ${slot}`}
                      accessibilityState={{ selected: selectedSlot === slot }}
                      style={[styles.slotBtn, selectedSlot === slot && styles.slotBtnOn]}
                    >
                      <Text style={[styles.slotTxt, selectedSlot === slot && { color: theme.electricBlue }]}>
                        {slot}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.fieldLbl}>Logística de Paradas</Text>
                {packages.map((pkg, idx) => (
                  <View
                    key={pkg.id}
                    style={[
                      styles.stopCard,
                      /**
                       * z-index decreciente por parada: el dropdown de la primera
                       * parada queda por encima del de la segunda y así
                       * sucesivamente. Sin esto, los hermanos posteriores tapan
                       * el desplegable de la sugerencia.
                       */
                      { zIndex: 200 - idx * 10 },
                    ]}
                  >
                    <View style={styles.stopHead}>
                      <View style={styles.stopNum}>
                        <Text style={styles.stopNumTxt}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stopTitle}>Parada {idx + 1}</Text>
                      <Pressable
                        onPress={() => setPackages(packages.filter((p) => p.id !== pkg.id))}
                        accessibilityRole="button"
                        accessibilityLabel={`Eliminar parada ${idx + 1}`}
                      >
                        <Trash2 color={theme.gray800} size={18} />
                      </Pressable>
                    </View>
                    <View style={styles.stopInput}>
                      <MapPin color={theme.gray700} size={16} />
                      <AddressAutocompleteInput
                        value={pkg.destination}
                        onChangeText={(txt) =>
                          setPackages(packages.map((p) => (p.id === pkg.id ? { ...p, destination: txt } : p)))
                        }
                        onSelectSuggestion={(s) => {
                          const nextPackages = packages.map((p) =>
                            p.id === pkg.id ? { ...p, destination: s.placeName } : p
                          );
                          setPackages(nextPackages);
                          const dests = nextPackages
                            .map((p) => p.destination.trim())
                            .filter((d) => d.length > 4);
                          commitMapPatch({ destinations: dests });
                        }}
                        placeholder="Dirección de entrega"
                        accessibilityLabel={`Dirección de la parada ${idx + 1}`}
                        containerStyle={{ flex: 1 }}
                        inputStyle={styles.inputSm}
                      />
                    </View>
                    <Text style={styles.dimLbl}>Medidas (cm) y peso (kg)</Text>
                    <PackageDimsEditor
                      draft={{
                        lengthCm: pkg.lengthCm,
                        widthCm: pkg.widthCm,
                        heightCm: pkg.heightCm,
                        weightKg: pkg.weightKg,
                      }}
                      onChange={(next) => onDimsChangePackage(pkg.id, next)}
                      styles={styles}
                      theme={theme}
                    />
                    <Text style={[styles.dimLbl, { marginTop: 10 }]}>
                      {tr('clientHome.optionalPackagePhoto')}
                    </Text>
                    {pkg.photoUri ? (
                      <View style={styles.addPhotoSelectedCard}>
                        <Image
                          source={{ uri: pkg.photoUri }}
                          style={styles.addPhotoThumbStop}
                          contentFit="cover"
                        />
                        <Pressable
                          onPress={() =>
                            setPackages((prev) =>
                              prev.map((p) => (p.id === pkg.id ? { ...p, photoUri: null } : p))
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel={tr('clientHome.removePhoto')}
                          style={({ pressed }) => [styles.addPhotoRemoveBtn, pressed && { opacity: 0.85 }]}
                        >
                          <Text style={styles.addPhotoRemoveTxt}>{tr('clientHome.removePhoto')}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => void pickStopPhoto(pkg.id)}
                        style={({ pressed }) => [
                          styles.addPhotoBtn,
                          styles.addPhotoBtnCompact,
                          pressed && styles.addPhotoBtnPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={tr('clientHome.addPackagePhoto')}
                      >
                        <View style={styles.addPhotoIconWrap}>
                          <Camera color={theme.electricBlue} size={22} />
                        </View>
                        <Text style={styles.addPhotoBtnLabel}>{tr('clientHome.addPackagePhoto')}</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
                <Pressable
                  onPress={() => {
                    if (packages.length >= MAX_PROGRAMMED_STOPS) return;
                    setPackages([
                      ...packages,
                      { id: Math.random().toString(), destination: '', ...EMPTY_DRAFT },
                    ]);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Añadir parada"
                  style={styles.addStop}
                >
                  <Text style={styles.addStopTxt}>+ Añadir Parada</Text>
                </Pressable>
                {mapDirty ? (
                  <Pressable
                    onPress={refreshMapView}
                    accessibilityRole="button"
                    accessibilityLabel="Mostrar las paradas actuales en el mapa"
                    style={({ pressed }) => [styles.mapRefreshBtn, pressed && { opacity: 0.85 }]}
                  >
                    <MapPin color={theme.electricBlue} size={14} />
                    <Text style={styles.mapRefreshTxt}>Mostrar en el mapa</Text>
                  </Pressable>
                ) : null}
              </View>
            )}

            <Pressable
              onPress={() => {
                setIsOpenRouteEnabled(!isOpenRouteEnabled);
                setShowPrice(false);
              }}
              accessibilityRole="switch"
              accessibilityLabel="Modo Open Route"
              accessibilityState={{ checked: isOpenRouteEnabled }}
              style={[styles.openRow, isOpenRouteEnabled && styles.openRowOn]}
            >
              <View style={styles.openLeft}>
                <View
                  style={[styles.openIcon, isOpenRouteEnabled && { backgroundColor: theme.electricBlue }]}
                >
                  <Users color={isOpenRouteEnabled ? '#fff' : theme.gray700} size={24} />
                </View>
                <View>
                  <Text style={[styles.openTitle, isOpenRouteEnabled && { color: theme.electricBlue }]}>
                    MODO OPEN ROUTE ACTIVADO
                  </Text>
                  <Text style={styles.openSub}>Comparte carga • Ahorra 35%</Text>
                </View>
              </View>
              <View style={[styles.checkOuter, isOpenRouteEnabled && styles.checkOuterOn]}>
                {isOpenRouteEnabled ? <Check color="#fff" size={16} /> : null}
              </View>
            </Pressable>

            {!showPrice ? (
              <Pressable
                onPress={() => {
                  setIsCalculating(true);
                  scheduleTariffReview(() => {
                    setIsCalculating(false);
                    setShowPrice(true);
                  });
                }}
                disabled={isCalculating || !tariffInputsReady}
                accessibilityRole="button"
                accessibilityLabel="Revisar tarifa del envío"
                style={[styles.cta, (!tariffInputsReady || isCalculating) && { opacity: 0.25 }]}
              >
                {isCalculating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ctaTxt}>REVISAR TARIFA</Text>
                )}
              </Pressable>
            ) : (
              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.priceMeta}>{priceResult.count} Bultos • Resumen Misión</Text>
                    <Text style={styles.priceHuge}>
                      {isOpenRouteEnabled ? priceResult.full : priceResult.final}€
                    </Text>
                  </View>
                  {isOpenRouteEnabled ? (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.saveLbl}>Ahorro Aplicado</Text>
                      <Text style={styles.saveVal}>-{priceResult.savings}€</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.citaRow}>
                  <View style={styles.citaIcon}>
                    <Calendar color={theme.electricBlue} size={24} />
                  </View>
                  <View>
                    <Text style={styles.citaMeta}>Cita Programada</Text>
                    <Text style={styles.citaVal}>
                      {getDayLabel(selectedDate)} | {selectedSlot}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={confirmMissionOrUpsell}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar misión"
                  style={styles.confirmWhite}
                >
                  <Text style={styles.confirmWhiteTxt}>Confirmar Misión</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
          <View
            pointerEvents="none"
            accessible={false}
            style={{ height: sheetBottomAir, backgroundColor: theme.bgRoot }}
          />
        </View>
      ) : (
        <View style={styles.sheetOuter}>
          <ScrollView style={styles.sheet} contentContainerStyle={styles.statusContent}>
            <Pressable
              onPress={toggleMapExpanded}
              accessibilityRole="button"
              accessibilityLabel={mapExpanded ? 'Cerrar mapa' : 'Abrir mapa a pantalla completa'}
              hitSlop={20}
              style={styles.handleHit}
            >
              <View style={styles.handle} />
            </Pressable>
            {showCarrierInfo ? (
              <View style={{ gap: 20 }}>
                {useLiveRequestDoc ? (
                  assignedCarrierLive ? (
                    <View style={styles.driverCard}>
                      <Text style={styles.assignedCarrierEyebrow}>{tr('clientHome.statusAssigned')}</Text>
                      <View style={styles.assignedCarrierHero}>
                        {assignedCarrierLive.photoUrl ? (
                          <Image
                            source={{ uri: assignedCarrierLive.photoUrl }}
                            style={styles.driverImg}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.driverImg, styles.driverImgPlaceholder]}>
                            <User color={theme.gray600} size={34} />
                          </View>
                        )}
                        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                          <Text style={styles.driverName} numberOfLines={2}>
                            {assignedCarrierLive.name.trim() || tr('clientHome.assignedCarrierNameFallback')}
                          </Text>
                          {assignedCarrierLive.company.trim() ? (
                            <Text style={styles.driverCompanyMeta} numberOfLines={2}>
                              {assignedCarrierLive.company}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.driverStats}>
                        <View style={styles.dStat}>
                          <View style={styles.dStatIcon}>
                            <Truck color={theme.electricBlue} size={22} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.dStatLbl}>{tr('clientHome.assignedCarrierVehicle')}</Text>
                            <Text style={styles.dStatVal} numberOfLines={4}>
                              {formatVehicleSummary({
                                brand: assignedCarrierLive.vehicle.brand,
                                model: assignedCarrierLive.vehicle.model,
                                color: assignedCarrierLive.vehicle.color,
                              })}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.dStat}>
                          <View style={styles.dStatIcon}>
                            <ClipboardList color={theme.electricBlue} size={22} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.dStatLbl}>{tr('clientHome.assignedCarrierPlate')}</Text>
                            <Text style={styles.dStatVal} numberOfLines={2}>
                              {assignedCarrierLive.vehicle.licensePlate?.trim()
                                ? assignedCarrierLive.vehicle.licensePlate.trim().toUpperCase()
                                : '—'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.driverCard, { paddingVertical: 20, paddingHorizontal: 18 }]}>
                      <Text style={styles.driverName}>{tr('clientHome.statusAssigned')}</Text>
                      <Text style={[styles.waitingSub, { marginTop: 10, textAlign: 'left' }]}>
                        {tr('clientHome.assignedLine')}
                      </Text>
                    </View>
                  )
                ) : (
                  <View style={styles.driverCard}>
                    <View style={styles.driverTop}>
                      <View style={styles.driverRow}>
                        <Image
                          source={{
                            uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop',
                          }}
                          style={styles.driverImg}
                          contentFit="cover"
                        />
                        <View>
                          <Text style={styles.driverName}>Marc Sastre</Text>
                          <View style={styles.ratingRow}>
                            <Star color={theme.electricBlue} size={14} fill={theme.electricBlue} />
                            <Text style={styles.ratingTxt}>4.9</Text>
                            <Text style={styles.ratingCnt}>(248)</Text>
                          </View>
                        </View>
                      </View>
                      <Pressable
                        style={styles.phoneBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Llamar al transportista"
                      >
                        <Phone color={theme.electricBlue} size={28} />
                      </Pressable>
                    </View>
                    <View style={styles.driverStats}>
                      <View style={styles.dStat}>
                        <View style={styles.dStatIcon}>
                          <Clock color={theme.electricBlue} size={22} />
                        </View>
                        <View>
                          <Text style={styles.dStatLbl}>En camino</Text>
                          <Text style={styles.dStatVal}>Llega en 8 min</Text>
                        </View>
                      </View>
                      <View style={styles.dStat}>
                        <View style={styles.dStatIcon}>
                          <Truck color={theme.electricBlue} size={22} />
                        </View>
                        <View>
                          <Text style={styles.dStatLbl}>Vehículo</Text>
                          <Text style={styles.dStatVal}>Furgón M</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.finalCard}>
                  <View style={styles.finalTop}>
                    <View>
                      <Text style={styles.finalMeta}>{priceResult.count} Bultos • Precio Final</Text>
                      <View style={styles.priceLine}>
                        <Text style={styles.finalPrice}>{priceResult.final}€</Text>
                        <Text style={styles.strike}>{priceResult.full}€</Text>
                      </View>
                    </View>
                    {showCollectiveMatchUi ? (
                      <View style={styles.matchOk}>
                        <CheckCircle2 color={theme.electricBlue} size={20} />
                        <Text style={styles.matchOkTxt}>Match OK</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.finalDivider} />
                  <Text style={styles.finalCitaLbl}>Cita Confirmada</Text>
                  <Text style={styles.finalCitaVal}>
                    {getDayLabel(trackingDateOffset)} | {trackingSlot}
                  </Text>
                </View>

                <Pressable
                  onPress={promptCancelMission}
                  disabled={missionDeleteInFlight}
                  accessibilityRole="button"
                  accessibilityLabel={tr('clientHome.cancelMission')}
                  style={({ pressed }) => [
                    styles.cancelMission,
                    (pressed || missionDeleteInFlight) && { opacity: 0.65 },
                  ]}
                >
                  {missionDeleteInFlight ? (
                    <ActivityIndicator color={theme.white} />
                  ) : (
                    <Text style={styles.cancelMissionTxt}>{tr('clientHome.cancelMission')}</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.waiting}>
                {useLiveRequestDoc && liveRequestError ? (
                  <>
                    <Text style={styles.myReqErrText}>{tr('clientHome.myShipmentsError')}</Text>
                    <Pressable
                      onPress={promptCancelMission}
                      disabled={missionDeleteInFlight}
                      accessibilityRole="button"
                      accessibilityLabel={tr('clientHome.cancelMission')}
                      style={({ pressed }) => [
                        styles.cancelMission,
                        { marginTop: 24 },
                        (pressed || missionDeleteInFlight) && { opacity: 0.65 },
                      ]}
                    >
                      {missionDeleteInFlight ? (
                        <ActivityIndicator color={theme.white} />
                      ) : (
                        <Text style={styles.cancelMissionTxt}>{tr('clientHome.cancelMission')}</Text>
                      )}
                    </Pressable>
                  </>
                ) : useLiveRequestDoc && !liveRequestError ? (
                  <>
                    <ActivityIndicator size="large" color={theme.electricBlue} style={{ marginBottom: 24 }} />
                    <Text style={styles.waitingTitle}>
                      {liveRequest && parseRequestStatus(liveRequest['status']) === 'searching_carrier'
                        ? tr('clientHome.statusSearching')
                        : tr('clientHome.statusPending')}
                    </Text>
                    <Text style={[styles.waitingSub, { marginBottom: 8 }]}>
                      {liveRequest && parseRequestStatus(liveRequest['status']) === 'searching_carrier'
                        ? tr('clientHome.trackingSearching')
                        : tr('clientHome.trackingPending')}
                    </Text>
                    <Pressable
                      onPress={promptCancelMission}
                      disabled={missionDeleteInFlight}
                      accessibilityRole="button"
                      accessibilityLabel={tr('clientHome.cancelMission')}
                      style={({ pressed }) => [
                        styles.cancelMission,
                        { marginTop: 24 },
                        (pressed || missionDeleteInFlight) && { opacity: 0.65 },
                      ]}
                    >
                      {missionDeleteInFlight ? (
                        <ActivityIndicator color={theme.white} />
                      ) : (
                        <Text style={styles.cancelMissionTxt}>{tr('clientHome.cancelMission')}</Text>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <ActivityIndicator size="large" color={theme.electricBlue} style={{ marginBottom: 24 }} />
                    <Text style={styles.waitingTitle}>Asignando Misión</Text>
                    <Text style={[styles.waitingSub, { marginBottom: 8 }]}>
                      Localizando al mejor transportista{'\n'}en Barcelona para tus {priceResult.count}{' '}
                      bultos...
                    </Text>
                    <Pressable
                      onPress={promptCancelMission}
                      disabled={missionDeleteInFlight}
                      accessibilityRole="button"
                      accessibilityLabel={tr('clientHome.cancelMission')}
                      style={({ pressed }) => [
                        styles.cancelMission,
                        { marginTop: 24 },
                        (pressed || missionDeleteInFlight) && { opacity: 0.65 },
                      ]}
                    >
                      {missionDeleteInFlight ? (
                        <ActivityIndicator color={theme.white} />
                      ) : (
                        <Text style={styles.cancelMissionTxt}>{tr('clientHome.cancelMission')}</Text>
                      )}
                    </Pressable>
                  </>
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
      )}
    </View>
  );
}
