import { computeMissionPrice } from '../missionPricing';
import type { PackageItem } from '../../../shared/types';

const mk = (id: string, size: PackageItem['size']): PackageItem => ({
  id,
  size,
  destination: 'x',
});

describe('computeMissionPrice · edge cases', () => {
  it('programmed sin paquetes: total 0 y conteo 0', () => {
    const r = computeMissionPrice({
      serviceType: 'programmed',
      expressSize: 'S',
      packages: [],
      hasSimulatedMatch: false,
    });
    expect(r.full).toBe('0.00');
    expect(r.final).toBe('0.00');
    expect(r.count).toBe(0);
  });

  it('programmed con match pero sin paquetes: savings 0', () => {
    const r = computeMissionPrice({
      serviceType: 'programmed',
      expressSize: 'S',
      packages: [],
      hasSimulatedMatch: true,
    });
    expect(r.savings).toBe('0.00');
    expect(r.final).toBe('0.00');
  });

  it('programmed: 2 paquetes añaden un fee multi-stop de 3.50', () => {
    const single = computeMissionPrice({
      serviceType: 'programmed',
      expressSize: 'S',
      packages: [mk('1', 'XS')],
      hasSimulatedMatch: false,
    });
    const double = computeMissionPrice({
      serviceType: 'programmed',
      expressSize: 'S',
      packages: [mk('1', 'XS'), mk('2', 'XS')],
      hasSimulatedMatch: false,
    });
    const diff = parseFloat(double.full) - 2 * parseFloat(single.full);
    expect(diff).toBeCloseTo(3.5, 2);
  });

  it('todos los tamaños válidos producen numéricos positivos', () => {
    (['XS', 'S', 'M', 'H'] as const).forEach((size) => {
      const r = computeMissionPrice({
        serviceType: 'express',
        expressSize: size,
        packages: [],
        hasSimulatedMatch: false,
      });
      expect(parseFloat(r.full)).toBeGreaterThan(0);
    });
  });
});
