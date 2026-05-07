import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useDeviceLocation } from '../useDeviceLocation';

describe('useDeviceLocation (web)', () => {
  const origNav = (globalThis as unknown as { navigator?: unknown }).navigator;
  const origOS = Platform.OS;

  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
  });

  afterEach(() => {
    (globalThis as unknown as { navigator?: unknown }).navigator = origNav;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => origOS });
  });

  it('arranca en idle, sin posición', () => {
    const { result } = renderHook(() => useDeviceLocation());
    expect(result.current.status).toBe('idle');
    expect(result.current.position).toBeNull();
  });

  it('pasa a granted con posición cuando navigator.geolocation funciona', async () => {
    const navMock = {
      geolocation: {
        getCurrentPosition: (success: (pos: { coords: { longitude: number; latitude: number } }) => void) => {
          success({ coords: { longitude: 2.17, latitude: 41.38 } });
        },
      },
    };
    (globalThis as unknown as { navigator: typeof navMock }).navigator = navMock;

    const { result } = renderHook(() => useDeviceLocation());
    await act(async () => {
      await result.current.request();
    });
    await waitFor(() => expect(result.current.status).toBe('granted'));
    expect(result.current.position).toEqual([2.17, 41.38]);
  });

  it('pasa a denied cuando el usuario rechaza', async () => {
    const navMock = {
      geolocation: {
        getCurrentPosition: (_success: unknown, err: (e: { code: number; message: string }) => void) => {
          err({ code: 1, message: 'denied' });
        },
      },
    };
    (globalThis as unknown as { navigator: typeof navMock }).navigator = navMock;

    const { result } = renderHook(() => useDeviceLocation());
    await act(async () => {
      await result.current.request();
    });
    await waitFor(() => expect(result.current.status).toBe('denied'));
    expect(result.current.position).toBeNull();
  });

  it('pasa a unavailable cuando navigator no tiene geolocation', async () => {
    (globalThis as unknown as { navigator: { geolocation?: unknown } }).navigator = {};

    const { result } = renderHook(() => useDeviceLocation());
    await act(async () => {
      await result.current.request();
    });
    await waitFor(() => expect(result.current.status).toBe('unavailable'));
  });
});
