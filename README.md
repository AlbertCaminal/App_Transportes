# App de Crowdshipping (Barcelona)

Plataforma móvil de logística colaborativa que conecta remitentes con conductores independientes para optimizar la entrega de paquetes en Barcelona.

**Cliente:** React Native con [Expo](https://expo.dev/) (TypeScript). La app vive en la raíz de este repositorio.

---

## 1. Idea del Proyecto

Este proyecto consiste en una **plataforma móvil de crowdshipping** (logística colaborativa) que conecta a personas o empresas que necesitan enviar paquetes con conductores independientes que aprovechan sus rutas y desplazamientos diarios para realizar dichas entregas.

### Problema que resuelve

- **Optimiza la logística de última milla**, la cual suele ser costosa y un desafío para las empresas de mensajería tradicionales.
- **Reduce el impacto medioambiental** al aprovechar los viajes que los conductores ya tenían planeado realizar de todos modos.

### A quién va dirigido

El sistema tiene un **mercado de dos caras**:

| Perfil | Descripción |
|--------|-------------|
| **Remitentes (Shippers)** | Usuarios en Barcelona que buscan envíos rápidos, económicos y eficientes. |
| **Conductores (Drivers)** | Conductores ocasionales o freelance que desean rentabilizar sus trayectos ganando ingresos extra. |

### Propósito principal

Facilitar un **emparejamiento eficiente (matching)** entre la oferta y la demanda logística mediante un ecosistema digital confiable, seguro y fácil de usar.

---

## 2. Requisitos Funcionales

### Para el Usuario Remitente (Shipper)

| Requisito | Descripción |
|-----------|-------------|
| **Gestión de cuenta** | Registro, inicio de sesión seguro y gestión del perfil. |
| **Solicitud de envío** | Introducción de ubicación de recogida, destino y franja horaria deseada para la entrega. |
| **Pagos en línea** | Pago seguro del coste del envío mediante tarjetas de crédito/débito o billeteras digitales. |
| **Seguimiento en tiempo real** | Rastreo de la ubicación GPS del paquete y del conductor en un mapa interactivo durante la entrega. |
| **Sistema de valoración** | Calificación del conductor al finalizar el servicio para garantizar calidad y seguridad. |

### Para el Usuario Conductor (Driver)

| Requisito | Descripción |
|-----------|-------------|
| **Recepción de tareas** | Notificaciones sobre solicitudes de envío cercanas a su ruta. |
| **Aceptación y navegación** | Aceptar o rechazar paquetes y utilizar navegación paso a paso integrada para llegar a puntos de recogida y entrega. |
| **Cobro de recompensas** | Monedero digital o historial con ganancias y facilidades para el cobro por servicios prestados. |

---

## 3. Mockups

Los wireframes diseñados priorizan una jerarquía visual clara, botones de Llamada a la Acción (CTA) prominentes y un diseño adaptado para uso cómodo con el pulgar en dispositivos móviles.

**Herramienta utilizada:** Figma

| Figura | Descripción |
|--------|-------------|
| **Figura 1** | Pantalla de inicio de sesión y registro de usuarios. |
| **Figura 2** | Interfaz principal con el mapa para seleccionar puntos de recogida y entrega. |
| **Figura 3** | Pasarela de pago integrada con resumen de la transacción. |

![Pantalla de login y registro](docs/mockups/figura1-login-registro.png)
![Mapa de recogida y entrega](docs/mockups/figura2-mapa.png)
![Pasarela de pago](docs/mockups/figura3-pago.png)

---

## 4. Arquitectura y Tecnología

### Stack tecnológico previsto

| Capa | Tecnología | Descripción |
|------|------------|-------------|
| **Frontend** | React Native (Expo) | Una base de código para iOS, Android y prueba en web con Expo. |
| **Backend** | Firebase | BaaS para autenticación, base de datos en tiempo real y Cloud Functions. |
| **Mapas** | Mapbox | Mapas, geolocalización y rutas (integración futura). |
| **Pagos** | Stripe + PayPal | Pasarelas de pago (integración futura). |

Los tipos de dominio compartidos están en [`shared/types.ts`](shared/types.ts).

### Desarrollo (calidad de código)

```bash
npm run typecheck   # TypeScript sin emitir archivos
npm run lint        # ESLint (configuración Expo)
```

---

## Instalación y ejecución

Requisitos: [Node.js](https://nodejs.org/) LTS y, para dispositivo físico, [Expo Go](https://expo.dev/go).

```bash
cd App_Transporte
npm install
npx expo start
```

- **Android:** `a` en la terminal de Expo o escanear el QR con Expo Go.
- **iOS:** `i` (macOS con Xcode) o Expo Go.
- **Web (opcional):** `w` — requiere `react-dom` y `react-native-web` (ya en dependencias).

---

## Publicación (Play, App Store y web)

El código está organizado en **Expo** para compartir la misma base entre **Android**, **iOS** y **web**. La configuración de identificadores, iconos y perfiles de build está en [`app.config.ts`](app.config.ts) y [`eas.json`](eas.json).

| Objetivo | Acción |
|----------|--------|
| **Builds de tienda** | Cuenta Expo + [EAS Build](https://docs.expo.dev/build/introduction/): `eas build` con perfil `production`. Ajusta `bundleIdentifier` / `package` y versiones antes de subir. |
| **Metadatos legales** | Rellena URLs y contacto en [`src/config/publicApp.ts`](src/config/publicApp.ts) (política de privacidad obligatoria en tiendas si tratáis datos personales). |
| **Sitio web estático** | `npm run export:web` genera archivos estáticos (por defecto en `dist/`) para subirlos a tu hosting. |

Checklist detallada (permisos, Play Console, App Store Connect, secretos): **[docs/STORE_RELEASE.md](docs/STORE_RELEASE.md)**.

Variables de entorno de ejemplo (sin secretos en el repo): [`.env.example`](.env.example).

---

## Licencia

Proyecto académico (DAW). Todos los derechos reservados por el autor, salvo que se indique otra licencia en el repositorio.
