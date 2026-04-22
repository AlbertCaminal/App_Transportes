import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { t as translate, type TranslationKey } from '.';

/**
 * Hook de traducción reactiva. Se suscribe a `lang` del store para forzar el
 * re-render al cambiar idioma sin pasar la prop `lang` por toda la UI.
 */
export function useT(): (key: TranslationKey, options?: Record<string, unknown>) => string {
  useAppStore((s) => s.lang);
  return useCallback((key, options) => translate(key, options), []);
}
