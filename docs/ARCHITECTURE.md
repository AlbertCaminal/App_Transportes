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
  services/     Integraciones (firebase/auth.ts, firestore/*, monitoring/sentry.ts)
  config/       firebase.ts, publicApp.ts
  utils/        Helpers puros (missionPricing, shippingRequestPayload, …)
shared/
  types.ts      Tipos del dominio (AuthUser, AppStep, ShippingRequestClientPayload, …)
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

**Estado: implementado** (Google, correo/contraseña, invitado anónimo y mejora de UX en curso).

- **Google Sign-In** vía OAuth (PKCE) con `expo-auth-session/providers/google`,
  intercambiado por una sesión Firebase con `signInWithCredential` en
  [`src/services/firebase/auth.ts`](../src/services/firebase/auth.ts).
- **Correo y contraseña**: inicio de sesión en [`Login`](../src/components/Login.tsx)
  y alta en [`Register`](../src/components/Register.tsx) (`createUserWithEmailAndPassword`,
  actualización de perfil y documento `users/{uid}`).
- **Sesión anónima** como modo invitado (`signInAsGuest`) para usar la app sin cuenta.
- **Upgrade de invitado → Google** (`linkWithCredential`) cuando el usuario ya estaba
  en sesión anónima e inicia con Google, para preservar el `uid`.
- Sincronización con el store global: [`useAuthSync`](../src/hooks/useAuthSync.ts)
  (`onAuthStateChanged`). Ajustes de cuenta: [`AccountSettings`](../src/components/AccountSettings.tsx).

Si faltan los `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`, el botón de Google queda deshabilitado;
siguen disponibles **correo/contraseña** e **invitado** siempre que Firebase esté configurado.

Flujo de pantallas (resumen):

```text
onboarding ──setLang──▶ login ──┬── Google / invitado / correo ──▶ profile ──▶ home / carrier-*
                                └── register (correo) ──────────▶ profile
                          ▲
                          └── "Cerrar sesión" / cuenta en ProfileSelection y ajustes
```

**Mejoras pendientes (recomendadas):** Apple Sign-In en iOS si se distribuye con Google;
validación por SMS u otros factores si el producto lo exige; revisión de textos legales
y flujos de recuperación de contraseña en la propia app.

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

| Colección  | Contenido                                                    | Reglas (resumen)                                                                                                                                                |
| ---------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`    | Perfiles de cliente y transportista.                         | Lectura/escritura solo del propio `uid`.                                                                                                                        |
| `requests` | Solicitudes de envío (MVP: alta desde cliente al confirmar). | Creación por `clientId == auth.uid`; lectura por cliente o `carrierId` asignado; sin update/delete desde cliente (ver [`firestore.rules`](../firestore.rules)). |
| `services` | Transacciones en curso e histórico.                          | Owner + transportista del servicio.                                                                                                                             |
| `routes`   | Rutas generadas y agrupación de paquetes (_task-chain_).     | Solo Cloud Functions / asignados.                                                                                                                               |
| `ratings`  | Evaluaciones cruzadas entre cliente y transportista.         | Crear si participaste en el servicio.                                                                                                                           |

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

| Área                                                                                     | Estado                                                                                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Cliente Expo (UI, navegación)                                                            | Implementado                                                                                                 |
| Estado global con Zustand                                                                | Implementado                                                                                                 |
| Internacionalización con `i18n-js` + `expo-localization`                                 | Implementado (migración progresiva por pantalla)                                                             |
| Firebase Auth: invitado (anónimo) + Google + correo/contraseña + upgrade invitado→Google | Implementado (mejoras: Apple Sign-In, SMS, etc.)                                                             |
| Firebase Firestore: `users/{uid}` + colección `requests` (alta al confirmar envío)       | Implementado (MVP)                                                                                           |
| Monitorización de errores con Sentry (opcional)                                          | Implementado                                                                                                 |
| Pruebas Jest (unit + hooks + smoke)                                                      | Implementado                                                                                                 |
| CI en GitHub Actions (typecheck/lint/test + reglas Firestore)                            | Implementado                                                                                                 |
| Prettier + Husky + lint-staged                                                           | Implementado                                                                                                 |
| Cloud Functions (matching, pagos)                                                        | En curso: trigger `requests` + `claim` (MVP); reglas `requests` endurecidas + `npm run test:firestore-rules` |
| Mapbox (mapa real, rutas, navegación)                                                    | Planificado                                                                                                  |
| Stripe (PaymentIntents, escrow, webhooks)                                                | Planificado                                                                                                  |
| Algoritmo FPD completo                                                                   | Planificado                                                                                                  |

---

## 8. Backlog por prioridad (producto y técnico)

Roadmap de trabajo, ordenado por **impacto / desbloqueo** (P0 = antes). La lista vive aquí; al cerrar un bloque, actualizar la sección 7 o este apartado.

### Prioridad alta (P0) — desbloquean un MVP con negocio real

1. **Cloud Functions (o backend mínimo)**  
   Lógica en servidor: asignar transportista, transiciones de estado, validar payloads. Las reglas de `requests` ya restringen escrituras al cliente; el _matching_ y asignación deben quedar en Functions/Admin. **Estado: iniciado** en el repo — `onShippingRequestCreate` (pasa a `searching_carrier`) + callable `claimShippingRequest` (primer transportista que reclama, con transacción). Código: [`functions/src`](../functions/src/index.ts).  
   _Despliegue:_ en `.firebaserc` sustituye `YOUR_FIREBASE_PROJECT_ID` por el ID del proyecto; con [Firebase CLI](https://firebase.google.com/docs/cli): `firebase deploy --only functions,firestore:rules`. Región: `europe-west1`. Revisa en consola de Firebase el plan (algunas operaciones o cuotas requieren facturación). _Cliente:_ `claimShippingRequest` en [`src/services/firebase/shippingCallable.ts`](../src/services/firebase/shippingCallable.ts), listado abierto en [`shippingRequestsQuery.ts`](../src/services/firestore/shippingRequestsQuery.ts).

2. **Flujo de solicitudes en app**  
   Listar, escuchar y reaccionar a `requests` (cliente: propios; transportista: abiertas en `searching_carrier`) con manejo de errores y carga, alineado con `shared/types` y reglas. **Estado: MVP** — `ClientHome`: listado y seguimiento con `useClientRequestList` / `useShippingRequestDocument`. `CarrierHome` (tablón / `board`): `useSearchingCarrierRequests` + `subscribeSearchingCarrierRequests`, botón _Aceptar_ → `claimShippingRequestCallable` (`shippingCallable.ts`). Hace falta `users/{uid}.appMode === 'carrier'` en reglas; Functions desplegadas para `searching_carrier` y _claim_.

3. **Seguridad y coherencia de datos**  
   **Estado (MVP):** reglas de `requests` con lista blanca de campos en `create`, `createdAt` obligatorio vía `request.time` (equivalente a `serverTimestamp()` del cliente), bloqueo de sesión **anónima** al crear solicitudes, sin `update`/`delete` desde cliente; paquetes en modo programado validados hasta **5** paradas (ampliar en `firestore.rules` si la UI lo permite). Tests: `npm run test:firestore-rules` ([`firestore.rules`](firestore.rules), [`firestore-tests/`](firestore-tests/)). Pendiente: endurecer `users/{uid}` con lista blanca si hace falta.

4. **Pagos (Stripe)**  
   Si el producto requiere cobro: `PaymentIntents` + webhooks. Si el MVP no cobra, dejarlo explícitamente fuera y no prometerlo en descripción pública.

### Prioridad media (P1) — producto y operación

5. **Mapas y rutas (Mapbox u alternativa acordada)**  
   Búsqueda de direcciones, estimación y coherencia con el modelo de envío.

6. **Vista transportista**  
   Listado/ detalle, aceptar envíos (vinculada al callable de _claim_), estados y feedback en UI.

7. **Observabilidad**  
   Sentry con contexto, _breadcrumbs_ en flujos críticos, distinción error de negocio / bug.

8. **Cobertura de tests**  
   Reglas y utilidades, hooks de envío, E2E cuando el flujo esté cerrado.

9. **Rendimiento y datos**  
   Límites a listeners, paginación, `expo-image`, re-renders en pantallas pesadas.

10. **Accesibilidad y usabilidad**  
    Formularios, lector de pantalla, contraste, objetivos tocables; RN + web coherentes.

### Prioridad baja (P2) — producción, escala y tienda

11. **EAS / entornos (iOS, Android, web prod)**  
    Perfiles de build, variables `EXPO_PUBLIC_*`, [STORE_RELEASE](../docs/STORE_RELEASE.md).

12. **i18n y textos**  
    Calidad de _copy_, legales, vacíos, tono en `ca` / `es` / `en`.

13. **Notificaciones push (FCM / Expo)**  
    Cuando el backend dispare eventos (estado de envío, asignación, etc.).

14. **Deuda técnica y DX**  
    Convenciones, ESLint, documentación de `store`/pasos, _feature flags_ si aplica.

15. **Métricas (opcional)**  
    _Funnel_ mínimo con criterio de privacidad.
