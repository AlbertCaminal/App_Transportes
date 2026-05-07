import { fetchDrivingRoute, formatDistanceM, formatDurationSec } from '../directions';
import { _resetMapboxQuotaForTests, getMapboxQuotaSnapshot, noteMapboxConsumption } from '../quota';

const ORIGINAL_FETCH = global.fetch;

describe('mapbox/directions', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'test-token';
    _resetMapboxQuotaForTests();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    delete (process.env as Record<string, string | undefined>).EXPO_PUBLIC_MAPBOX_TOKEN;
    _resetMapboxQuotaForTests();
  });

  it('devuelve null sin token', async () => {
    delete (process.env as Record<string, string | undefined>).EXPO_PUBLIC_MAPBOX_TOKEN;
    const r = await fetchDrivingRoute([
      [2.1, 41.3],
      [2.2, 41.4],
    ]);
    expect(r).toBeNull();
  });

  it('devuelve null con menos de 2 puntos', async () => {
    const r = await fetchDrivingRoute([[2.1, 41.3]]);
    expect(r).toBeNull();
  });

  it('parsea correctamente la respuesta de la API', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        routes: [
          {
            duration: 1234.5,
            distance: 5400,
            geometry: {
              type: 'LineString',
              coordinates: [
                [2.1, 41.3],
                [2.15, 41.35],
                [2.2, 41.4],
              ],
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const r = await fetchDrivingRoute([
      [2.1, 41.3],
      [2.2, 41.4],
    ]);
    expect(r).not.toBeNull();
    expect(r!.durationSec).toBeCloseTo(1234.5);
    expect(r!.distanceM).toBe(5400);
    expect(r!.geometry.coordinates.length).toBe(3);
  });

  it('reutiliza la caché en una segunda llamada con los mismos puntos', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            duration: 100,
            distance: 1000,
            geometry: {
              type: 'LineString',
              coordinates: [
                [1.111111, 2.222222],
                [3, 4],
              ],
            },
          },
        ],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchDrivingRoute([
      [1.111111, 2.222222],
      [3, 4],
    ]);
    await fetchDrivingRoute([
      [1.111111, 2.222222],
      [3, 4],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('formatDurationSec maneja menos de 1 hora', () => {
    expect(formatDurationSec(0)).toBe('—');
    expect(formatDurationSec(120)).toBe('2 min');
    expect(formatDurationSec(3600)).toBe('1 h');
    expect(formatDurationSec(3660)).toBe('1 h 1 min');
  });

  it('formatDistanceM cubre metros y kilómetros', () => {
    expect(formatDistanceM(0)).toBe('—');
    expect(formatDistanceM(450)).toBe('450 m');
    expect(formatDistanceM(1500)).toBe('1,5 km');
    expect(formatDistanceM(12000)).toBe('12 km');
  });

  it('no llama a fetch si el cupo mensual de Directions está agotado', async () => {
    const budget = getMapboxQuotaSnapshot().directions.budget;
    noteMapboxConsumption('directions', budget);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const r = await fetchDrivingRoute([
      [2.10101, 41.30101],
      [2.20202, 41.40202],
    ]);
    expect(r).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
