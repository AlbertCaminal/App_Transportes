import { buildShippingRequestPayload } from '../shippingRequestPayload';

const specs = { lengthCm: 50, widthCm: 40, heightCm: 30, weightKg: 6 };

describe('buildShippingRequestPayload', () => {
  it('express inclou expressPackage i sense packages', () => {
    const p = buildShippingRequestPayload({
      lang: 'es',
      serviceType: 'express',
      origin: 'A',
      expressDestination: 'B',
      expressPackage: { ...specs },
      selectedDateOffset: 0,
      timeSlot: '08:00-10:00',
      openRoutePreferred: false,
      priceResult: { full: '10', final: '9', savings: '1', count: 1 },
      hasSimulatedMatch: false,
    });
    expect(p.serviceType).toBe('express');
    expect(p.expressPackage).toEqual(specs);
    expect(p.packages).toBeUndefined();
  });

  it('express pot incloure expressPackagePhotoUrl', () => {
    const p = buildShippingRequestPayload({
      lang: 'es',
      serviceType: 'express',
      origin: 'A',
      expressDestination: 'B',
      expressPackage: { ...specs },
      expressPackagePhotoUrl: 'https://example.com/p.jpg',
      selectedDateOffset: 0,
      timeSlot: '08:00-10:00',
      openRoutePreferred: false,
      priceResult: { full: '10', final: '9', savings: '1', count: 1 },
      hasSimulatedMatch: false,
    });
    expect(p.expressPackagePhotoUrl).toBe('https://example.com/p.jpg');
  });

  it('programat pot incloure packagePhotoUrl per parada', () => {
    const p = buildShippingRequestPayload({
      lang: 'es',
      serviceType: 'programmed',
      origin: 'O',
      packages: [
        {
          id: '1',
          destination: 'D1',
          specs: { lengthCm: 40, widthCm: 30, heightCm: 20, weightKg: 5 },
          image: 'https://example.com/stop.jpg',
        },
      ],
      selectedDateOffset: 1,
      timeSlot: '10:00-12:00',
      openRoutePreferred: true,
      priceResult: { full: '20', final: '18', savings: '2', count: 1 },
      hasSimulatedMatch: true,
    });
    expect(p.serviceType).toBe('programmed');
    expect(p.packages?.[0]).toMatchObject({
      id: '1',
      destination: 'D1',
      lengthCm: 40,
      widthCm: 30,
      heightCm: 20,
      weightKg: 5,
      packagePhotoUrl: 'https://example.com/stop.jpg',
    });
    expect(p.expressPackage).toBeUndefined();
    expect(p.expressDestination).toBeUndefined();
  });
});
