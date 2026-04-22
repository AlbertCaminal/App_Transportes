import { computeMissionPrice } from '../missionPricing';
import type { PackageItem } from '../../../shared/types';

describe('computeMissionPrice', () => {
  describe('express', () => {
    it('calcula el precio express S sin match (sin descuento)', () => {
      const res = computeMissionPrice({
        serviceType: 'express',
        expressSize: 'S',
        packages: [],
        hasSimulatedMatch: false,
      });
      // base 8 + km 0.9*6 + 5 = 18.40
      expect(res.full).toBe('18.40');
      expect(res.final).toBe('18.40');
      expect(res.savings).toBe('6.44');
      expect(res.count).toBe(1);
    });

    it('aplica 35% de descuento con match simulado', () => {
      const res = computeMissionPrice({
        serviceType: 'express',
        expressSize: 'M',
        packages: [],
        hasSimulatedMatch: true,
      });
      // base 16 + km 1.2*6 + 5 = 28.20 ; descuento 9.87 ; final 18.33
      expect(res.full).toBe('28.20');
      expect(res.savings).toBe('9.87');
      expect(res.final).toBe('18.33');
    });

    it('varía por tamaño de paquete', () => {
      const xs = computeMissionPrice({
        serviceType: 'express',
        expressSize: 'XS',
        packages: [],
        hasSimulatedMatch: false,
      });
      const h = computeMissionPrice({
        serviceType: 'express',
        expressSize: 'H',
        packages: [],
        hasSimulatedMatch: false,
      });
      expect(parseFloat(xs.full)).toBeLessThan(parseFloat(h.full));
    });
  });

  describe('programmed (multi-paquete)', () => {
    const pkg = (id: string, size: PackageItem['size']): PackageItem => ({
      id,
      size,
      destination: 'Barcelona',
    });

    it('suma paquete único sin fee multi-stop', () => {
      const res = computeMissionPrice({
        serviceType: 'programmed',
        expressSize: 'S',
        packages: [pkg('1', 'S')],
        hasSimulatedMatch: false,
      });
      // S: 8 + 0.9*6 = 13.40
      expect(res.full).toBe('13.40');
      expect(res.count).toBe(1);
    });

    it('aplica fee multi-stop (3.5 por paquete adicional)', () => {
      const res = computeMissionPrice({
        serviceType: 'programmed',
        expressSize: 'S',
        packages: [pkg('1', 'S'), pkg('2', 'S'), pkg('3', 'S')],
        hasSimulatedMatch: false,
      });
      // 3 * 13.40 = 40.20 + 2 * 3.5 = 47.20
      expect(res.full).toBe('47.20');
      expect(res.count).toBe(3);
    });

    it('respeta match simulado con multi-paquete', () => {
      const res = computeMissionPrice({
        serviceType: 'programmed',
        expressSize: 'S',
        packages: [pkg('1', 'M'), pkg('2', 'XS')],
        hasSimulatedMatch: true,
      });
      // M: 16 + 1.2*6 = 23.20 ; XS: 4.5 + 0.6*6 = 8.10 ; +3.5 = 34.80
      expect(res.full).toBe('34.80');
      expect(parseFloat(res.final)).toBeCloseTo(34.8 * 0.65, 2);
    });
  });

  describe('invariantes', () => {
    it('full, final y savings son strings con 2 decimales', () => {
      const res = computeMissionPrice({
        serviceType: 'express',
        expressSize: 'S',
        packages: [],
        hasSimulatedMatch: false,
      });
      expect(res.full).toMatch(/^\d+\.\d{2}$/);
      expect(res.final).toMatch(/^\d+\.\d{2}$/);
      expect(res.savings).toMatch(/^\d+\.\d{2}$/);
    });

    it('cuando hay match, final === full - savings (tolerancia decimal)', () => {
      const res = computeMissionPrice({
        serviceType: 'express',
        expressSize: 'H',
        packages: [],
        hasSimulatedMatch: true,
      });
      expect(parseFloat(res.final)).toBeCloseTo(parseFloat(res.full) - parseFloat(res.savings), 1);
    });
  });
});
