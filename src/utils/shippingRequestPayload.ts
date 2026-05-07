import type {
  Language,
  PackageItem,
  PackagePhysicalSpec,
  ShippingRequestClientPayload,
} from '../../shared/types';
import type { MissionPriceResult } from './missionPricing';

export function packagesForShippingRequest(
  packages: PackageItem[]
): NonNullable<ShippingRequestClientPayload['packages']> {
  return packages.map(({ id, destination, specs, image }) => {
    const row = {
      id,
      destination,
      lengthCm: specs.lengthCm,
      widthCm: specs.widthCm,
      heightCm: specs.heightCm,
      weightKg: specs.weightKg,
    };
    if (image && image.length > 0) {
      return { ...row, packagePhotoUrl: image };
    }
    return row;
  });
}

type BuildParams = {
  lang: Language;
  origin: string;
  selectedDateOffset: number;
  timeSlot: string;
  openRoutePreferred: boolean;
  priceResult: MissionPriceResult;
  hasSimulatedMatch: boolean;
} & (
  | {
      serviceType: 'express';
      expressDestination: string;
      expressPackage: PackagePhysicalSpec;
      expressPackagePhotoUrl?: string;
    }
  | {
      serviceType: 'programmed';
      packages: PackageItem[];
    }
);

/** Construye el documento de solicitud a partir del estado actual de la pantalla cliente. */
export function buildShippingRequestPayload(params: BuildParams): ShippingRequestClientPayload {
  const base: ShippingRequestClientPayload = {
    serviceType: params.serviceType,
    status: 'pending',
    lang: params.lang,
    origin: params.origin.trim(),
    selectedDateOffset: params.selectedDateOffset,
    timeSlot: params.timeSlot,
    openRoutePreferred: params.openRoutePreferred,
    priceFull: params.priceResult.full,
    priceFinal: params.priceResult.final,
    hasSimulatedMatch: params.hasSimulatedMatch,
  };
  if (params.serviceType === 'express') {
    const ex: ShippingRequestClientPayload = {
      ...base,
      expressDestination: params.expressDestination.trim(),
      expressPackage: {
        lengthCm: params.expressPackage.lengthCm,
        widthCm: params.expressPackage.widthCm,
        heightCm: params.expressPackage.heightCm,
        weightKg: params.expressPackage.weightKg,
      },
    };
    if (params.expressPackagePhotoUrl && params.expressPackagePhotoUrl.length > 0) {
      ex.expressPackagePhotoUrl = params.expressPackagePhotoUrl;
    }
    return ex;
  }
  return {
    ...base,
    packages: packagesForShippingRequest(params.packages),
  };
}
