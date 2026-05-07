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
    sectionAppearance: string;
    themeLight: string;
    themeDark: string;
    themeHint: string;
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
  clientHome: {
    requestSaveFailed: string;
    myShipments: string;
    /** Accesibilidad del botón flotante que abre la lista de envíos. */
    myShipmentsFabA11y: string;
    myShipmentsEmpty: string;
    myShipmentsError: string;
    openShipment: string;
    statusPending: string;
    statusSearching: string;
    statusAssigned: string;
    statusCancelled: string;
    trackingPending: string;
    trackingSearching: string;
    assignedLine: string;
    assignedCarrierNameFallback: string;
    assignedCarrierVehicle: string;
    assignedCarrierPlate: string;
    /** Seguimiento: tiempo hasta que el transportista llega al punto de recogida. */
    carrierToPickupTitle: string;
    /** Seguimiento: %{n} = número de parada de entrega (1, 2…). */
    carrierEtaStopApprox: string;
    /** Aviso bajo el chip de ETA (tráfico aproximado). */
    carrierEtaFootnote: string;
    /** Chip ETA: etiqueta alineada a la izquierda (la hora va en azul a la derecha). */
    carrierApproxArrivalLabel: string;
    optionalPackagePhoto: string;
    addPackagePhoto: string;
    removePhoto: string;
    photoUploadFailed: string;
    cancelMission: string;
    cancelMissionConfirmTitle: string;
    cancelMissionConfirmMessage: string;
    cancelMissionConfirmDelete: string;
    cancelMissionErrGeneric: string;
    cancelMissionErrGone: string;
    cancelMissionErrPermission: string;
    cancelMissionErrSignedOut: string;
    cancelMissionErrNetwork: string;
    cancelMissionErrNotConfigured: string;
  };
  carrierOpen: {
    title: string;
    empty: string;
    loadError: string;
    claim: string;
    claiming: string;
    claimOk: string;
    claimErr: string;
    claimErrPermission: string;
    claimErrFirestoreIam: string;
    claimErrConcurrent: string;
    claimErrGone: string;
    claimErrSignedOut: string;
    claimErrNotConfigured: string;
    claimErrNetwork: string;
    claimErrInternal: string;
    notifHint: string;
    /** "%{km}" = distancia ya formateada (locale). */
    notifDistanceKm: string;
    openBoard: string;
    detailTitle: string;
    openDetail: string;
    routeFastestTitle: string;
    /** Chip del mapa transportista: tiempo/distancia hasta completar la primera entrega (recogida + 1er destino). */
    routeFirstDeliveryLegTitle: string;
    routeDurationLabel: string;
    routeDistanceLabel: string;
    shipmentCancelledTitle: string;
    shipmentCancelledBody: string;
    activeRouteChooseTitle: string;
    activeRouteOpenMap: string;
    activeRouteRelease: string;
    releaseRouteConfirmTitle: string;
    releaseRouteConfirmMessage: string;
    releaseRouteConfirmOk: string;
    releaseRouteErrGeneric: string;
    releaseRouteErrGone: string;
    releaseRouteErrPermission: string;
    releaseRouteErrSignedOut: string;
    releaseRouteErrNetwork: string;
    releaseRouteErrNotConfigured: string;
    releaseRouteErrState: string;
  };
  addressSuggest: {
    placeholder: string;
    loading: string;
    noResults: string;
    notConfigured: string;
    overQuota: string;
  };
  location: {
    permissionTitle: string;
    permissionBody: string;
    deniedExplain: string;
    allow: string;
    openSettings: string;
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
    sectionAppearance: 'Aspecto',
    themeLight: 'Modo claro',
    themeDark: 'Modo oscuro',
    themeHint: 'Se guarda en este dispositivo.',
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
  clientHome: {
    requestSaveFailed:
      'No se pudo guardar la solicitud en la nube. Comprueba la conexión o inténtalo más tarde. Puedes seguir viendo el resumen en la app.',
    myShipments: 'Tus envíos',
    myShipmentsFabA11y: 'Abrir tus envíos',
    myShipmentsEmpty: 'Aún no hay envíos guardados en la nube.',
    myShipmentsError: 'No se han podido cargar los envíos. Inténtalo de nuevo.',
    openShipment: 'Ver seguimiento',
    statusPending: 'Registrada',
    statusSearching: 'Buscando transportista',
    statusAssigned: 'Transportista asignado',
    statusCancelled: 'Cancelada',
    trackingPending: 'Solicitud registrada. En breve pasará a búsqueda de transportista…',
    trackingSearching: 'Buscando al mejor transportista en tu zona…',
    assignedLine: 'Repartidor asignado. Aquí verás el contacto cuando conectemos los datos reales.',
    assignedCarrierNameFallback: 'Tu transportista',
    assignedCarrierVehicle: 'Vehículo',
    assignedCarrierPlate: 'Matrícula',
    carrierToPickupTitle: 'Hasta la recogida (aprox.)',
    carrierEtaStopApprox: 'Hasta la %{n}ª parada (aprox.)',
    carrierEtaFootnote: 'Según ruta en coche y tráfico en tiempo real.',
    carrierApproxArrivalLabel: 'Llegada aprox.',
    optionalPackagePhoto: 'Foto del paquete (opcional)',
    addPackagePhoto: 'Añadir foto',
    removePhoto: 'Quitar foto',
    photoUploadFailed: 'No se pudo subir la foto. Se enviará la petición sin foto.',
    cancelMission: 'Cancelar misión',
    cancelMissionConfirmTitle: '¿Cancelar esta misión?',
    cancelMissionConfirmMessage:
      'Se eliminará la solicitud en la nube. Si ya hay transportista asignado, dejará de ver este envío. Esta acción no se puede deshacer.',
    cancelMissionConfirmDelete: 'Sí, eliminar',
    cancelMissionErrGeneric: 'No se pudo cancelar la solicitud. Inténtalo de nuevo.',
    cancelMissionErrGone: 'La solicitud ya no existe o fue eliminada.',
    cancelMissionErrPermission: 'No tienes permiso para cancelar esta solicitud.',
    cancelMissionErrSignedOut: 'Tu sesión no es válida. Cierra sesión y vuelve a entrar.',
    cancelMissionErrNetwork: 'Error de red o el servidor no respondió. Comprueba tu conexión.',
    cancelMissionErrNotConfigured: 'Firebase no está configurado en esta build.',
  },
  carrierOpen: {
    title: 'Peticiones abiertas (nube)',
    empty: 'No hay solicitudes buscando transportista ahora mismo.',
    loadError: 'No se han podido cargar las ofertas. Inténtalo de nuevo.',
    claim: 'Aceptar',
    claiming: 'Asignando…',
    claimOk: 'Envío asignado a tu cuenta.',
    claimErr: 'No se pudo aceptar. Inténtalo de nuevo.',
    claimErrPermission: 'Necesitas perfil de transportista (appMode) para aceptar ofertas.',
    claimErrFirestoreIam:
      'El servidor no tiene permiso para escribir en Firestore. En Google Cloud → IAM, a la cuenta de servicio que ejecuta Cloud Functions (por ejemplo …@appspot.gserviceaccount.com o …-compute@developer.gserviceaccount.com), añade el rol «Usuario de Cloud Datastore» o «Editor de datos de Cloud Firestore». Espera unos minutos y vuelve a pulsar Aceptar.',
    claimErrConcurrent: 'La solicitud se actualizó al mismo tiempo. Pulsa Aceptar otra vez.',
    claimErrGone: 'Otro transportista la aceptó o ya no está disponible.',
    claimErrSignedOut: 'Tu sesión no es válida. Cierra sesión y vuelve a entrar.',
    claimErrNotConfigured: 'Firebase no está configurado en esta build.',
    claimErrNetwork: 'Error de red o el servidor no responde. ¿Están desplegadas las Cloud Functions?',
    claimErrInternal:
      'Error del servidor al asignar. Despliega las Functions (`npm run deploy:firebase`), revisa Firebase → Functions → Registros y que el pedido siga en «buscando transportista».',
    notifHint: 'Nueva petición en el tablón. Ábrela para ver detalles y confirmar.',
    notifDistanceKm: 'A %{km} km de tu posición',
    openBoard: 'Ir al tablón',
    detailTitle: 'Detalle del envío',
    openDetail: 'Ver detalle',
    routeFastestTitle: 'Ruta más rápida',
    routeFirstDeliveryLegTitle: 'Hasta la 1ª entrega (aprox.)',
    routeDurationLabel: 'Duración',
    routeDistanceLabel: 'Distancia',
    shipmentCancelledTitle: 'Envío cancelado',
    shipmentCancelledBody:
      'El cliente ha cancelado esta solicitud. El envío ya no está disponible y se ha quitado la ruta del mapa.',
    activeRouteChooseTitle: 'Ruta activa',
    activeRouteOpenMap: 'Ver en el mapa',
    activeRouteRelease: 'Dejar esta ruta',
    releaseRouteConfirmTitle: '¿Dejar esta ruta?',
    releaseRouteConfirmMessage:
      'El envío volverá a buscar transportista. Podrá aceptarlo otro compañero. ¿Continuar?',
    releaseRouteConfirmOk: 'Sí, dejar ruta',
    releaseRouteErrGeneric: 'No se pudo dejar la ruta. Inténtalo de nuevo.',
    releaseRouteErrGone: 'La solicitud ya no existe o fue eliminada.',
    releaseRouteErrPermission: 'No tienes permiso para liberar esta ruta.',
    releaseRouteErrSignedOut: 'Tu sesión no es válida. Cierra sesión y vuelve a entrar.',
    releaseRouteErrNetwork: 'Error de red o el servidor no respondió. Comprueba tu conexión.',
    releaseRouteErrNotConfigured: 'Firebase no está configurado en esta build.',
    releaseRouteErrState: 'Esta ruta ya no está asignada a ti o ha cambiado. Actualiza la lista.',
  },
  addressSuggest: {
    placeholder: 'Dirección en Barcelona',
    loading: 'Buscando direcciones…',
    noResults: 'Sin resultados. Prueba con calle y número.',
    notConfigured: 'Autocompletado de direcciones desactivado en esta build.',
    overQuota: 'Cupo de búsquedas alcanzado. Inténtalo más tarde.',
  },
  location: {
    permissionTitle: 'Ubicación necesaria',
    permissionBody:
      'Necesitamos tu ubicación para calcular la ruta más rápida y mostrarte el seguimiento en el mapa. Solo se usa mientras la app esté abierta.',
    deniedExplain:
      'No has dado permiso de ubicación. Puedes activarlo desde los ajustes del sistema y volver a intentarlo.',
    allow: 'Permitir',
    openSettings: 'Abrir ajustes',
  },
};
