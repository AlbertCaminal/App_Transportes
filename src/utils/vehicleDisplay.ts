import type { Vehicle } from '../../shared/types';

/** Una sola línea para perfil / ajustes. */
export function formatVehicleSummary(v: Vehicle): string {
  const head = [v.brand, v.model]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
  const color = v.color.trim();
  const plate = v.licensePlate?.trim();
  let base: string;
  if (head && color) base = `${head} · ${color}`;
  else if (head) base = head;
  else if (color) base = color;
  else base = '—';
  if (plate) return base === '—' ? plate.toUpperCase() : `${base} · ${plate.toUpperCase()}`;
  return base;
}
