import * as Localization from 'expo-localization';
import type { Language } from '../../shared/types';

/**
 * Idioma preferido del dispositivo. No importa i18n ni el store (evita ciclos).
 * Tests / entornos sin locales devuelven `es`.
 */
export function detectDeviceLanguage(): Language {
  const locales = Localization.getLocales?.() ?? [];
  const primary = locales[0]?.languageCode?.toLowerCase();
  if (primary === 'ca' || primary === 'en') return primary;
  return 'es';
}
