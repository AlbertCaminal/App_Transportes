import type { PackageItem, PackagePhysicalSpec, ServiceType } from '../../shared/types';

export interface MissionPriceResult {
  full: string;
  final: string;
  savings: string;
  count: number;
}

const MOCK_KM = 6;
const MULTI_STOP_FEE = 3.5;
const OPEN_ROUTE_DISCOUNT = 0.35;

/** Bandas internas de tarifa (sustituyen el antiguo XS/S/M/H por talla). */
type PricingTier = 'XS' | 'S' | 'M' | 'H';

const PRICING: Record<PricingTier, { base: number; km: number }> = {
  XS: { base: 4.5, km: 0.6 },
  S: { base: 8.0, km: 0.9 },
  M: { base: 16.0, km: 1.2 },
  H: { base: 35.0, km: 1.8 },
};

/** Infiere la banda de precio a partir de volumen, arista mayor y peso. */
export function tierFromPhysical(spec: PackagePhysicalSpec): PricingTier {
  const { lengthCm, widthCm, heightCm, weightKg } = spec;
  const volL = (lengthCm * widthCm * heightCm) / 1000;
  const longest = Math.max(lengthCm, widthCm, heightCm);
  if (longest <= 40 && volL <= 60 && weightKg <= 5) return 'XS';
  if (longest <= 90 && volL <= 200 && weightKg <= 20) return 'S';
  if (longest <= 180 && volL <= 800 && weightKg <= 45) return 'M';
  return 'H';
}

export function computeMissionPrice(
  params:
    | {
        serviceType: 'express';
        expressSpecs: PackagePhysicalSpec;
        hasSimulatedMatch: boolean;
      }
    | {
        serviceType: 'programmed';
        packages: PackageItem[];
        hasSimulatedMatch: boolean;
      }
): MissionPriceResult {
  const { serviceType, hasSimulatedMatch } = params;

  let totalFull = 0;
  if (serviceType === 'express') {
    const tier = tierFromPhysical(params.expressSpecs);
    const config = PRICING[tier];
    totalFull = config.base + config.km * MOCK_KM + 5.0;
  } else {
    params.packages.forEach((pkg) => {
      const tier = tierFromPhysical(pkg.specs);
      const config = PRICING[tier];
      totalFull += config.base + config.km * MOCK_KM;
    });
    if (params.packages.length > 1) {
      totalFull += (params.packages.length - 1) * MULTI_STOP_FEE;
    }
  }

  const discount = totalFull * OPEN_ROUTE_DISCOUNT;
  const finalPrice = hasSimulatedMatch ? totalFull - discount : totalFull;

  return {
    full: totalFull.toFixed(2),
    final: finalPrice.toFixed(2),
    savings: discount.toFixed(2),
    count: serviceType === 'express' ? 1 : params.packages.length,
  };
}
