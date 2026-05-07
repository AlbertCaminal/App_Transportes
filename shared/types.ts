export type Language = 'ca' | 'es' | 'en';
export type UserProfile = 'client' | 'carrier';
export type ColorScheme = 'light' | 'dark';
export type ServiceType = 'express' | 'programmed';

/** Medidas del bulto introducidas por el cliente (cm y kg). */
export interface PackagePhysicalSpec {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
}

/**
 * Estados de `requests` en Firestore.
 * - El **cliente** solo crea con `pending` (reglas).
 * - **Cloud Functions** (Admin) pasan a `searching_carrier` y pueden asignar `assigned` + `carrierId`.
 */
export type ShippingRequestStatus = 'pending' | 'searching_carrier' | 'assigned' | 'cancelled';

/**
 * Campos de negocio que el cliente escribe al confirmar un envío (sin `clientId` ni timestamps).
 * La colección `requests` amplía esto con `clientId`, `createdAt` y, más adelante, `carrierId`.
 */
export interface ShippingRequestClientPayload {
  serviceType: ServiceType;
  status: ShippingRequestStatus;
  lang: Language;
  origin: string;
  expressDestination?: string;
  expressPackage?: PackagePhysicalSpec;
  packages?: ({ id: string; destination: string } & PackagePhysicalSpec)[];
  selectedDateOffset: number;
  timeSlot: string;
  openRoutePreferred: boolean;
  priceFull: string;
  priceFinal: string;
  hasSimulatedMatch: boolean;
  /** URL HTTPS de foto del bulto (Storage); solo express. */
  expressPackagePhotoUrl?: string;
}

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
  destination: string;
  specs: PackagePhysicalSpec;
  image?: string;
}

/**
 * Carga útil que el cliente B envía al unirse a una ruta abierta del cliente A
 * (Cloud Function `joinSharedRoute`). Contiene la dirección de entrega del
 * nuevo bulto y sus medidas físicas, además de una foto opcional. Es el
 * subconjunto mínimo que el servidor necesita para validar el hueco y crear
 * el subdoc `joiners/{uid}` en `requests/{id}`.
 */
export interface JoinerPackagePayload {
  destination: string;
  specs: PackagePhysicalSpec;
  /** URL HTTPS de la foto del bulto en Firebase Storage; opcional. */
  photoUrl?: string;
}

export interface Vehicle {
  brand: string;
  model: string;
  color: string;
  /** Matrícula; visible para el cliente cuando reclamas un envío. */
  licensePlate?: string;
}

export interface CarrierData {
  name: string;
  company: string;
  vehicle: Vehicle;
}

/**
 * Copia denormalizada en `requests/{id}.assignedCarrier` al reclamar (Cloud Function).
 * El cliente puede leerla sin acceso a `users/{carrierId}`.
 */
export interface AssignedCarrierSnapshot {
  name: string;
  company: string;
  photoUrl?: string | null;
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
  /** Preferencia de tema; se persiste en el almacenamiento local del dispositivo. */
  colorScheme: ColorScheme;
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
  /**
   * Solo en memoria (no persistido): envío activo en pantalla de seguimiento.
   * Evita perder el ID cuando `ClientHome` se desmonta (p. ej. al abrir Mi cuenta).
   */
  clientTrackingRequestId: string | null;
}
