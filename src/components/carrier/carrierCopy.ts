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
  },
};

export function getCarrierCopy(lang: Language): CarrierStrings {
  return COPY[lang];
}
