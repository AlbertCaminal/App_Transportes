export type Language = 'ca' | 'es' | 'en';
export type UserProfile = 'client' | 'carrier';
export type ServiceType = 'express' | 'programmed';
export type PackageSize = 'XS' | 'S' | 'M' | 'H';

/** Pasos de navegación principal */
export type AppStep =
  | 'onboarding'
  | 'login'
  | 'profile'
  | 'home'
  | 'tracking'
  | 'reservation-confirmed'
  | 'carrier-registration'
  | 'carrier-dashboard'
  | 'legal-help';

/** Pantalla a la que volver al cerrar Legal/Ayuda (nunca `legal-help`) */
export type LegalReturnStep =
  | 'onboarding'
  | 'login'
  | 'profile'
  | 'home'
  | 'tracking'
  | 'reservation-confirmed'
  | 'carrier-registration'
  | 'carrier-dashboard';

export interface PackageItem {
  id: string;
  size: PackageSize;
  destination: string;
  image?: string;
}

export interface Vehicle {
  model: string;
  volume: number;
  maxDimensions: string;
}

export interface CarrierData {
  name: string;
  company: string;
  vehicle: Vehicle;
}

/** Origen de la sesión actual de Firebase Auth */
export type AuthProvider = 'google' | 'anonymous';

/** Usuario autenticado tal y como lo expone el store (subset de Firebase User) */
export interface AuthUser {
  uid: string;
  provider: AuthProvider;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
}

export interface AppState {
  lang: Language;
  profile: UserProfile | null;
  step: AppStep;
  carrierData?: CarrierData;
  /** Pantalla previa al abrir Legal/Ayuda; se restaura al volver */
  legalReturnStep?: LegalReturnStep;
  /** Usuario autenticado (Google o invitado anónimo); `null` si no hay sesión todavía. */
  user: AuthUser | null;
}
