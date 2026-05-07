import type { AssignedCarrierSnapshot, ShippingRequestStatus } from '../../shared/types';

const VALID: ShippingRequestStatus[] = ['pending', 'searching_carrier', 'assigned', 'cancelled'];

export function parseRequestStatus(raw: unknown): ShippingRequestStatus | null {
  if (typeof raw !== 'string' || !VALID.includes(raw as ShippingRequestStatus)) return null;
  return raw as ShippingRequestStatus;
}

/** Lectura defensiva de `requests/*.assignedCarrier` (escribe la Cloud Function al reclamar). */
export function parseAssignedCarrier(raw: unknown): AssignedCarrierSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  const company = typeof o.company === 'string' ? o.company.trim() : '';
  const photoUrl =
    o.photoUrl === null || typeof o.photoUrl === 'string' ? (o.photoUrl as string | null) : null;
  const veh = o.vehicle;
  if (!veh || typeof veh !== 'object') return null;
  const v = veh as Record<string, unknown>;
  const brand = typeof v.brand === 'string' ? v.brand.trim() : '';
  const model = typeof v.model === 'string' ? v.model.trim() : '';
  const color = typeof v.color === 'string' ? v.color.trim() : '';
  const licensePlateRaw = typeof v.licensePlate === 'string' ? v.licensePlate.trim().toUpperCase() : '';
  if (!name && !brand && !model && !color && !licensePlateRaw) return null;
  const vehicle = {
    brand,
    model,
    color,
    ...(licensePlateRaw ? { licensePlate: licensePlateRaw } : {}),
  };
  return { name: name || '', company, photoUrl, vehicle };
}
