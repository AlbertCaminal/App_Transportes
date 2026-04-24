export interface I18nDict {
  common: {
    back: string;
    retry: string;
    cancel: string;
    ok: string;
  };
  onboarding: {
    welcome: string;
    selectLanguage: string;
    languages: { ca: string; es: string; en: string };
    footer: string;
  };
  login: {
    title: string;
    subtitle: string;
    googleButton: string;
    guestButton: string;
    notConfigured: string;
    loading: string;
    privacyNote: string;
    error: string;
    email: {
      placeholderEmail: string;
      placeholderPassword: string;
      signIn: string;
      linkRegister: string;
      orDivider: string;
      validationEmpty: string;
    };
    firebaseErr: {
      generic: string;
      invalidEmail: string;
      wrongCredentials: string;
      emailInUse: string;
      weakPassword: string;
      tooManyRequests: string;
      network: string;
      userDisabled: string;
    };
  };
  register: {
    title: string;
    subtitle: string;
    roleHint: string;
    phoneHint: string;
    placeholderName: string;
    placeholderEmail: string;
    placeholderPassword: string;
    placeholderPasswordConfirm: string;
    placeholderPhone: string;
    submit: string;
    goToLogin: string;
    termsPartBefore: string;
    termsPrivacyLink: string;
    termsPartAfter: string;
    validationName: string;
    validationPasswordMismatch: string;
    validationPasswordShort: string;
    validationTerms: string;
  };
  profile: {
    question: string;
    client: string;
    carrier: string;
    clientDesc: string;
    carrierDesc: string;
    legalLink: string;
    signOut: string;
    accountMenuA11y: string;
    menuTitle: string;
    deleteAccount: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    deleteConfirmAction: string;
    deleteErrorGeneric: string;
    deleteRequiresRecentLogin: string;
  };
  accountSettings: {
    title: string;
    sectionAccount: string;
    sectionPreferences: string;
    sectionApp: string;
    sectionHelp: string;
    sectionSession: string;
    labelDisplayName: string;
    placeholderDisplayName: string;
    saveDisplayName: string;
    saveDisplayNameOk: string;
    saveDisplayNameErr: string;
    labelEmail: string;
    emailMissing: string;
    providerGoogle: string;
    providerEmail: string;
    providerGuest: string;
    activeRole: string;
    roleClient: string;
    roleCarrier: string;
    roleNone: string;
    carrierVehicleLine: string;
    changeMode: string;
    editCarrier: string;
    completeCarrier: string;
    goClientHome: string;
    goCarrierDashboard: string;
    legalHelp: string;
  };
  legal: {
    title: string;
    subtitle: string;
    privacy: string;
    website: string;
    support: string;
    openError: string;
    webNote: string;
  };
  errorBoundary: {
    title: string;
    body: string;
  };
  authUpsell: {
    title: string;
    body: string;
    cancel: string;
    continueGoogle: string;
  };
}

export const es: I18nDict = {
  common: {
    back: 'Volver',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    ok: 'Entendido',
  },
  onboarding: {
    welcome: 'Benvingut / Bienvenido',
    selectLanguage: 'Selecciona el teu idioma / Selecciona tu idioma',
    languages: {
      ca: 'Català',
      es: 'Castellano',
      en: 'English',
    },
    footer: 'Barcelona Logistics • v2.0',
  },
  login: {
    title: 'Inicia sesión',
    subtitle: 'Accede con tu cuenta para guardar tus envíos y rutas.',
    googleButton: 'Continuar con Google',
    guestButton: 'Continuar como invitado',
    notConfigured: 'Google Sign-In no está disponible en esta build.',
    loading: 'Conectando…',
    privacyNote: 'Al continuar aceptas la Política de privacidad.',
    error: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
    email: {
      placeholderEmail: 'Correo electrónico',
      placeholderPassword: 'Contraseña',
      signIn: 'Entrar con correo',
      linkRegister: '¿No tienes cuenta? Regístrate',
      orDivider: 'o continúa con',
      validationEmpty: 'Introduce correo y contraseña.',
    },
    firebaseErr: {
      generic: 'No se pudo completar la operación. Inténtalo de nuevo.',
      invalidEmail: 'El correo no tiene un formato válido.',
      wrongCredentials: 'Correo o contraseña incorrectos.',
      emailInUse: 'Ese correo ya está registrado. Inicia sesión.',
      weakPassword: 'La contraseña debe tener al menos 6 caracteres.',
      tooManyRequests: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
      network: 'Error de red. Comprueba tu conexión.',
      userDisabled: 'Esta cuenta está deshabilitada.',
    },
  },
  register: {
    title: 'Crear cuenta',
    subtitle:
      'Barcelona Logistics conecta clientes que envían paquetes con transportistas urbanos en el área metropolitana.',
    roleHint: 'Después del registro elegirás si eres cliente (envíos) o transportista (realizar rutas).',
    phoneHint: 'Opcional: número de teléfono para coordinación de entregas u incidencias en la ruta.',
    placeholderName: 'Nombre y apellidos',
    placeholderEmail: 'Correo electrónico',
    placeholderPassword: 'Contraseña (mín. 6 caracteres)',
    placeholderPasswordConfirm: 'Repite la contraseña',
    placeholderPhone: 'Teléfono (opcional)',
    submit: 'Crear mi cuenta',
    goToLogin: '¿Ya tienes cuenta? Inicia sesión',
    termsPartBefore: 'Acepto la ',
    termsPrivacyLink: 'política de privacidad',
    termsPartAfter: ' y el uso de mis datos para crear la cuenta, gestionar envíos y contacto operativo.',
    validationName: 'Introduce tu nombre completo.',
    validationPasswordMismatch: 'Las contraseñas no coinciden.',
    validationPasswordShort: 'La contraseña debe tener al menos 6 caracteres.',
    validationTerms: 'Debes aceptar los términos para continuar.',
  },
  profile: {
    question: '¿Cómo vas a usar la app?',
    client: 'Soy Cliente',
    carrier: 'Soy Transportista',
    clientDesc: 'Quiero enviar paquetes',
    carrierDesc: 'Quiero realizar envíos',
    legalLink: 'Legal y ayuda',
    signOut: 'Cerrar sesión',
    accountMenuA11y: 'Menú de cuenta',
    menuTitle: 'Cuenta',
    deleteAccount: 'Eliminar cuenta',
    deleteConfirmTitle: '¿Eliminar cuenta?',
    deleteConfirmMessage:
      'Se borrarán tus datos de perfil en esta app y cerrarás sesión de forma permanente. Esta acción no se puede deshacer.',
    deleteConfirmAction: 'Eliminar definitivamente',
    deleteErrorGeneric: 'No se pudo eliminar la cuenta. Inténtalo más tarde.',
    deleteRequiresRecentLogin:
      'Por seguridad, cierra sesión y vuelve a iniciar sesión antes de eliminar la cuenta.',
  },
  accountSettings: {
    title: 'Mi cuenta',
    sectionAccount: 'Datos de la cuenta',
    sectionPreferences: 'Preferencias',
    sectionApp: 'Uso de la app',
    sectionHelp: 'Ayuda',
    sectionSession: 'Sesión',
    labelDisplayName: 'Nombre visible',
    placeholderDisplayName: 'Tu nombre',
    saveDisplayName: 'Guardar nombre',
    saveDisplayNameOk: 'Nombre actualizado.',
    saveDisplayNameErr: 'No se pudo guardar el nombre.',
    labelEmail: 'Correo electrónico',
    emailMissing: 'No disponible',
    providerGoogle: 'Cuenta Google',
    providerEmail: 'Correo y contraseña',
    providerGuest: 'Sesión de invitado',
    activeRole: 'Modo activo',
    roleClient: 'Cliente (envíos)',
    roleCarrier: 'Transportista',
    roleNone: 'Aún no has elegido modo',
    carrierVehicleLine: 'Vehículo: %{vehicle}',
    changeMode: 'Cambiar modo cliente / transportista',
    editCarrier: 'Editar datos del transportista',
    completeCarrier: 'Completar registro de transportista',
    goClientHome: 'Ir a envíos e inicio',
    goCarrierDashboard: 'Ir al panel del transportista',
    legalHelp: 'Legal y ayuda',
  },
  legal: {
    title: 'Legal y ayuda',
    subtitle: 'Información y contacto',
    privacy: 'Política de privacidad',
    website: 'Sitio web',
    support: 'Correo de soporte',
    openError: 'No se pudo abrir el enlace.',
    webNote:
      'En el navegador, el correo puede abrir el cliente por defecto; si no, copia la dirección de soporte manualmente.',
  },
  errorBoundary: {
    title: 'Algo ha ido mal',
    body: 'La app ha encontrado un error inesperado. Puedes intentar continuar; si el problema persiste, reinicia la aplicación.',
  },
  authUpsell: {
    title: 'Inicia sesión con Google',
    body: 'Para esta acción necesitas una cuenta. Continúa con Google o pulsa Cancelar para seguir explorando como invitado.',
    cancel: 'Cancelar',
    continueGoogle: 'Continuar con Google',
  },
};
