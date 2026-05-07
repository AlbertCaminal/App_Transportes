import { computeMissionPrice } from '../missionPricing';
import type { PackageItem, PackagePhysicalSpec } from '../../../shared/types';

const xs: PackagePhysicalSpec = { lengthCm: 25, widthCm: 20, heightCm: 15, weightKg: 2 };

const mk = (id: string, specs: PackagePhysicalSpec): PackageItem => ({
  id,
  destination: 'x',
  specs,
});

describe('computeMissionPrice · edge cases', () => {
  it('programmed sense paquets: total 0 i compte 0', () => {
    const r = computeMissionPrice({
      serviceType: 'programmed',
      packages: [],
      hasSimulatedMatch: false,
    });
    expect(r.full).toBe('0.00');
    expect(r.final).toBe('0.00');
    expect(r.count).toBe(0);
  });

  it('programmed amb match però sense paquets: savings 0', () => {
    const r = computeMissionPrice({
      serviceType: 'programmed',
      packages: [],
      hasSimulatedMatch: true,
    });
    expect(r.savings).toBe('0.00');
    expect(r.final).toBe('0.00');
  });

  it('programmed: 2 paquets afegeixen un fee multi-stop de 3.50', () => {
    const single = computeMissionPrice({
      serviceType: 'programmed',
      packages: [mk('1', xs)],
      hasSimulatedMatch: false,
    });
    const double = computeMissionPrice({
      serviceType: 'programmed',
      packages: [mk('1', xs), mk('2', xs)],
      hasSimulatedMatch: false,
    });
    const diff = parseFloat(double.full) - 2 * parseFloat(single.full);
    expect(diff).toBeCloseTo(3.5, 2);
  });

  it('diverses mides express donen preus positius', () => {
    const specs: PackagePhysicalSpec[] = [
      { lengthCm: 25, widthCm: 20, heightCm: 15, weightKg: 2 },
      { lengthCm: 50, widthCm: 40, heightCm: 30, weightKg: 8 },
      { lengthCm: 100, widthCm: 80, heightCm: 70, weightKg: 30 },
      { lengthCm: 220, widthCm: 100, heightCm: 90, weightKg: 120 },
    ];
    specs.forEach((expressSpecs) => {
      const r = computeMissionPrice({
        serviceType: 'express',
        expressSpecs,
        hasSimulatedMatch: false,
      });
      expect(parseFloat(r.full)).toBeGreaterThan(0);
    });
  });
});
