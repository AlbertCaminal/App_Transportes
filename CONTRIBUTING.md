# Contribuir a Barcelona Logistics

Gracias por querer aportar. Este documento explica cómo preparar el entorno,
el flujo de trabajo esperado y qué se verifica en CI.

## 1. Requisitos

- Node.js 20 LTS (misma versión que CI).
- npm 10+.
- Opcional: cuenta de Expo (EAS) y Firebase (ver [`README.md`](README.md)).

## 2. Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena las EXPO_PUBLIC_* que necesites
npm start                    # Expo Dev Tools
```

El primer `npm install` instala los hooks de Git mediante Husky (`prepare`).

## 3. Scripts principales

| Script                  | Qué hace                                      |
| ----------------------- | --------------------------------------------- |
| `npm run typecheck`     | TypeScript estricto con stack ampliado        |
| `npm run lint`          | `expo lint` (flat config, reglas endurecidas) |
| `npm test`              | Jest (unit + smoke)                           |
| `npm run test:watch`    | Jest en watch mode                            |
| `npm run test:coverage` | Jest con informe de cobertura (`coverage/`)   |
| `npm run format`        | Prettier `--write` sobre todo el repo         |
| `npm run format:check`  | Prettier `--check` (útil en CI)               |
| `npm run export:web`    | Exporta el bundle web estático a `dist/`      |

## 4. Flujo de trabajo

1. Crea una rama corta: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
2. Sigue el estilo de **Conventional Commits**: `feat:`, `fix:`, `refactor:`,
   `docs:`, `test:`, `chore:`, `ci:`. Mensajes en español o inglés, pero
   consistentes dentro de la PR.
3. El hook `pre-commit` ejecuta `lint-staged` (ESLint `--fix` + Prettier) sobre
   los archivos tocados. Si algo queda sin arreglar, falla el commit.
4. Abre la PR. El workflow [`CI`](.github/workflows/ci.yml) ejecuta:
   - `npm ci`
   - `npm run typecheck`
   - `npm run lint -- --max-warnings=0`
   - `npm test -- --ci`
   - cobertura como artefacto (no bloqueante)
5. No se mergea hasta que CI está verde.

## 5. Convenciones de código

- **Componentes**: un fichero por componente, `PascalCase`, exportación por
  defecto o con nombre según el patrón existente.
- **Hooks**: `src/hooks/useXxx.ts`. Prefiere hooks puros y testeables con
  `jest.useFakeTimers`.
- **Estado global**: Zustand en [`src/store/appStore.ts`](src/store/appStore.ts).
  Añade selectores explícitos en el propio store para evitar que los
  componentes se re-rendericen por cambios ajenos.
- **Copys / textos**: sólo en [`src/i18n/locales/*`](src/i18n/locales). Usa
  `useT()` en componentes y, en tests, `import { t } from '.../i18n'`. No añadas
  objetos `const copy = { ca, es, en }` nuevos.
- **Accesibilidad**: todo `Pressable` interactivo debe declarar
  `accessibilityRole` y `accessibilityLabel` (y `accessibilityState` cuando
  represente selección/checked). Referencia las implementaciones existentes en
  [`ClientHome.tsx`](src/components/ClientHome.tsx) y
  [`CarrierHome.tsx`](src/components/CarrierHome.tsx).
- **`console`**: sólo `console.warn` y `console.error`. Para mensajes de
  desarrollo, envuélvelos en `if (__DEV__) { ... }`.
- **Timers / suscripciones**: limpia en `useEffect` devolviendo un teardown.
- **Imports**: ordenados por grupos (third-party → alias → relativo) y
  evitando ciclos.
- **Autenticación**: la fuente de verdad es Firebase Auth. No leas
  `auth.currentUser` en componentes; consume el store global con
  `useAppStore((s) => s.user)`. Para cerrar sesión, llama a `signOutUser()` y
  `clearUser()` (orden importante para evitar parpadeos en la UI).
- **Tests con Firebase**: si tu test importa código que a su vez importa
  `firebase/*`, mockea `src/config/firebase` y `src/services/firebase/auth`
  para no arrastrar el bundle ESM de `@firebase/util` (ver
  `src/components/__tests__/Login.test.tsx` como referencia).

## 6. Tests

- Pruebas unitarias para utilidades puras (`src/utils/`) y hooks con timers
  (`src/hooks/`): objetivo de cobertura ≥ 60%.
- Smoke tests para componentes críticos con `@testing-library/react-native`.
- Snapshots de locales en [`src/i18n/__tests__/locales.test.ts`](src/i18n/__tests__/locales.test.ts)
  para evitar claves huérfanas entre idiomas.

Ejemplo mínimo:

```ts
import { render, screen } from '@testing-library/react-native';
import MiComponente from '../MiComponente';

it('renderiza el título', () => {
  render(<MiComponente />);
  expect(screen.getByText('Hola')).toBeTruthy();
});
```

## 7. Secretos y variables de entorno

- Nunca subas `.env.local` (ya está en `.gitignore`).
- Las variables con prefijo `EXPO_PUBLIC_*` se incluyen en el bundle del
  cliente. No almacenes secretos reales ahí.
- Para Sentry, añade `EXPO_PUBLIC_SENTRY_DSN` en tu `.env.local`. Si falta,
  Sentry queda deshabilitado automáticamente.
- Para Google Sign-In necesitas los `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`. Si están
  vacíos, el botón se renderiza deshabilitado pero el resto de la app sigue
  funcionando (modo invitado). Detalles en [`README.md` §6.3](README.md).

## 8. Publicación

Ver [`docs/STORE_RELEASE.md`](docs/STORE_RELEASE.md) para el checklist completo
(Google Play, App Store, web estática).

## 9. Reporte de errores

- Bugs de la aplicación: crea un issue con pasos, entorno y capturas.
- Vulnerabilidades: contacta por privado al correo indicado en
  [`src/config/publicApp.ts`](src/config/publicApp.ts).
