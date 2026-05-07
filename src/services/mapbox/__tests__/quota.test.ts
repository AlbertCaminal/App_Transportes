import {
  canConsumeMapbox,
  getMapboxQuotaSnapshot,
  noteMapboxConsumption,
  _resetMapboxQuotaForTests,
} from '../quota';

describe('mapbox/quota', () => {
  beforeEach(() => {
    _resetMapboxQuotaForTests();
  });

  it('arranca a 0 con presupuesto > 0', () => {
    const snap = getMapboxQuotaSnapshot();
    expect(snap.geocoding.used).toBe(0);
    expect(snap.geocoding.budget).toBeGreaterThan(0);
    expect(snap.directions.used).toBe(0);
    expect(snap.directions.budget).toBeGreaterThan(0);
  });

  it('canConsume devuelve true antes del límite y false al superarlo', () => {
    expect(canConsumeMapbox('geocoding')).toBe(true);
    const budget = getMapboxQuotaSnapshot().geocoding.budget;
    noteMapboxConsumption('geocoding', budget);
    expect(canConsumeMapbox('geocoding')).toBe(false);
    expect(canConsumeMapbox('directions')).toBe(true);
  });

  it('noteMapboxConsumption no permite valores negativos', () => {
    noteMapboxConsumption('geocoding', -5 as unknown as number);
    expect(getMapboxQuotaSnapshot().geocoding.used).toBe(1);
  });

  it('contadores son independientes por familia', () => {
    noteMapboxConsumption('directions', 10);
    expect(getMapboxQuotaSnapshot().geocoding.used).toBe(0);
    expect(getMapboxQuotaSnapshot().directions.used).toBe(10);
  });
});
