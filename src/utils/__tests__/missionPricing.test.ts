import { computeMissionPrice } from '../missionPricing';
import type { PackageItem, PackagePhysicalSpec } from '../../../shared/types';

const tierS: PackagePhysicalSpec = { lengthCm: 50, widthCm: 40, heightCm: 30, weightKg: 8 };
const tierM: PackagePhysicalSpec = { lengthCm: 100, widthCm: 80, heightCm: 70, weightKg: 30 };
const tierXS: PackagePhysicalSpec = { lengthCm: 25, widthCm: 20, heightCm: 15, weightKg: 2 };
const tierH: PackagePhysicalSpec = { lengthCm: 220, widthCm: 100, heightCm: 90, weightKg: 120 };

describe('computeMissionPrice', () => {
  describe('express', () => {
    it('calcula el precio express (banda S) sense match (sense descompte)', () => {
      const res = computeMissionPrice({
        serviceType: 'express',
        expressSpecs: tierS,
        hasSimulatedMatch: false,
      });
      expect(res.full).toBe('18.40');
      expect(res.final).toBe('18.40');
      expect(res.savings).toBe('6.44');
      expect(res.count).toBe(1);
    });

    it('aplica 35% de descompte amb match simulat', () => {
      const res = computeMissionPrice({
        serviceType: 'express',
        expressSpecs: tierM,
        hasSimulatedMatch: true,
      });
      expect(res.full).toBe('28.20');
      expect(res.savings).toBe('9.87');
      expect(res.final).toBe('18.33');
    });

    it('varia segons volum i pes (XS vs H)', () => {
      const xs = computeMissionPrice({
        serviceType: 'express',
        expressSpecs: tierXS,
        hasSimulatedMatch: false,
      });
      const h = computeMissionPrice({
        serviceType: 'express',
        expressSpecs: tierH,
        hasSimulatedMatch: false,
      });
      expect(parseFloat(xs.full)).toBeLessThan(parseFloat(h.full));
    });
  });

  describe('programmed (multi-paquet)', () => {
    const pkg = (id: string, specs: PackagePhysicalSpec): PackageItem => ({
      id,
      destination: 'Barcelona',
      specs,
    });

    it('suma un sol paquet sense fee multi-parada', () => {
      const res = computeMissionPrice({
        serviceType: 'programmed',
        packages: [pkg('1', tierS)],
        hasSimulatedMatch: false,
      });
      expect(res.full).toBe('13.40');
      expect(res.count).toBe(1);
    });

    it('aplica fee multi-parada (3.5 per parada addicional)', () => {
      const res = computeMissionPrice({
        serviceType: 'programmed',
        packages: [pkg('1', tierS), pkg('2', tierS), pkg('3', tierS)],
        hasSimulatedMatch: false,
      });
      expect(res.full).toBe('47.20');
      expect(res.count).toBe(3);
    });

    it('respecta match simulat amb diverses bandes', () => {
      const res = computeMissionPrice({
        serviceType: 'programmed',
        packages: [pkg('1', tierM), pkg('2', tierXS)],
        hasSimulatedMatch: true,
      });
      expect(res.full).toBe('34.80');
      expect(parseFloat(res.final)).toBeCloseTo(34.8 * 0.65, 2);
    });
  });

  describe('invariants', () => {
    it('full, final i savings són strings amb 2 decimals', () => {
      const res = computeMissionPrice({
        serviceType: 'express',
        expressSpecs: tierS,
        hasSimulatedMatch: false,
      });
      expect(res.full).toMatch(/^\d+\.\d{2}$/);
      expect(res.final).toMatch(/^\d+\.\d{2}$/);
      expect(res.savings).toMatch(/^\d+\.\d{2}$/);
    });

    it('amb match, final === full - savings (tolerància)', () => {
      const res = computeMissionPrice({
        serviceType: 'express',
        expressSpecs: tierH,
        hasSimulatedMatch: true,
      });
      expect(parseFloat(res.final)).toBeCloseTo(parseFloat(res.full) - parseFloat(res.savings), 1);
    });
  });
});
