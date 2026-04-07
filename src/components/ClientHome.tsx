import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Package,
  ChevronLeft,
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
  HelpCircle,
} from 'lucide-react-native';
import MapMockup from './MapMockup';
import { ClientScanModal } from './clientHome/ClientScanModal';
import { useAiScanFlow } from '../hooks/useAiScanFlow';
import { useClientMissionSimulation } from '../hooks/useClientMissionSimulation';
import { useReviewTariffDelay } from '../hooks/useReviewTariffDelay';
import { computeMissionPrice } from '../utils/missionPricing';
import { PackageSize, Language, ServiceType, AppState, PackageItem } from '../../shared/types';
import { theme } from '../theme';

const { height: WIN_H } = Dimensions.get('window');

interface Props {
  lang: Language;
  step: AppState['step'];
  onStepChange: (step: AppState['step']) => void;
  onBack: () => void;
  onOpenLegalHelp: () => void;
}

const legalA11y = { ca: 'Legal i ajuda', es: 'Legal y ayuda', en: 'Legal & help' } as const;

export default function ClientHome({ lang, step, onStepChange, onBack, onOpenLegalHelp }: Props) {
  const [origin, setOrigin] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('express');
  const [expressDest, setExpressDest] = useState('');
  const [expressSize, setExpressSize] = useState<PackageSize>('S');
  const [packages, setPackages] = useState<PackageItem[]>([{ id: '1', size: 'S', destination: '' }]);
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState('10:00-12:00');
  const [isOpenRouteEnabled, setIsOpenRouteEnabled] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const [hasSimulatedMatch, setHasSimulatedMatch] = useState(false);
  const [showMatchNotification, setShowMatchNotification] = useState(false);
  const [showCarrierInfo, setShowCarrierInfo] = useState(false);

  useClientMissionSimulation(
    step,
    isOpenRouteEnabled,
    hasSimulatedMatch,
    setIsSimulationActive,
    setShowMatchNotification,
    setShowCarrierInfo,
    setHasSimulatedMatch
  );

  const onExpressSize = useCallback((s: PackageSize) => setExpressSize(s), []);
  const onPackageSize = useCallback((id: string, s: PackageSize) => {
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, size: s } : p)));
  }, []);
  const onHidePrice = useCallback(() => setShowPrice(false), []);

  const { isScanning, scanResult, handleAIScan } = useAiScanFlow(onExpressSize, onPackageSize, onHidePrice);

  const scheduleTariffReview = useReviewTariffDelay();

  const priceResult = useMemo(
    () =>
      computeMissionPrice({
        serviceType,
        expressSize,
        packages,
        hasSimulatedMatch,
      }),
    [packages, expressSize, serviceType, hasSimulatedMatch]
  );

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

  const timeSlots = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00', '20:00-22:00'];

  const mapH = step === 'home' ? WIN_H * 0.22 : WIN_H * 0.38;

  const SizeButtons = ({
    selected,
    onSelect,
    onScan,
  }: {
    selected: PackageSize;
    onSelect: (s: PackageSize) => void;
    onScan: () => void;
  }) => (
    <View style={styles.sizeRow}>
      <View style={styles.sizeInner}>
        {(['XS', 'S', 'M', 'H'] as PackageSize[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => {
              onSelect(s);
              setShowPrice(false);
            }}
            style={[styles.sizeChip, selected === s && styles.sizeChipOn]}
          >
            <Text style={[styles.sizeChipTxt, selected === s && { color: '#fff' }]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onScan} style={styles.camBtn}>
        <Camera color={theme.gray500} size={22} />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <ClientScanModal
        visible={isScanning}
        scanResult={scanResult}
        styles={{
          scanOverlay: styles.scanOverlay,
          scanCard: styles.scanCard,
          scanDim: styles.scanDim,
          scanFrame: styles.scanFrame,
          scanLine: styles.scanLine,
          scanIconCenter: styles.scanIconCenter,
          scanTop: styles.scanTop,
          scanTopTxt: styles.scanTopTxt,
          scanBottom: styles.scanBottom,
          scanResult: styles.scanResult,
          scanResultTxt: styles.scanResultTxt,
          scanningTxt: styles.scanningTxt,
        }}
      />

      {showMatchNotification ? (
        <View style={styles.matchBanner}>
          <View style={styles.matchIcon}>
            <Users color="#fff" size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.matchTitle}>¡Ahorro Colectivo Aplicado!</Text>
            <Text style={styles.matchSub}>Alguien se ha unido a tu ruta</Text>
          </View>
          <Pressable onPress={() => setShowMatchNotification(false)}>
            <X color={theme.gray500} size={18} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.mapWrap, { height: mapH }]}>
        <MapMockup
          isTracking={showCarrierInfo}
          isProgrammed={serviceType === 'programmed'}
          isOpenRoute={isOpenRouteEnabled}
          originSet={origin.length > 4}
          destinations={
            serviceType === 'express'
              ? expressDest
                ? [expressDest]
                : []
              : packages.map((p) => p.destination).filter((d) => d.length > 4)
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
                  setHasSimulatedMatch(false);
                }
          }
        >
          <ChevronLeft color={theme.white} size={24} />
        </Pressable>
        <Pressable
          style={styles.helpFloating}
          accessibilityRole="button"
          accessibilityLabel={legalA11y[lang]}
          onPress={onOpenLegalHelp}
        >
          <HelpCircle color={theme.white} size={22} />
        </Pressable>
        {isSimulationActive ? (
          <View style={styles.simOverlay}>
            <View style={styles.simCard}>
              <ActivityIndicator color={theme.electricBlue} />
              <Text style={styles.simTxt}>Buscando ahorro colectivo...</Text>
            </View>
          </View>
        ) : null}
      </View>

      {step === 'home' ? (
        <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
          <View style={styles.handle} />
          <View style={styles.modeTabs}>
            <Pressable
              onPress={() => {
                setServiceType('express');
                setShowPrice(false);
              }}
              style={[styles.modeTab, serviceType === 'express' && styles.modeTabOn]}
            >
              <Zap color={serviceType === 'express' ? '#fff' : theme.gray500} size={16} />
              <Text style={[styles.modeTabTxt, serviceType === 'express' && { color: '#fff' }]}>EXPRESS</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setServiceType('programmed');
                setShowPrice(false);
              }}
              style={[styles.modeTab, serviceType === 'programmed' && styles.modeTabOn]}
            >
              <Package color={serviceType === 'programmed' ? '#fff' : theme.gray500} size={16} />
              <Text style={[styles.modeTabTxt, serviceType === 'programmed' && { color: '#fff' }]}>PROGRAMAR</Text>
            </Pressable>
          </View>

          <Text style={styles.fieldLbl}>Origen de Recogida</Text>
          <View style={styles.inputCard}>
            <View style={styles.dotB} />
            <TextInput
              value={origin}
              onChangeText={setOrigin}
              placeholder="Dirección en Barcelona"
              placeholderTextColor={theme.gray800}
              style={styles.input}
            />
            <LocateFixed color={theme.gray700} size={16} />
          </View>

          {serviceType === 'express' ? (
            <View style={{ gap: 22 }}>
              <Text style={styles.fieldLbl}>Destino Directo</Text>
              <View style={styles.inputCard}>
                <View style={styles.dotO} />
                <TextInput
                  value={expressDest}
                  onChangeText={setExpressDest}
                  placeholder="¿A dónde enviamos?"
                  placeholderTextColor={theme.gray800}
                  style={styles.input}
                />
                <Search color={theme.gray700} size={16} />
              </View>
              <Text style={styles.fieldLbl}>Volumen de Carga</Text>
              <SizeButtons selected={expressSize} onSelect={setExpressSize} onScan={() => handleAIScan('express')} />
            </View>
          ) : (
            <View style={{ gap: 22 }}>
              <Text style={styles.fieldLbl}>Agenda de Recogida</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
                {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                  const parts = getDayLabel(offset).split(' ');
                  return (
                    <Pressable
                      key={offset}
                      onPress={() => setSelectedDate(offset)}
                      style={[styles.dayPill, selectedDate === offset && styles.dayPillOn]}
                    >
                      <Text style={[styles.dayPillSm, selectedDate === offset && { color: '#fff' }]}>{parts[0]}</Text>
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
                    style={[styles.slotBtn, selectedSlot === slot && styles.slotBtnOn]}
                  >
                    <Text style={[styles.slotTxt, selectedSlot === slot && { color: theme.electricBlue }]}>{slot}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLbl}>Logística de Paradas</Text>
              {packages.map((pkg, idx) => (
                <View key={pkg.id} style={styles.stopCard}>
                  <View style={styles.stopHead}>
                    <View style={styles.stopNum}>
                      <Text style={styles.stopNumTxt}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stopTitle}>Parada {idx + 1}</Text>
                    <Pressable onPress={() => setPackages(packages.filter((p) => p.id !== pkg.id))}>
                      <Trash2 color={theme.gray800} size={18} />
                    </Pressable>
                  </View>
                  <View style={styles.stopInput}>
                    <MapPin color={theme.gray700} size={16} />
                    <TextInput
                      value={pkg.destination}
                      onChangeText={(txt) =>
                        setPackages(packages.map((p) => (p.id === pkg.id ? { ...p, destination: txt } : p)))
                      }
                      placeholder="Dirección de entrega"
                      placeholderTextColor={theme.gray800}
                      style={styles.inputSm}
                    />
                  </View>
                  <Text style={styles.dimLbl}>Dimensiones del bulto</Text>
                  <SizeButtons
                    selected={pkg.size}
                    onSelect={(s) => setPackages(packages.map((p) => (p.id === pkg.id ? { ...p, size: s } : p)))}
                    onScan={() => handleAIScan(pkg.id)}
                  />
                </View>
              ))}
              <Pressable
                onPress={() =>
                  setPackages([...packages, { id: Math.random().toString(), size: 'S', destination: '' }])
                }
                style={styles.addStop}
              >
                <Text style={styles.addStopTxt}>+ Añadir Parada</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            onPress={() => {
              setIsOpenRouteEnabled(!isOpenRouteEnabled);
              setShowPrice(false);
            }}
            style={[styles.openRow, isOpenRouteEnabled && styles.openRowOn]}
          >
            <View style={styles.openLeft}>
              <View style={[styles.openIcon, isOpenRouteEnabled && { backgroundColor: theme.electricBlue }]}>
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
              disabled={isCalculating || !origin}
              accessibilityRole="button"
              accessibilityLabel="Revisar tarifa del envío"
              style={[styles.cta, (!origin || isCalculating) && { opacity: 0.25 }]}
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
                  <Text style={styles.priceMeta}>
                    {priceResult.count} Bultos • Resumen Misión
                  </Text>
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
                onPress={() => onStepChange(serviceType === 'express' ? 'tracking' : 'reservation-confirmed')}
                style={styles.confirmWhite}
              >
                <Text style={styles.confirmWhiteTxt}>Confirmar Misión</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.sheetPlain} contentContainerStyle={styles.statusContent}>
          <View style={styles.handle} />
          {showCarrierInfo ? (
            <View style={{ gap: 20 }}>
              <View style={styles.driverCard}>
                <View style={styles.driverTop}>
                  <View style={styles.driverRow}>
                    <Image
                      source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop' }}
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
                  <Pressable style={styles.phoneBtn}>
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

              <View style={styles.finalCard}>
                <View style={styles.finalTop}>
                  <View>
                    <Text style={styles.finalMeta}>{priceResult.count} Bultos • Precio Final</Text>
                    <View style={styles.priceLine}>
                      <Text style={styles.finalPrice}>{priceResult.final}€</Text>
                      <Text style={styles.strike}>{priceResult.full}€</Text>
                    </View>
                  </View>
                  {hasSimulatedMatch ? (
                    <View style={styles.matchOk}>
                      <CheckCircle2 color={theme.electricBlue} size={20} />
                      <Text style={styles.matchOkTxt}>Match OK</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.finalDivider} />
                <Text style={styles.finalCitaLbl}>Cita Confirmada</Text>
                <Text style={styles.finalCitaVal}>
                  {getDayLabel(selectedDate)} | {selectedSlot}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  onStepChange('home');
                  setHasSimulatedMatch(false);
                }}
                style={styles.cancelMission}
              >
                <Text style={styles.cancelMissionTxt}>Cancelar Misión</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.waiting}>
              <ActivityIndicator size="large" color={theme.electricBlue} style={{ marginBottom: 24 }} />
              <Text style={styles.waitingTitle}>Asignando Misión</Text>
              <Text style={styles.waitingSub}>
                Localizando al mejor transportista{'\n'}en Barcelona para tus {priceResult.count} bultos...
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.deepNight },
  scanOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 24,
  },
  scanCard: {
    aspectRatio: 3 / 4,
    borderRadius: 48,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    width: '100%',
  },
  scanDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  scanFrame: {
    position: 'absolute',
    left: 36,
    right: 36,
    top: 36,
    bottom: 36,
    borderWidth: 2,
    borderColor: theme.electricBlue,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    top: '25%',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.electricBlue,
    opacity: 0.9,
  },
  scanIconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanTop: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scanTopTxt: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  scanBottom: { position: 'absolute', bottom: 36, left: 24, right: 24, alignItems: 'center' },
  scanResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.electricBlue,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
  },
  scanResultTxt: { color: '#fff', fontWeight: '900', fontSize: 12 },
  scanningTxt: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  matchBanner: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(22,27,34,0.95)',
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
  matchSub: { fontSize: 10, fontWeight: '700', color: theme.electricBlue, marginTop: 2, textTransform: 'uppercase' },
  mapWrap: { position: 'relative' },
  backFloating: {
    position: 'absolute',
    top: 28,
    left: 22,
    zIndex: 40,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(22,27,34,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  helpFloating: {
    position: 'absolute',
    top: 28,
    right: 22,
    zIndex: 40,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(22,27,34,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    backgroundColor: 'rgba(22,27,34,0.92)',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(48,112,240,0.4)',
  },
  simTxt: { color: theme.white, fontSize: 10, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  sheet: {
    flex: 1,
    backgroundColor: theme.deepNight,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    marginTop: -16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sheetPlain: { flex: 1, backgroundColor: theme.deepNight },
  sheetContent: { padding: 28, paddingBottom: 40 },
  statusContent: { padding: 28, paddingBottom: 40 },
  handle: {
    width: 48,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceDark,
    padding: 6,
    borderRadius: 16,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
  modeTabTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: theme.gray500 },
  fieldLbl: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.gray600,
    letterSpacing: 2,
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
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 18,
  },
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
  input: { flex: 1, color: theme.white, fontSize: 14, fontWeight: '600' },
  inputSm: { flex: 1, color: theme.white, fontSize: 13, fontWeight: '600' },
  sizeRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sizeInner: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.deepNight,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sizeChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  sizeChipOn: { backgroundColor: theme.electricBlue },
  sizeChipTxt: { fontSize: 9, fontWeight: '900', color: theme.gray600 },
  camBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  daysScroll: { gap: 10, paddingBottom: 4 },
  dayPill: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: theme.surfaceDark,
    alignItems: 'center',
  },
  dayPillOn: { backgroundColor: theme.electricBlue, borderColor: theme.electricBlue },
  dayPillSm: { fontSize: 9, fontWeight: '900', color: theme.gray600, textTransform: 'uppercase' },
  dayPillLg: { fontSize: 12, fontWeight: '900', color: theme.gray600 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slotBtn: {
    width: '47%',
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: theme.surfaceDark,
    alignItems: 'center',
  },
  slotBtnOn: { backgroundColor: 'rgba(48,112,240,0.1)', borderColor: theme.electricBlue },
  slotTxt: { fontSize: 11, fontWeight: '900', color: theme.gray700 },
  stopCard: {
    backgroundColor: theme.surfaceDark,
    padding: 22,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 14,
    marginBottom: 12,
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
  stopTitle: { flex: 1, marginLeft: 10, fontSize: 10, fontWeight: '900', color: theme.white, letterSpacing: 2, textTransform: 'uppercase' },
  stopInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.deepNight,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dimLbl: { fontSize: 9, fontWeight: '900', color: theme.gray700, letterSpacing: 2, textTransform: 'uppercase' },
  addStop: {
    paddingVertical: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 32,
    alignItems: 'center',
  },
  addStopTxt: { fontSize: 10, fontWeight: '900', color: theme.gray600, letterSpacing: 2, textTransform: 'uppercase' },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
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
  openTitle: { fontSize: 11, fontWeight: '900', color: theme.gray500 },
  openSub: { fontSize: 10, color: theme.gray600, fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
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
    borderColor: 'rgba(255,255,255,0.1)',
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 },
  priceMeta: { fontSize: 10, fontWeight: '900', color: theme.gray600, letterSpacing: 2, textTransform: 'uppercase' },
  priceHuge: { fontSize: 52, fontWeight: '900', color: theme.white },
  saveLbl: { fontSize: 10, fontWeight: '900', color: theme.electricBlue, textTransform: 'uppercase' },
  saveVal: { fontSize: 24, fontWeight: '900', color: theme.electricBlue },
  citaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
  citaMeta: { fontSize: 10, fontWeight: '900', color: theme.gray600, letterSpacing: 2, textTransform: 'uppercase' },
  citaVal: { fontSize: 12, fontWeight: '900', color: theme.white, textTransform: 'uppercase' },
  confirmWhite: {
    backgroundColor: theme.white,
    paddingVertical: 20,
    borderRadius: 28,
    alignItems: 'center',
  },
  confirmWhiteTxt: { color: theme.deepNight, fontWeight: '900', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' },
  driverCard: {
    backgroundColor: theme.surfaceDark,
    borderRadius: 48,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  driverTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 18, flex: 1 },
  driverImg: { width: 80, height: 80, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(48,112,240,0.3)' },
  driverName: { fontSize: 24, fontWeight: '900', color: theme.white },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(48,112,240,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  ratingTxt: { fontSize: 12, fontWeight: '900', color: theme.electricBlue },
  ratingCnt: { fontSize: 10, fontWeight: '700', color: theme.gray700 },
  phoneBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.deepNight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  driverStats: { flexDirection: 'row', gap: 20, paddingTop: 22, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  dStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.deepNight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  dStatLbl: { fontSize: 10, fontWeight: '900', color: theme.gray700, letterSpacing: 2, textTransform: 'uppercase' },
  dStatVal: { fontSize: 14, fontWeight: '900', color: theme.white, marginTop: 2 },
  finalCard: {
    backgroundColor: theme.surfaceDark,
    borderRadius: 48,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  finalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  finalMeta: { fontSize: 10, fontWeight: '900', color: theme.gray700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 14 },
  finalPrice: { fontSize: 44, fontWeight: '900', color: theme.electricBlue },
  strike: { fontSize: 20, fontWeight: '700', color: theme.gray800, textDecorationLine: 'line-through' },
  matchOk: {
    alignItems: 'center',
    backgroundColor: 'rgba(48,112,240,0.1)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(48,112,240,0.2)',
  },
  matchOkTxt: { fontSize: 10, fontWeight: '900', color: theme.electricBlue, marginTop: 4, letterSpacing: 2, textTransform: 'uppercase' },
  finalDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 20 },
  finalCitaLbl: { fontSize: 10, fontWeight: '900', color: theme.gray700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  finalCitaVal: { fontSize: 14, fontWeight: '900', color: theme.white, textTransform: 'uppercase' },
  cancelMission: {
    paddingVertical: 20,
    backgroundColor: theme.surfaceDark,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    marginTop: 8,
  },
  cancelMissionTxt: { color: theme.gray600, fontWeight: '900', fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' },
  waiting: { alignItems: 'center', paddingVertical: 48 },
  waitingTitle: { fontSize: 26, fontWeight: '900', color: theme.white, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },
  waitingSub: { textAlign: 'center', color: theme.gray700, fontWeight: '700', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', lineHeight: 20 },
});
