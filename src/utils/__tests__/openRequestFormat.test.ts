import { formatShippingRequestRouteLine, getShippingRequestMapDestinations } from '../openRequestFormat';

describe('formatShippingRequestRouteLine', () => {
  it('format express amb origen i destí', () => {
    expect(
      formatShippingRequestRouteLine({
        serviceType: 'express',
        origin: 'A',
        expressDestination: 'B',
      })
    ).toBe('A → B');
  });

  it('format programat amb paquets', () => {
    expect(
      formatShippingRequestRouteLine({
        serviceType: 'programmed',
        origin: 'Hub',
        packages: [
          {
            id: '1',
            destination: 'Carrer X',
            lengthCm: 40,
            widthCm: 30,
            heightCm: 20,
            weightKg: 5,
          },
        ],
      })
    ).toBe('Carrer X');
  });
});

describe('getShippingRequestMapDestinations', () => {
  it('express: una parada', () => {
    expect(
      getShippingRequestMapDestinations({
        serviceType: 'express',
        expressDestination: 'Plaça Catalunya',
      })
    ).toEqual(['Plaça Catalunya']);
  });

  it('programat: parades dels paquets', () => {
    expect(
      getShippingRequestMapDestinations({
        serviceType: 'programmed',
        packages: [
          { id: '1', destination: 'A', lengthCm: 1, widthCm: 1, heightCm: 1, weightKg: 1 },
          { id: '2', destination: 'B', lengthCm: 1, widthCm: 1, heightCm: 1, weightKg: 1 },
        ],
      })
    ).toEqual(['A', 'B']);
  });
});
