import { suggestAddresses } from '../suggest';
import { _resetMapboxQuotaForTests, getMapboxQuotaSnapshot, noteMapboxConsumption } from '../quota';

const ORIGINAL_FETCH = global.fetch;

describe('mapbox/suggest', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'test-token';
    _resetMapboxQuotaForTests();
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    delete (process.env as Record<string, string | undefined>).EXPO_PUBLIC_MAPBOX_TOKEN;
    _resetMapboxQuotaForTests();
  });

  it('devuelve [] para consultas demasiado cortas', async () => {
    const r = await suggestAddresses('ab');
    expect(r).toEqual([]);
  });

  it('devuelve [] sin token', async () => {
    delete (process.env as Record<string, string | undefined>).EXPO_PUBLIC_MAPBOX_TOKEN;
    const r = await suggestAddresses('Carrer Provença');
    expect(r).toEqual([]);
  });

  it('parsea sugerencias y filtra centros inválidos', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [
          { id: 'a1', place_name: 'Carrer A 1, Barcelona', center: [2.1, 41.3] },
          { id: 'a2', place_name: 'Carrer B 2, Barcelona', center: [2.2, 41.4] },
          { id: 'broken', place_name: 'Sin centro' },
        ],
      }),
    }) as unknown as typeof fetch;
    const r = await suggestAddresses('Carrer A unique-token-1');
    expect(r).toHaveLength(2);
    expect(r[0].placeName).toContain('Carrer A');
    expect(r[1].center).toEqual([2.2, 41.4]);
  });

  it('reutiliza caché en consultas repetidas', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [{ id: 'x', place_name: 'X', center: [1, 2] }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    await suggestAddresses('Plaça Catalunya unique');
    await suggestAddresses('Plaça Catalunya unique');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no llama a fetch cuando se ha consumido el presupuesto del mes', async () => {
    const budget = getMapboxQuotaSnapshot().geocoding.budget;
    noteMapboxConsumption('geocoding', budget);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const r = await suggestAddresses('Carrer Aragó 200, Barcelona over-budget');
    expect(r).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('respeta AbortSignal abortado de antemano', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const r = await suggestAddresses('Carrer Aragó aborted', { signal: ctrl.signal });
    expect(r).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('dedupe: dos llamadas simultáneas comparten un único fetch', async () => {
    let resolveFn: ((v: unknown) => void) | null = null;
    const inflight = new Promise((resolve) => {
      resolveFn = resolve;
    });
    const fetchMock = jest.fn().mockReturnValue(
      inflight.then(() => ({
        ok: true,
        json: async () => ({
          features: [{ id: 'p', place_name: 'Carrer Compartit, Barcelona', center: [2.16, 41.39] }],
        }),
      }))
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const p1 = suggestAddresses('Carrer Compartit dedupe-token');
    const p2 = suggestAddresses('Carrer Compartit dedupe-token');
    resolveFn!(undefined);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);
  });
});
