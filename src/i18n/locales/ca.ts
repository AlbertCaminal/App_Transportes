import type { I18nDict } from './es';

export const ca: I18nDict = {
  common: {
    back: 'Tornar',
    retry: 'Reintenta',
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
    title: 'Inicia sessió',
    subtitle: 'Entra amb el teu compte per desar enviaments i rutes.',
    googleButton: 'Continua amb Google',
    guestButton: 'Continua com a convidat',
    notConfigured: "L'inici amb Google no està disponible en aquesta build.",
    loading: 'Connectant…',
    privacyNote: 'En continuar acceptes la Política de privacitat.',
    error: "No s'ha pogut iniciar sessió. Torna-ho a provar.",
  },
  profile: {
    question: "¿Com utilitzaràs l'app?",
    client: 'SOC CLIENT',
    carrier: 'SOC TRANSPORTISTA',
    clientDesc: 'Vull enviar paquets',
    carrierDesc: 'Vull realitzar enviaments',
    legalLink: 'Legal i ajuda',
    signOut: 'Tanca la sessió',
  },
  legal: {
    title: 'Legal i ajuda',
    subtitle: 'Informació i contacte',
    privacy: 'Política de privacitat',
    website: 'Lloc web',
    support: 'Correu de suport',
    openError: "No s'ha pogut obrir l'enllaç.",
    webNote:
      'Al navegador, el correu pot obrir el client per defecte; si no, copia l’adreça de suport manualment.',
  },
  errorBoundary: {
    title: 'Alguna cosa ha anat malament',
    body: "L'app ha trobat un error inesperat. Pots intentar continuar; si el problema persisteix, reinicia l'aplicació.",
  },
};
