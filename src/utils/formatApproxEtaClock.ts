import type { Language } from '../../shared/types';

/** HH:MM local a partir de segundos de viaje restantes (reloj del dispositivo). */
export function formatApproxEtaClock(durationSec: number, lang: Language): string {
  const arrival = new Date(Date.now() + durationSec * 1000);
  return arrival.toLocaleTimeString(lang === 'en' ? 'en-GB' : lang === 'ca' ? 'ca-ES' : 'es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
