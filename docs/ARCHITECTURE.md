# Arquitectura

Documento técnico de referencia. El [README](../README.md) contiene el resumen ejecutivo; aquí se desarrolla en profundidad el **stack**, el **modelo de datos** y el **algoritmo de matching** que componen la app.

---

## 1. Visión general

Cliente **Expo (React Native + TypeScript)** sobre una arquitectura **cloud-native serverless**:

```text
┌──────────────┐      ┌──────────────────────────────┐      ┌───────────────┐
│   App Expo   │ ───▶ │  Firebase (Auth + Firestore) │ ◀──▶ │ Cloud Funcs   │
│ iOS/And/Web  │      │  reglas de seguridad         │      │ matching/pago │
└──────────────┘      └──────────────────────────────┘      └──────┬────────┘
        │                                                           │
        ├────────▶ Mapbox SDK (mapas, rutas, navegación)            │
        └────────▶ Stripe SDK (PaymentIntents) ◀── webhooks ────────┘
```

- **Una sola base de código** para iOS, Android y web.
- **Firebase** centraliza identidad y datos en tiempo real.
- **Cloud Functions** hospeda lógica de negocio sensible (matching, validación de pago).
- **Mapbox** y **Stripe** son SaaS externos consumidos vía SDK/API.

---

## 2. Frontend

| Aspecto        | Decisión                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Framework      | React Native con Expo SDK 54                                                                    |
| Lenguaje       | TypeScript estricto                                                                             |
| Builds         | Expo Application Services (EAS)                                                                 |
| Estado global  | [Zustand](https://zustand-demo.pmnd.rs/) en [`src/store/appStore.ts`](../src/store/appStore.ts) |
| i18n           | `i18n-js` + `expo-localization`; diccionarios en [`src/i18n/locales/`](../src/i18n/locales)     |
| Componentes    | Hooks y funcionales puros; estilos vía `StyleSheet`                                             |
| Monitorización | `@sentry/react-native` opcional via `EXPO_PUBLIC_SENTRY_DSN`                                    |
| Pruebas        | Jest + `@testing-library/react-native` (unit, hooks con timers, smoke tests)                    |

**Estructura clave** (`src/`):

```text
src/
  components/   Pantallas y piezas UI (incluye Login y smoke tests)
  hooks/        Hooks de UI, simulaciones y auth (useAuthSync, useGoogleAuth)
  i18n/         i18n-js + diccionarios ca/es/en y hook useT()
  store/        Store Zustand (appStore.ts)
  services/     Integraciones externas (firebase/auth.ts, monitoring/sentry.ts)
  config/       firebase.ts, publicApp.ts
  utils/        Helpers puros (missionPricing, ...)
shared/
  types.ts      Tipos del dominio (incluye AuthUser y AppStep)
```

### 2.1. Estado global (Zustand)

- Un único store `useAppStore` con slices lógicos: `session` (`lang`, `profile`),
  `navigation` (`step`, `legalReturnStep`) y `carrier` (`carrierData`).
- Acciones explícitas (`setLang`, `selectProfile`, `setCarrierData`, `setStep`,
  `openLegalHelp`, `closeLegalHelp`) en vez de mutaciones directas desde
  `App.tsx`.
- Los componentes consumen _selectores granulares_
  (`useAppStore((s) => s.lang)`) para reducir re-renders. Pruebas unitarias en
  [`src/store/__tests__/appStore.test.ts`](../src/store/__tests__/appStore.test.ts).

### 2.2. Internacionalización (i18n)

- Diccionario fuente en [`src/i18n/locales/es.ts`](../src/i18n/locales/es.ts)
  define la interfaz `I18nDict`; `ca.ts` y `en.ts` implementan la misma forma
  (TypeScript garantiza paridad de claves).
- Instancia `I18n` única en [`src/i18n/index.ts`](../src/i18n/index.ts). Se
  suscribe al store Zustand: al cambiar `lang`, el idioma activo se actualiza
  sin props drilling.
- Hook `useT()` ([`src/i18n/useT.ts`](../src/i18n/useT.ts)) devuelve la función
  `t(key)` tipada (autocompleta rutas tipo `legal.title`).
- Un test unitario valida que **las tres locales tienen exactamente las mismas
  claves** y que ningún valor quede vacío.

### 2.3. Observabilidad (Sentry)

- Envoltorio en [`src/services/monitoring/sentry.ts`](../src/services/monitoring/sentry.ts).
- Se inicializa al montar la app; `AppErrorBoundary` captura excepciones de
  render.
- Si `EXPO_PUBLIC_SENTRY_DSN` está vacío, queda totalmente deshabilitado (sin
  errores ni dependencias obligatorias).

---

## 3. Backend (BaaS y lógica)

### 3.1. Firebase Authentication

Estado actual:

- **Google Sign-In** vía OAuth (PKCE) usando `expo-auth-session/providers/google`,
  intercambiado por una sesión Firebase con `signInWithCredential` en
  [`src/services/firebase/auth.ts`](../src/services/firebase/auth.ts).
- **Sesión anónima** como modo invitado (`signInAsGuest`) para que la app
  funcione sin cuenta.
- **Upgrade de invitado → Google**: si el usuario ya estaba en sesión anónima
  cuando inicia con Google, se intenta `linkWithCredential` para preservar el
  `uid` y los datos asociados.
- Sincronización del usuario con el store global mediante el hook
  [`useAuthSync`](../src/hooks/useAuthSync.ts) (suscripción a
  `onAuthStateChanged`).
- Pantalla [`Login`](../src/components/Login.tsx) con botón de Google,
  continuar como invitado y manejo de errores legibles. Si faltan los
  `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, Google se renderiza deshabilitado y queda
  disponible solo el modo invitado.

Flujo de pantallas:

```text
onboarding ──setLang──▶ login ──Google/Invitado──▶ profile ──▶ home / carrier-*
                          ▲
                          └── botón "Cerrar sesión" en ProfileSelection
```

Pendiente: Apple Sign-In (obligatorio en iOS si se ofrece Google), email/password
y validación por SMS.

#### Configuración OAuth necesaria

1. Crea credenciales OAuth 2.0 en Google Cloud Console
   (mismo proyecto que Firebase) — un Client ID por plataforma (Web, iOS,
   Android, opcionalmente Expo Go).
2. En Firebase Console → Authentication → Sign-in method, habilita **Google**
   y pega el Web Client ID en "Web SDK configuration".
3. Rellena `.env.local` con `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
   `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
   `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (y opcional
   `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` para Expo Go).
4. En la consola de Google añade los **redirect URIs** que `expo-auth-session`
   genera (`https://auth.expo.io/@<owner>/<slug>` para Expo Go,
   `<scheme>:/oauthredirect` para builds nativas, `https://<domain>/...` para
   web). El `scheme` está definido en [`app.config.ts`](../app.config.ts).

### 3.2. Cloud Firestore

NoSQL en tiempo real, con soporte offline. Colecciones objetivo:

| Colección  | Contenido                                                       | Reglas (resumen)                         |
| ---------- | --------------------------------------------------------------- | ---------------------------------------- |
| `users`    | Perfiles de cliente y transportista.                            | Lectura/escritura solo del propio `uid`. |
| `requests` | Solicitudes de envío con dimensiones, ventana horaria y estado. | Cliente owner + transportista asignado.  |
| `services` | Transacciones en curso e histórico.                             | Owner + transportista del servicio.      |
| `routes`   | Rutas generadas y agrupación de paquetes (_task-chain_).        | Solo Cloud Functions / asignados.        |
| `ratings`  | Evaluaciones cruzadas entre cliente y transportista.            | Crear si participaste en el servicio.    |

Reglas de ejemplo iniciales en [`firestore.rules`](../firestore.rules).

### 3.3. Cloud Functions (Node.js / TypeScript)

Lógica que **no debe vivir en el cliente**:

- **Cobros y reembolsos** (Stripe `PaymentIntents`, validación con webhooks).
- **Matching** entre `requests` y conductores activos (algoritmo FPD, ver §5).
- **Notificaciones push** (FCM) cuando cambia el estado de un servicio.
- **Validación y limpieza** de documentos antes de escribir.

---

## 4. Integraciones externas

### 4.1. Mapbox

- SDK móvil para iOS/Android y `mapbox-gl` para web.
- Enrutamiento (Directions / Map Matching) y matrices de distancia para el matching.
- Navegación turn-by-turn integrada.
- Preferido sobre Google Maps por **personalización**, **costes en alto volumen** y **soporte offline**.

### 4.2. Stripe

- Cobros mediante **PaymentIntents**.
- Esquema **escrow**: el cargo se autoriza al confirmar el envío y se captura/libera al transportista al completarse.
- **Webhooks** procesados por Cloud Functions: nunca confiar en el cliente para confirmar el pago.
- Cumplimiento **PCI DSS**: no se almacenan datos de tarjeta en el backend propio.

---

## 5. Algoritmo de matching y enrutamiento

Modelo en dos niveles inspirado en **Descomposición Fluido-Partícula (FPD)**:

### 5.1. Problema maestro (macro)

Trata la ciudad como una red (_Traffic Assignment Problem_):

- Estima la **densidad de conductores** y la **demanda** por zona.
- Ajusta una **tarifa dinámica** según congestión y disponibilidad.
- Define qué subzonas pueden alimentarse mutuamente (vecindad logística).

### 5.2. Sub-problema (micro)

Dentro de cada zona se ejecutan subastas locales:

- **Radio de búsqueda** de unos 5 km alrededor del conductor.
- Se evalúan paquetes candidatos calculando el **menor desvío** de la ruta actual.
- Las distancias se obtienen vía **matrices de Mapbox**, no por línea recta.
- Mecanismo tipo **subasta VCG**: los conductores revelan preferencias y el sistema empareja eficientemente.

### 5.3. Salidas

- Asignación `requests` → `users` (transportistas).
- Generación de `routes` agrupando varios paquetes compatibles (_task-bundling_).
- Disparo de notificaciones push y actualización de `services`.

---

## 6. Seguridad y privacidad

- Reglas de Firestore por `uid` y rol; lo crítico se valida en Cloud Functions.
- Variables sensibles fuera del repo (`.env*` ignorado, ver [`.gitignore`](../.gitignore)).
- Las claves `EXPO_PUBLIC_*` viajan al cliente: no usar para secretos de servidor.
- Política de privacidad y soporte enlazables desde la app vía [`src/config/publicApp.ts`](../src/config/publicApp.ts).

---

## 7. Estado de implementación

| Área                                                         | Estado                                           |
| ------------------------------------------------------------ | ------------------------------------------------ |
| Cliente Expo (UI, navegación)                                | Implementado                                     |
| Estado global con Zustand                                    | Implementado                                     |
| Internacionalización con `i18n-js` + `expo-localization`     | Implementado (migración progresiva por pantalla) |
| Firebase Auth: invitado (anónimo) + Google Sign-In + upgrade | Implementado                                     |
| Firebase Firestore (`users/{uid}` con perfil de auth)        | Implementado                                     |
| Monitorización de errores con Sentry (opcional)              | Implementado                                     |
| Pruebas Jest (unit + hooks + smoke)                          | Implementado                                     |
| CI en GitHub Actions (typecheck/lint/test)                   | Implementado                                     |
| Prettier + Husky + lint-staged                               | Implementado                                     |
| Cloud Functions (matching, pagos)                            | Planificado                                      |
| Mapbox (mapa real, rutas, navegación)                        | Planificado                                      |
| Stripe (PaymentIntents, escrow, webhooks)                    | Planificado                                      |
| Algoritmo FPD completo                                       | Planificado                                      |
