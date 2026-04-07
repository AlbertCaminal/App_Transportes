# Checklist de publicación (Google Play, App Store, web)

Guía orientativa para preparar **Barcelona Logistics** (Expo) antes de enviar a revisión. Las políticas de Apple y Google cambian; revisa siempre la documentación oficial actual.

## Antes de cualquier build de producción

1. **Identificadores únicos**  
   En [`app.config.ts`](../app.config.ts) sustituye `IOS_BUNDLE_ID` y `ANDROID_PACKAGE` por el dominio invertido definitivo (no uses el placeholder `com.barcelonalogistics.app` en producción si no es tuyo).

2. **Metadatos legales**  
   Rellena [`src/config/publicApp.ts`](../src/config/publicApp.ts): URL de **política de privacidad**, correo de **soporte** y sitio/marketing. Las tiendas suelen exigir la política de privacidad si recoges datos personales o usas servicios de terceros.

3. **EAS (Expo Application Services)**  
   - Cuenta en [expo.dev](https://expo.dev).  
   - `npm i -g eas-cli` y `eas login`.  
   - En el proyecto: `eas init` (genera `projectId`).  
   - Configura `EAS_PROJECT_ID` en `.env.local` (ver [`.env.example`](../.env.example)) o deja que EAS escriba el id en el proyecto según la doc actual de Expo.

4. **Secretos**  
   No subas `.env` con API keys. El escaneo/simulación actual no debe exponer claves en el cliente; si usas `EXPO_PUBLIC_*`, recuerda que van al bundle público.

## Android — Google Play

- **Cuenta de desarrollador** de pago (Play Console).  
- **Firma:** los AAB de producción se firman con la clave de Play App Signing; EAS gestiona el proceso según tu configuración.  
- **Política de datos:** formulario de seguridad de datos en Play Console coherente con lo que hace la app (ubicación, cámara, analytics, etc.).  
- **Permisos:** declara solo lo que uses. Si la “cámara” sigue siendo simulada, no añadas permisos de cámara hasta que exista uso real.  
- **Contenido:** clasificación IARC, capturas para teléfono (y tablet si aplica), icono 512×512, descripción corta/larga.  
- **Pruebas:** canal interno/cerrado antes de producción suele ser obligatorio para apps nuevas.

Comando habitual de build (nube): `eas build --platform android --profile production`  
Perfil definido en [`eas.json`](../eas.json) (`app-bundle` para Play).

## iOS — App Store

- **Cuenta Apple Developer** de pago.  
- **App Store Connect:** crear la app, bundle id coincidente con `ios.bundleIdentifier`.  
- **Cifrado:** en `app.config` está `usesNonExemptEncryption: false` (típico si solo usas HTTPS estándar). Si incorporas cifrado no exento, revísalo con legal/técnico.  
- **Privacy Nutrition Labels:** deben coincidir con recogida real de datos.  
- **Capturas** por tamaño de dispositivo, textos de permisos (usage descriptions) si añades cámara, micrófono, ubicación, etc.

Comando habitual: `eas build --platform ios --profile production`  
Envío: `eas submit` o subida manual desde Transporter.

## Web (estático)

Exportar el bundle web para alojarlo en tu hosting (CDN, S3+CloudFront, Netlify, Vercel, etc.):

```bash
npm run export:web
```

Salida por defecto en la carpeta `dist/`. Configura HTTPS, cabeceras de seguridad y dominio definitivo. Actualiza URLs en política de privacidad y marketing cuando existan.

## Calidad y revisión

- Prueba en **dispositivo real** iOS y Android (no solo emulador/web).  
- Sin crashes en flujos principales; contenido placeholder revisado.  
- **Accesibilidad:** tamaños táctiles, contraste, lectores de pantalla en pantallas críticas cuando sea posible.  
- **Rendimiento:** arranque razonable, sin fugas obvias (timers/listeners cerrados en hooks).

## Referencias

- [Expo: deploying to app stores](https://docs.expo.dev/distribution/app-stores/)  
- [EAS Build](https://docs.expo.dev/build/introduction/)  
- [Google Play policy](https://play.google.com/about/developer-content-policy/)  
- [App Store review guidelines](https://developer.apple.com/app-store/review/guidelines/)
