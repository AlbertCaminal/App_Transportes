export interface I18nDict {
  common: {
    back: string;
    retry: string;
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
  };
  profile: {
    question: string;
    client: string;
    carrier: string;
    clientDesc: string;
    carrierDesc: string;
    legalLink: string;
    signOut: string;
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
}

export const es: I18nDict = {
  common: {
    back: 'Volver',
    retry: 'Reintentar',
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
  },
  profile: {
    question: '¿Cómo vas a usar la app?',
    client: 'Soy Cliente',
    carrier: 'Soy Transportista',
    clientDesc: 'Quiero enviar paquetes',
    carrierDesc: 'Quiero realizar envíos',
    legalLink: 'Legal y ayuda',
    signOut: 'Cerrar sesión',
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
};
