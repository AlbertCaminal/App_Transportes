import type { PackageItem, PackageSize, ServiceType } from '../../shared/types';

export interface MissionPriceResult {
  full: string;
  final: string;
  savings: string;
  count: number;
}

const MOCK_KM = 6;
const MULTI_STOP_FEE = 3.5;
const OPEN_ROUTE_DISCOUNT = 0.35;

const PRICING: Record<PackageSize, { base: number; km: number }> = {
  XS: { base: 4.5, km: 0.6 },
  S: { base: 8.0, km: 0.9 },
  M: { base: 16.0, km: 1.2 },
  H: { base: 35.0, km: 1.8 },
};

export function computeMissionPrice(params: {
  serviceType: ServiceType;
  expressSize: PackageSize;
  packages: PackageItem[];
  hasSimulatedMatch: boolean;
}): MissionPriceResult {
  const { serviceType, expressSize, packages, hasSimulatedMatch } = params;

  let totalFull = 0;
  if (serviceType === 'express') {
    const config = PRICING[expressSize];
    totalFull = config.base + config.km * MOCK_KM + 5.0;
  } else {
    packages.forEach((pkg) => {
      const config = PRICING[pkg.size];
      totalFull += config.base + config.km * MOCK_KM;
    });
    if (packages.length > 1) {
      totalFull += (packages.length - 1) * MULTI_STOP_FEE;
    }
  }

  const discount = totalFull * OPEN_ROUTE_DISCOUNT;
  const finalPrice = hasSimulatedMatch ? totalFull - discount : totalFull;

  return {
    full: totalFull.toFixed(2),
    final: finalPrice.toFixed(2),
    savings: discount.toFixed(2),
    count: serviceType === 'express' ? 1 : packages.length,
  };
}
