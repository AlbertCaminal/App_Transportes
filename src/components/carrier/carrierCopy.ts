import type { Language } from '../../../shared/types';

export type CarrierStrings = {
  radar: string;
  board: string;
  active: string;
  inactive: string;
  newOrder: string;
  earnings: string;
  accept: string;
  reject: string;
  confirm: string;
  activeRoutes: string;
  todayActivity: string;
  closeSession: string;
  calendarTitle: string;
  noMissions: string;
  nextMissionConfirmed: string;
  routeLabel: string;
  pickupSlot: string;
  serviceExpress: string;
  serviceProgrammed: string;
  pkgDimensions: string;
  pkgWeight: string;
  pkgVolume: string;
  clientLabel: string;
  clientVerified: string;
};

const COPY: Record<Language, CarrierStrings> = {
  ca: {
    radar: 'Radar Live',
    board: 'Tabló de Rutes',
    active: 'EN SERVEI',
    inactive: 'FORA DE SERVEI',
    newOrder: 'Nou Enviament Express!',
    earnings: 'Guany Net',
    accept: 'ACCEPTAR',
    reject: 'REBUTJAR',
    confirm: 'ACCEPTAR RUTA',
    activeRoutes: 'Rutes actives',
    todayActivity: "Activitat d'Avui",
    closeSession: 'Tancar Sessió',
    calendarTitle: 'La meva Agenda',
    noMissions: 'Sense missions aquest dia',
    nextMissionConfirmed: 'Pròxima Missió Confirmada',
    routeLabel: 'Ruta',
    pickupSlot: 'Franja horària',
    serviceExpress: 'Express',
    serviceProgrammed: 'Programat',
    pkgDimensions: 'Dimensions',
    pkgWeight: 'Pes',
    pkgVolume: 'Volum',
    clientLabel: 'Client',
    clientVerified: 'Verificat per Barcelona Logistics',
  },
  es: {
    radar: 'Radar Live',
    board: 'Tablón de Rutas',
    active: 'EN SERVICIO',
    inactive: 'FUERA DE SERVICIO',
    newOrder: '¡Nuevo Envío Express!',
    earnings: 'Ganancia Neta',
    accept: 'ACEPTAR',
    reject: 'RECHAZAR',
    confirm: 'ACEPTAR RUTA',
    activeRoutes: 'Rutas activas',
    todayActivity: 'Actividad de Hoy',
    closeSession: 'Cerrar Sesión',
    calendarTitle: 'Mi Agenda',
    noMissions: 'Sin misiones este día',
    nextMissionConfirmed: 'Próxima Misión Confirmada',
    routeLabel: 'Ruta',
    pickupSlot: 'Franja horaria',
    serviceExpress: 'Express',
    serviceProgrammed: 'Programado',
    pkgDimensions: 'Dimensiones',
    pkgWeight: 'Peso',
    pkgVolume: 'Volumen',
    clientLabel: 'Cliente',
    clientVerified: 'Verificado por Barcelona Logistics',
  },
  en: {
    radar: 'Live Radar',
    board: 'Routes Board',
    active: 'IN SERVICE',
    inactive: 'OUT OF SERVICE',
    newOrder: 'New Express Order!',
    earnings: 'Net Gain',
    accept: 'ACCEPT',
    reject: 'REJECT',
    confirm: 'ACCEPT ROUTE',
    activeRoutes: 'Active routes',
    todayActivity: "Today's Activity",
    closeSession: 'Sign Out',
    calendarTitle: 'My Agenda',
    noMissions: 'No missions for this day',
    nextMissionConfirmed: 'Next Confirmed Mission',
    routeLabel: 'Route',
    pickupSlot: 'Pickup window',
    serviceExpress: 'Express',
    serviceProgrammed: 'Scheduled',
    pkgDimensions: 'Dimensions',
    pkgWeight: 'Weight',
    pkgVolume: 'Volume',
    clientLabel: 'Client',
    clientVerified: 'Verified by Barcelona Logistics',
  },
};

export function getCarrierCopy(lang: Language): CarrierStrings {
  return COPY[lang];
}
