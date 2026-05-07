import type { PackagePhysicalSpec } from '../../shared/types';

/** Texto compacto para chips y notificaciones (una línea). */
export function formatPackageSpecsLine(spec: PackagePhysicalSpec, unitCm = 'cm', unitKg = 'kg'): string {
  const { lengthCm, widthCm, heightCm, weightKg } = spec;
  const dims = `${Math.round(lengthCm)}×${Math.round(widthCm)}×${Math.round(heightCm)} ${unitCm}`;
  const w = weightKg >= 10 ? weightKg.toFixed(1) : weightKg >= 1 ? weightKg.toFixed(1) : weightKg.toFixed(2);
  return `${dims} · ${w} ${unitKg}`;
}

function numField(x: unknown): number | null {
  if (typeof x === 'number' && Number.isFinite(x)) return x;
  if (typeof x === 'string' && x.trim() !== '') {
    const n = parseFloat(x.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Lee medidas desde un mapa Firestore (paquete programado o express anidado). */
export function parsePhysicalSpecFromMap(m: Record<string, unknown> | undefined): PackagePhysicalSpec | null {
  if (!m) return null;
  const lengthCm = numField(m['lengthCm']);
  const widthCm = numField(m['widthCm']);
  const heightCm = numField(m['heightCm']);
  const weightKg = numField(m['weightKg']);
  if (lengthCm == null || widthCm == null || heightCm == null || weightKg == null) return null;
  if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0 || weightKg <= 0) return null;
  return { lengthCm, widthCm, heightCm, weightKg };
}

/** Primera medida útil para UI (express o primera parada). */
export function getPrimarySpecsFromRequest(d: Record<string, unknown>): PackagePhysicalSpec | null {
  if (d['serviceType'] === 'express') {
    return parsePhysicalSpecFromMap(d['expressPackage'] as Record<string, unknown> | undefined);
  }
  const pkgs = d['packages'] as Record<string, unknown>[] | undefined;
  if (pkgs?.[0]) return parsePhysicalSpecFromMap(pkgs[0]);
  return null;
}

/** Resumen de carga para un documento `requests` (express o programado). */
export function formatCargoSummaryFromRequest(d: Record<string, unknown>): string {
  const st = d['serviceType'];
  if (st === 'express') {
    const ep = d['expressPackage'] as Record<string, unknown> | undefined;
    const spec = parsePhysicalSpecFromMap(ep);
    return spec ? formatPackageSpecsLine(spec) : '—';
  }
  const pkgs = d['packages'] as Record<string, unknown>[] | undefined;
  if (pkgs?.length) {
    const parts = pkgs.map((p) => parsePhysicalSpecFromMap(p)).filter(Boolean) as PackagePhysicalSpec[];
    if (parts.length === 1) return formatPackageSpecsLine(parts[0]);
    if (parts.length > 1) {
      return parts.map((p, i) => `${i + 1}) ${formatPackageSpecsLine(p)}`).join(' · ');
    }
  }
  return '—';
}

/** URLs de fotos del bulto en un documento `requests` (express o paradas programadas). */
export function getPackagePhotoUrlsFromRequest(d: Record<string, unknown>): string[] {
  if (d['serviceType'] === 'express') {
    const u = d['expressPackagePhotoUrl'];
    return typeof u === 'string' && u.length > 0 ? [u] : [];
  }
  const pkgs = d['packages'] as Record<string, unknown>[] | undefined;
  if (!pkgs?.length) return [];
  return pkgs
    .map((p) => p['packagePhotoUrl'])
    .filter((x): x is string => typeof x === 'string' && x.length > 0);
}
