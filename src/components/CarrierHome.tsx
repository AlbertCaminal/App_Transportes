import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, Dimensions } from 'react-native';
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
  Package,
  Check,
  X,
  ChevronRight,
  TrendingUp,
  Settings,
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  HelpCircle,
} from 'lucide-react-native';
import MapMockup from './MapMockup';
import { getCarrierCopy } from './carrier/carrierCopy';
import { Language, CarrierData } from '../../shared/types';
import { theme } from '../theme';

interface Route {
  id: number;
  date: string;
  dateObj: Date;
  route: string;
  price: string;
  size: string;
  status: 'pending' | 'confirmed';
}

interface Props {
  lang: Language;
  carrier: CarrierData;
  onExit: () => void;
  onOpenLegalHelp: () => void;
}

const { height: SCREEN_H } = Dimensions.get('window');

export default function CarrierHome({ lang, carrier, onExit, onOpenLegalHelp }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [view, setView] = useState<'radar' | 'board' | 'calendar'>('radar');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 2);

  const [routes, setRoutes] = useState<Route[]>([
    {
      id: 1,
      date: 'Demà, 10:00',
      dateObj: tomorrow,
      route: 'Sants ➔ Poblenou',
      price: '18.50€',
      size: 'M',
      status: 'pending',
    },
    {
      id: 2,
      date: '25 Oct, 15:30',
      dateObj: nextDay,
      route: 'Gràcia ➔ Sarrià',
      price: '12.00€',
      size: 'S',
      status: 'pending',
    },
    {
      id: 3,
      date: '26 Oct, 09:00',
      dateObj: new Date(2025, 9, 26),
      route: 'Eixample ➔ El Prat',
      price: '32.40€',
      size: 'H',
      status: 'pending',
    },
  ]);

  const confirmedRoutes = useMemo(() => routes.filter((r) => r.status === 'confirmed'), [routes]);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setShowNotification(true), 3000);
      return () => clearTimeout(timer);
    }
    setShowNotification(false);
  }, [isActive]);

  const handleConfirmRoute = (route: Route) => {
    setRoutes((prev) => prev.map((r) => (r.id === route.id ? { ...r, status: 'confirmed' } : r)));
    setShowSuccessModal(true);
  };

  const t = getCarrierCopy(lang);

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

  return (
    <View style={styles.root}>
      {view !== 'calendar' ? (
        <View style={styles.mapSection}>
          <MapMockup isTracking={isActive} isOpenRoute={false} />
          {isActive && (
            <View style={styles.radarOverlay} pointerEvents="none">
              <RadarRipple />
            </View>
          )}
          <View style={styles.mapHeader}>
            <View style={styles.profileChip}>
              <View style={styles.profileIcon}>
                <Truck color={theme.electricBlue} size={20} />
              </View>
              <View>
                <Text style={styles.profileMeta}>{carrier.vehicle.model}</Text>
                <Text style={styles.profileName}>{carrier.name}</Text>
              </View>
            </View>
            <View style={styles.mapHeaderRight}>
              <Pressable
                onPress={onOpenLegalHelp}
                accessibilityRole="button"
                accessibilityLabel="Legal y ayuda"
                style={({ pressed }) => [styles.helpHeaderBtn, pressed && { opacity: 0.85 }]}
              >
                <HelpCircle color={theme.white} size={22} />
              </Pressable>
              <Pressable
                onPress={() => setIsActive(!isActive)}
                accessibilityRole="button"
                accessibilityLabel={isActive ? 'Desactivar servicio' : 'Activar servicio'}
                style={[styles.powerBtn, isActive ? styles.powerBtnOn : styles.powerBtnOff]}
              >
                <Power color={isActive ? '#fff' : theme.gray500} size={16} />
                <Text style={[styles.powerTxt, isActive && { color: '#fff' }]}>
                  {isActive ? t.active : t.inactive}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={[styles.sheet, view === 'calendar' && styles.sheetCalendar]}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {view !== 'calendar' ? <View style={styles.handle} /> : null}

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
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>{t.todayActivity}</Text>
              <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel={t.closeSession}>
                <Text style={styles.linkOut}>{t.closeSession.toUpperCase()}</Text>
              </Pressable>
            </View>
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
                <Text style={styles.nextMissionLbl}>Pròxima Missió Confirmada</Text>
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
              <ChevronRight color={theme.gray800} size={20} />
            </View>
          </View>
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
                <Pressable accessibilityRole="button" accessibilityLabel="Ajustes" style={styles.iconBtn}>
                  <Settings color={theme.gray600} size={16} />
                </Pressable>
              </View>
            </View>
            {routes
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
                    <Text style={styles.routeTxt}>{r.route}</Text>
                    <View style={styles.sizeChip}>
                      <Package color={theme.electricBlue} size={14} />
                      <Text style={styles.sizeChipTxt}>{r.size}</Text>
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
              ))}
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
              <View style={{ width: 44 }} />
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
                    {hasM ? <View style={[styles.dotMission, isSel && { backgroundColor: '#fff' }]} /> : null}
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

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIcon}>
              <CheckCircle2 color={theme.success} size={48} />
            </View>
            <Text style={styles.successTitle}>{t.confirmed}</Text>
            <Text style={styles.successSub}>{t.successMsg}</Text>
            <Pressable
              onPress={() => {
                setShowSuccessModal(false);
                setView('calendar');
              }}
              accessibilityRole="button"
              accessibilityLabel={t.calendarTitle}
              style={styles.successCta}
            >
              <Text style={styles.successCtaTxt}>VEURE AGENDA</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showNotification} transparent animationType="slide">
        <View style={styles.notifWrap}>
          <View style={styles.notifCard}>
            <View style={styles.notifTop}>
              <View style={styles.bellBadge}>
                <Bell color="#fff" size={20} />
              </View>
              <Text style={styles.notifTitle}>{t.newOrder}</Text>
              <View style={styles.notifLoc}>
                <MapPin color="rgba(255,255,255,0.7)" size={16} />
                <Text style={styles.notifLocTxt}>A 1.4 km de tu posició</Text>
              </View>
            </View>
            <View style={styles.notifBody}>
              <View style={styles.notifRow}>
                <View style={styles.pkgIcon}>
                  <Package color={theme.electricBlue} size={36} />
                </View>
                <View>
                  <Text style={styles.pkgMeta}>Mida M</Text>
                  <Text style={styles.pkgStreet}>Carrer d&apos;Aragó</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.pkgMeta}>{t.earnings}</Text>
                  <Text style={styles.pkgMoney}>+14,50€</Text>
                </View>
              </View>
              <View style={styles.notifActions}>
                <Pressable
                  onPress={() => setShowNotification(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t.reject}
                  style={styles.rejectBtn}
                >
                  <X color={theme.gray500} size={16} />
                  <Text style={styles.rejectTxt}>{t.reject}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowNotification(false)}
                  accessibilityRole="button"
                  accessibilityLabel={t.accept}
                  style={styles.acceptBtn}
                >
                  <Check color="#fff" size={16} />
                  <Text style={styles.acceptTxt}>{t.accept}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RadarRipple() {
  const s = useSharedValue(0.5);
  useEffect(() => {
    s.value = withRepeat(withTiming(2.5, { duration: 2000, easing: Easing.out(Easing.ease) }), -1, false);
  }, [s]);
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: 0.35 - s.value * 0.1,
  }));
  return (
    <View style={styles.radarCenter}>
      <Animated.View style={[styles.radarRing, ringStyle]} />
      <View style={styles.radarDot} />
    </View>
  );
}

const MAP_H = SCREEN_H * 0.45;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.deepNight },
  mapSection: { height: MAP_H, position: 'relative' },
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
  mapHeader: {
    position: 'absolute',
    top: 32,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 30,
  },
  mapHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  helpHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surfaceDark,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(48,112,240,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.gray600,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  profileName: { fontSize: 14, fontWeight: '900', color: theme.white },
  powerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
  },
  powerBtnOn: { backgroundColor: theme.success, borderColor: theme.success },
  powerBtnOff: { backgroundColor: theme.surfaceDark, borderColor: 'rgba(255,255,255,0.05)' },
  powerTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: theme.gray500 },
  sheet: {
    flex: 1,
    backgroundColor: theme.deepNight,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    marginTop: -20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sheetCalendar: {
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    flexGrow: 1,
  },
  sheetContent: { padding: 32, paddingBottom: 48 },
  handle: {
    width: 48,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 24,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.surfaceDark,
    padding: 6,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
  tabTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: theme.gray600 },
  tabTxtActive: { color: '#fff' },
  section: { gap: 20 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.gray500,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  linkOut: { fontSize: 10, fontWeight: '900', color: theme.gray700 },
  statsRow: { flexDirection: 'row', gap: 16 },
  statCard: {
    flex: 1,
    backgroundColor: theme.surfaceDark,
    padding: 22,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.electricBlue,
    marginBottom: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statLabelMuted: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.gray600,
    marginBottom: 6,
    letterSpacing: 2,
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
    fontSize: 9,
    fontWeight: '900',
    color: theme.electricBlue,
    letterSpacing: 2,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  nextMissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  routeMain: { fontWeight: '700', color: theme.white, fontSize: 16 },
  routeSub: { fontSize: 12, color: theme.gray500, fontWeight: '700', marginTop: 4 },
  clockBox: {
    backgroundColor: theme.surfaceDark,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  demandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 22,
    backgroundColor: theme.surfaceDark,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
    borderColor: 'rgba(255,255,255,0.05)',
  },
  demandTitle: { fontSize: 14, fontWeight: '900', color: theme.white },
  demandSub: {
    fontSize: 10,
    color: theme.gray600,
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
    borderColor: 'rgba(255,255,255,0.05)',
  },
  routeCard: {
    padding: 22,
    backgroundColor: theme.surfaceDark,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
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
  routeBadgeTxt: { color: theme.electricBlue, fontSize: 10, fontWeight: '900' },
  routePrice: { fontSize: 20, fontWeight: '900', color: theme.white },
  routeMid: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  routeDots: { alignItems: 'center' },
  dotG: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.gray800 },
  dotLine: { width: 2, height: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
  dotB: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.electricBlue },
  routeTxt: { flex: 1, fontSize: 14, fontWeight: '700', color: theme.gray500 },
  sizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.deepNight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sizeChipTxt: { fontSize: 10, fontWeight: '900', color: theme.electricBlue },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.electricBlue,
    paddingVertical: 18,
    borderRadius: 16,
  },
  confirmBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 10, letterSpacing: 3 },
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
    fontSize: 9,
    fontWeight: '900',
    color: theme.gray700,
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
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: theme.surfaceDark,
    marginBottom: 8,
  },
  dayBtnSel: { backgroundColor: theme.electricBlue, borderColor: theme.electricBlue },
  dayBtnToday: { backgroundColor: 'rgba(48,112,240,0.05)', borderColor: 'rgba(48,112,240,0.3)' },
  dayBtnTxt: { fontSize: 12, fontWeight: '900', color: theme.gray500 },
  dotMission: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.electricBlue,
  },
  missionsHdr: {
    fontSize: 10,
    fontWeight: '900',
    color: theme.gray600,
    letterSpacing: 2,
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
    borderColor: 'rgba(255,255,255,0.05)',
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
    fontSize: 10,
    color: theme.gray600,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  missionPrice: { fontSize: 14, fontWeight: '900', color: theme.success },
  noMissions: {
    textAlign: 'center',
    paddingVertical: 36,
    color: theme.gray700,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successCard: {
    backgroundColor: theme.surfaceDark,
    borderRadius: 48,
    padding: 36,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 36,
    backgroundColor: 'rgba(16,185,129,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successTitle: { fontSize: 24, fontWeight: '900', color: theme.white, marginBottom: 10 },
  successSub: {
    color: theme.gray500,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 28,
    textTransform: 'uppercase',
  },
  successCta: {
    width: '100%',
    paddingVertical: 18,
    backgroundColor: theme.white,
    borderRadius: 16,
    alignItems: 'center',
  },
  successCtaTxt: { fontWeight: '900', fontSize: 11, letterSpacing: 3, color: theme.deepNight },
  notifWrap: { flex: 1, justifyContent: 'flex-end', padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  notifCard: { borderRadius: 48, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  notifTop: { backgroundColor: theme.electricBlue, padding: 36, paddingTop: 48 },
  bellBadge: {
    position: 'absolute',
    top: 22,
    right: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 999,
  },
  notifTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10 },
  notifLoc: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifLocTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  notifBody: { backgroundColor: theme.surfaceDark, padding: 28 },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  pkgIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: theme.deepNight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  pkgMeta: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.gray600,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  pkgStreet: { fontSize: 18, fontWeight: '900', color: theme.white },
  pkgMoney: { fontSize: 22, fontWeight: '900', color: theme.success },
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
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rejectTxt: { fontSize: 10, fontWeight: '900', color: theme.gray500, letterSpacing: 2 },
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
});
