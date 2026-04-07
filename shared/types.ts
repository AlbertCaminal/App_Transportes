export type Language = 'ca' | 'es' | 'en';
export type UserProfile = 'client' | 'carrier';
export type ServiceType = 'express' | 'programmed';
export type PackageSize = 'XS' | 'S' | 'M' | 'H';

/** Pasos de navegación principal */
export type AppStep =
  | 'onboarding'
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

export interface AppState {
  lang: Language;
  profile: UserProfile | null;
  step: AppStep;
  carrierData?: CarrierData;
  /** Pantalla previa al abrir Legal/Ayuda; se restaura al volver */
  legalReturnStep?: LegalReturnStep;
}
