import { I18n } from 'i18n-js';
import { useAppStore } from '../store/appStore';
import { detectDeviceLanguage } from '../utils/deviceLanguage';

import { es, type I18nDict } from './locales/es';
import { ca } from './locales/ca';
import { en } from './locales/en';

const translations = { es, ca, en } as const;

export const i18n = new I18n(translations, {
  defaultLocale: 'es',
  enableFallback: true,
});

/** Reexport para código que ya importaba desde `i18n`. */
export { detectDeviceLanguage };

// Sincroniza el idioma global del store → instancia i18n en tiempo real.
i18n.locale = useAppStore.getState().lang;
useAppStore.subscribe((state, prev) => {
  if (state.lang !== prev.lang) {
    i18n.locale = state.lang;
  }
});

/**
 * Tipado: cadena tipo "onboarding.welcome". Se genera a partir del diccionario `es`.
 */
type PathKeys<T, P extends string = ''> = {
  [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown>
    ? PathKeys<T[K], `${P}${K}.`>
    : `${P}${K}`;
}[Extract<keyof T, string>];

export type TranslationKey = PathKeys<I18nDict>;

/**
 * Traducción tipada. En tests fuera de React, importar `t` directamente.
 */
export function t(key: TranslationKey, options?: Record<string, unknown>): string {
  return i18n.t(key as string, options);
}
