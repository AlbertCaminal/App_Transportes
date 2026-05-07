import { parseAssignedCarrier, parseRequestStatus } from '../shippingRequestUi';

describe('parseRequestStatus', () => {
  it('acepta estados conocidos', () => {
    expect(parseRequestStatus('pending')).toBe('pending');
    expect(parseRequestStatus('searching_carrier')).toBe('searching_carrier');
    expect(parseRequestStatus('assigned')).toBe('assigned');
    expect(parseRequestStatus('cancelled')).toBe('cancelled');
  });

  it('rechaza valores desconocidos', () => {
    expect(parseRequestStatus('x')).toBeNull();
    expect(parseRequestStatus(null)).toBeNull();
  });
});

describe('parseAssignedCarrier', () => {
  it('parsea snapshot válido', () => {
    const row = {
      name: 'Ana',
      company: 'SL',
      photoUrl: 'https://example.com/a.jpg',
      vehicle: { brand: 'Ford', model: 'Transit', color: 'Blanco', licensePlate: '1234 abc' },
    };
    const p = parseAssignedCarrier(row);
    expect(p?.name).toBe('Ana');
    expect(p?.company).toBe('SL');
    expect(p?.photoUrl).toBe('https://example.com/a.jpg');
    expect(p?.vehicle.licensePlate).toBe('1234 ABC');
  });

  it('devuelve null si falta vehicle', () => {
    expect(parseAssignedCarrier({ name: 'x', company: '' })).toBeNull();
  });
});
