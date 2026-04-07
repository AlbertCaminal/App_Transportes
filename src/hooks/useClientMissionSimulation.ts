import { useEffect, useRef } from 'react';
import type { AppState } from '../../shared/types';

const MAIN_DELAY_MS = 5000;
const CARRIER_SHOW_DELAY_MS = 800;
const BANNER_HIDE_DELAY_MS = 5000;

type SetBool = (v: boolean | ((p: boolean) => boolean)) => void;

/**
 * Simula búsqueda de match en Open Route y muestra al transportista.
 * Limpia todos los timeouts al desmontar o al cambiar dependencias.
 */
export function useClientMissionSimulation(
  step: AppState['step'],
  isOpenRouteEnabled: boolean,
  hasSimulatedMatch: boolean,
  setIsSimulationActive: SetBool,
  setShowMatchNotification: SetBool,
  setShowCarrierInfo: SetBool,
  setHasSimulatedMatch: SetBool
): void {
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = () => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  };

  useEffect(() => {
    clearAll();

    const tracking = step === 'tracking' || step === 'reservation-confirmed';

    if (tracking && isOpenRouteEnabled && !hasSimulatedMatch) {
      setIsSimulationActive(true);
      setShowCarrierInfo(false);

      const t1 = setTimeout(() => {
        setHasSimulatedMatch(true);
        setShowMatchNotification(true);
        setIsSimulationActive(false);

        const t2 = setTimeout(() => {
          setShowCarrierInfo(true);

          const t3 = setTimeout(() => {
            setShowMatchNotification(false);
          }, BANNER_HIDE_DELAY_MS);
          timeoutsRef.current.push(t3);
        }, CARRIER_SHOW_DELAY_MS);
        timeoutsRef.current.push(t2);
      }, MAIN_DELAY_MS);
      timeoutsRef.current.push(t1);
    } else if (tracking && !isOpenRouteEnabled) {
      setShowCarrierInfo(true);
    }

    return clearAll;
  }, [
    step,
    isOpenRouteEnabled,
    hasSimulatedMatch,
    setHasSimulatedMatch,
    setIsSimulationActive,
    setShowCarrierInfo,
    setShowMatchNotification,
  ]);
}
