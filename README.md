# Crowdshipping y mudanzas compartidas

Plataforma móvil de **economía colaborativa** que conecta a personas o empresas que necesitan **enviar paquetes o realizar mudanzas** con **transportistas independientes**, optimizando rutas y reduciendo costes mediante _task-bundling_.

> Cliente **React Native + Expo (TypeScript)**, backend **Firebase**, mapas **Mapbox** y pagos **Stripe**. Una sola base de código para iOS, Android y web.

[![CI](https://github.com/AlbertCaminal/App_Transportes/actions/workflows/ci.yml/badge.svg)](https://github.com/AlbertCaminal/App_Transportes/actions/workflows/ci.yml)
![Expo SDK 54](https://img.shields.io/badge/Expo-SDK%2054-000?logo=expo) ![React Native](https://img.shields.io/badge/React%20Native-0.81-61dafb?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript) ![Estado](https://img.shields.io/badge/estado-WIP-orange)

---

## Índice

1. [Estado del proyecto](#1-estado-del-proyecto)
2. [Inicio rápido](#2-inicio-rápido)
3. [Estructura del repositorio](#3-estructura-del-repositorio)
4. [Producto y funcionalidades](#4-producto-y-funcionalidades)
5. [Arquitectura](#5-arquitectura)
6. [Configuración de servicios](#6-configuración-de-servicios)
7. [Calidad de código](#7-calidad-de-código)
8. [Publicación (Play, App Store, web)](#8-publicación-play-app-store-web)
9. [Mockups](#9-mockups)
10. [Licencia](#10-licencia)

---

## 1. Estado del proyecto

Trabajo en curso. Lo que **ya está** vs lo **planificado**:

| Capa                          | Tecnología                                                                                                    | Estado                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Cliente móvil/web             | React Native (Expo, TypeScript)                                                                               | Implementado                        |
| UI y navegación               | Componentes propios + `lucide-react-native`                                                                   | Implementado                        |
| Estado global                 | Zustand (`src/store/appStore.ts`)                                                                             | Implementado                        |
| Internacionalización          | `i18n-js` + `expo-localization` (ca/es/en)                                                                    | Implementado (migración progresiva) |
| Autenticación                 | Firebase Auth — Google Sign-In (`expo-auth-session`) + invitado anónimo, con upgrade vía `linkWithCredential` | Implementado                        |
| Base de datos                 | Firestore (`users/{uid}`)                                                                                     | Implementado                        |
| Observabilidad                | `@sentry/react-native` (opcional via DSN)                                                                     | Implementado                        |
| Calidad                       | Jest + Testing Library, ESLint endurecido, Prettier + Husky                                                   | Implementado                        |
| CI                            | GitHub Actions (`typecheck` / `lint` / `test`)                                                                | Implementado                        |
| Mapas y rutas                 | Mapbox SDK                                                                                                    | Planificado                         |
| Pagos                         | Stripe (PaymentIntents + webhooks)                                                                            | Planificado                         |
| Lógica servidor               | Firebase Cloud Functions                                                                                      | Planificado                         |
| Algoritmo de _matching_ (FPD) | Descomposición fluido-partícula                                                                               | Planificado                         |

Detalle técnico completo en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 2. Inicio rápido

Requisitos: [Node.js](https://nodejs.org/) LTS y, para dispositivo físico, [Expo Go](https://expo.dev/go).

```bash
git clone <url-del-repo>
cd App_Transporte
cp .env.example .env.local   # rellena al menos las variables EXPO_PUBLIC_FIREBASE_*
npm install
npx expo start
```

La primera pantalla es **Iniciar sesión** (el idioma de la UI sigue el del dispositivo hasta que eliges otro). Para cambiar idioma antes de entrar, pulsa **atrás** en login y verás el selector de idioma.

| Plataforma  | Cómo abrirla                                                              |
| ----------- | ------------------------------------------------------------------------- |
| **Android** | Pulsa `a` en la terminal de Expo o escanea el QR con Expo Go.             |
| **iOS**     | Pulsa `i` (macOS con Xcode) o escanea el QR con Expo Go.                  |
| **Web**     | Pulsa `w`. La app soporta web mediante Expo for Web (`react-native-web`). |

Sin variables de Firebase la app arranca igual; el bootstrap de Auth/Firestore queda inactivo (en desarrollo verás un aviso en consola).

---

## 3. Estructura del repositorio

```text
.
├── App.tsx                  Punto de entrada (proveedores + ErrorBoundary)
├── app.config.ts            Configuración de Expo (id, iconos, web, etc.)
├── eas.json                 Perfiles de build EAS (dev/preview/production)
├── firestore.rules          Reglas de seguridad de Firestore (ejemplo)
├── shared/
│   └── types.ts             Tipos del dominio
├── src/
│   ├── components/          Pantallas y piezas UI
│   ├── hooks/               Lógica reutilizable, simulaciones, bootstrap
│   ├── services/firebase/   Integración con Firebase (Auth, Firestore)
│   ├── config/              firebase.ts, publicApp.ts
│   ├── utils/               Helpers puros (p. ej. missionPricing)
│   └── theme.ts             Colores y tokens
└── docs/
    ├── ARCHITECTURE.md      Arquitectura técnica detallada
    └── STORE_RELEASE.md     Checklist para Play / App Store / web
```

---

## 4. Producto y funcionalidades

### 4.1. Mercado de dos caras

| Perfil                       | Descripción                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| **Clientes (Shippers)**      | Personas o empresas que necesitan enviar paquetes o mudar objetos.  |
| **Transportistas (Drivers)** | Conductores ocasionales o profesionales que rentabilizan sus rutas. |

### 4.2. Funcionalidades para clientes

| Funcionalidad              | Descripción                                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| Gestión de cuenta          | Registro, login seguro y perfil.                                            |
| Solicitud visual de envío  | Mapa interactivo, autocompletado de direcciones, ETA.                       |
| Modalidades                | _Mudanzas compartidas_ (task-bundling) y _transporte individual / express_. |
| Clasificación de carga     | Tallas estandarizadas (XS – XXL) por volumen y peso.                        |
| Pagos en línea             | Tarjeta o billetera digital (Stripe).                                       |
| Seguimiento en tiempo real | Vehículo en el mapa y ETA dinámico.                                         |
| Valoración y seguridad     | Reseñas bidireccionales (1–5 estrellas) y botón de emergencia.              |

### 4.3. Funcionalidades para transportistas

| Funcionalidad           | Descripción                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| Radar de trabajo        | Mapa de calor y solicitudes activas cercanas.                         |
| Gestión de encargos     | Tarjetas con tipo de carga, talla, fecha y tarifa dinámica.           |
| Filtros y matching      | Cruce automático de capacidad del vehículo con tamaño de los objetos. |
| Navegación turn-by-turn | Guiada por voz, integrada en la app.                                  |
| Subastas (VCG)          | Conductores revelan preferencias y son emparejados eficientemente.    |
| Cobro de recompensas    | Monedero digital o histórico con liquidación.                         |

### 4.4. UX/UI

- **Diseño thumb-friendly**: CTAs y navegación principal en la parte inferior.
- **Jerarquía visual**: mapas a pantalla completa, contraste y tipografía guían la atención.
- **Feedback constante**: _spinners_, _skeletons_ y alertas claras.

---

## 5. Arquitectura

Resumen de alto nivel; el detalle vive en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```text
┌──────────────┐      ┌──────────────────────────────┐      ┌───────────────┐
│   App Expo   │ ───▶ │  Firebase (Auth + Firestore) │ ◀──▶ │ Cloud Funcs   │
│ iOS/And/Web  │      │  reglas de seguridad         │      │ matching/pago │
└──────────────┘      └──────────────────────────────┘      └──────┬────────┘
        │                                                           │
        ├────────▶ Mapbox SDK (mapas, rutas, navegación)            │
        └────────▶ Stripe SDK (PaymentIntents) ◀── webhooks ────────┘
```

- **Cliente Expo** único para iOS, Android y web.
- **Firebase Auth** para identidad y **Firestore** para datos en tiempo real.
- **Cloud Functions** para lógica que no debe vivir en el cliente (matching, pagos).
- **Mapbox** y **Stripe** como SaaS externos consumidos vía SDK/API.

Tipos del dominio compartidos en [`shared/types.ts`](shared/types.ts).

---

## 6. Configuración de servicios

### 6.1. Variables de entorno

Copia [`.env.example`](.env.example) a `.env.local` y rellena los valores. **Nunca subas secretos** al repositorio (`.env*` ya está en `.gitignore`).

### 6.2. Firebase (Auth + Firestore)

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/), añade una app **Web** y copia la configuración.
2. Activa **Authentication** y habilita los métodos **Anónimo** y **Google**.
3. Activa **Firestore** en modo de prueba o con reglas propias.
4. Despliega las reglas de ejemplo: [`firestore.rules`](firestore.rules) (`firebase deploy --only firestore:rules` o pegar en la consola).
5. Rellena `EXPO_PUBLIC_FIREBASE_*` en `.env.local` y reinicia Expo.

La pantalla de Login permite **continuar como invitado** (sesión anónima de Firebase) o **iniciar con Google**. Cuando la sesión se confirma, [`useAuthSync`](src/hooks/useAuthSync.ts) refleja al usuario en el store global y `App.tsx` avanza a la selección de perfil. Sin variables de entorno de Google, el botón de Google aparece deshabilitado y solo queda disponible el modo invitado.

### 6.3. Google Sign-In

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (mismo proyecto que Firebase) crea **OAuth 2.0 Client IDs**: uno para **Web**, uno para **iOS** (con tu `bundleIdentifier`) y uno para **Android** (con tu `package` y huella SHA-1). Si vas a probar con Expo Go, crea también un Client ID de tipo "Expo".
2. En **Firebase Console → Authentication → Sign-in method** habilita **Google** y pega el **Web Client ID** en _Web SDK configuration_.
3. Añade los **redirect URIs** que `expo-auth-session` genera:
   - Expo Go: `https://auth.expo.io/@<tu-cuenta>/<slug>` (slug definido en [`app.config.ts`](app.config.ts)).
   - Builds nativas: `<scheme>:/oauthredirect` (también en `app.config.ts`).
   - Web local/producción: `http://localhost:8081/...` y la URL de tu hosting.
4. Rellena en `.env.local`:
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID` _(opcional, solo Expo Go)_
5. Reinicia Expo. El botón "Continuar con Google" se activará automáticamente.

> Nota App Store: si publicas en iOS y ofreces Google Sign-In, **Apple exige también** ofrecer Sign in with Apple. Está pendiente de implementar.

### 6.4. Mapbox y Stripe

Planificados; se documentarán cuando se integren. Las claves serán también `EXPO_PUBLIC_*` para lo público y los secretos vivirán en Cloud Functions.

---

## 7. Calidad de código

```bash
npm run typecheck   # TypeScript sin emitir archivos
npm run lint        # ESLint (configuración Expo)
```

Convenciones: TypeScript estricto, componentes funcionales con hooks, módulos puros en `src/utils/`, y aislar integraciones externas en `src/services/`.

---

## 8. Publicación (Play, App Store, web)

Una sola base de código para tres destinos. La configuración de identificadores, iconos y perfiles de build vive en [`app.config.ts`](app.config.ts) y [`eas.json`](eas.json).

| Objetivo               | Acción                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Builds de tienda**   | Cuenta Expo + [EAS Build](https://docs.expo.dev/build/introduction/): `eas build` con perfil `production`. Ajusta `bundleIdentifier` / `package` y versiones antes de subir. |
| **Metadatos legales**  | Rellena URLs y contacto en [`src/config/publicApp.ts`](src/config/publicApp.ts) (política de privacidad obligatoria si tratáis datos personales).                            |
| **Sitio web estático** | `npm run export:web` genera archivos estáticos (por defecto en `dist/`) listos para subir a tu hosting.                                                                      |

Checklist completa de publicación: [`docs/STORE_RELEASE.md`](docs/STORE_RELEASE.md).

---

## 9. Mockups

Wireframes en Figma con jerarquía visual clara, CTAs prominentes y diseño _thumb-friendly_.

| Figura   | Descripción                                                                   |
| -------- | ----------------------------------------------------------------------------- |
| Figura 1 | Pantalla de inicio de sesión y registro de usuarios.                          |
| Figura 2 | Interfaz principal con el mapa para seleccionar puntos de recogida y entrega. |
| Figura 3 | Pasarela de pago integrada con resumen de la transacción.                     |

> Las imágenes viven en `docs/mockups/figura{1,2,3}-*.png`. Si no las has añadido aún al repo, esta sección quedará sin previsualización.

![Pantalla de login y registro](docs/mockups/figura1-login-registro.png)
![Mapa de recogida y entrega](docs/mockups/figura2-mapa.png)
![Pasarela de pago](docs/mockups/figura3-pago.png)

---

## 10. Licencia

Proyecto académico (DAW). **Sin licencia abierta** salvo que se añada un archivo `LICENSE` en el repositorio. Cualquier reutilización requiere autorización del autor.
