import { useCallback, useEffect, useRef } from 'react';

const CALC_MS = 800;

/**
 * Programa el cierre del "cálculo" de tarifa tras CALC_MS; limpia al desmontar.
 */
export function useReviewTariffDelay() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return useCallback((onComplete: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onComplete();
    }, CALC_MS);
  }, []);
}
