export type Language = 'ca' | 'es' | 'en';
export type UserProfile = 'client' | 'carrier';
export type ServiceType = 'express' | 'programmed';
export type PackageSize = 'XS' | 'S' | 'M' | 'H';

/** Pasos de navegación principal */
export type AppStep =
  | 'onboarding'
  | 'login'
  | 'register'
  | 'profile'
  | 'account-settings'
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
  | 'register'
  | 'profile'
  | 'account-settings'
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
export type AuthProvider = 'google' | 'anonymous' | 'email';

/** Usuario autenticado tal y como lo expone el store (subset de Firebase User) */
export interface AuthUser {
  uid: string;
  provider: AuthProvider;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isAnonymous: boolean;
}

/** Tras iniciar sesión con Google desde el modal de invitado, reanuda pantalla y rol. */
export interface ResumeAfterAuth {
  step: AppStep;
  profile: UserProfile | null;
}

/**
 * Campos opcionales en Firestore `users/{uid}` para restaurar idioma y modo tras un nuevo inicio de sesión.
 * Se escriben con merge; el resto del documento (email, provider, etc.) lo mantiene `writeUserDoc`.
 */
export interface UserSessionDoc {
  appLang?: Language;
  appMode?: UserProfile;
  carrierProfile?: CarrierData;
}

/** Desde `carrier-registration` el botón atrás vuelve aquí (registro inicial → profile). */
export type CarrierRegistrationReturnStep = 'profile' | 'account-settings';

export interface AppState {
  lang: Language;
  profile: UserProfile | null;
  /**
   * UID de Firebase al que corresponden `profile` y `carrierData` persistidos.
   * Si el usuario que restaura la sesión no coincide, se ignora el rol guardado.
   */
  boundUid?: string;
  step: AppStep;
  carrierData?: CarrierData;
  /** Origen del flujo de registro/edición transportista para `onBack` y destino tras guardar. */
  carrierRegistrationReturnStep?: CarrierRegistrationReturnStep;
  /** Pantalla previa al abrir Legal/Ayuda; se restaura al volver */
  legalReturnStep?: LegalReturnStep;
  /** Usuario autenticado (Google o invitado anónimo); `null` si no hay sesión todavía. */
  user: AuthUser | null;
  /** Primera emisión de `onAuthStateChanged` recibida (evita flash de Login al restaurar sesión). */
  authInitialized: boolean;
  /** Si existe, `setUser` con cuenta no anónima navega aquí en lugar de ir solo a `profile`. */
  resumeAfterAuth: ResumeAfterAuth | null;
  /** Pantalla anterior al abrir «Mi cuenta»; se restaura al pulsar atrás. */
  accountSettingsReturnStep?: AppStep;
}
