import { act, renderHook } from '@testing-library/react-native';
import { useReviewTariffDelay } from '../useReviewTariffDelay';

describe('useReviewTariffDelay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('invoca onComplete después de 800ms', () => {
    const { result } = renderHook(() => useReviewTariffDelay());
    const cb = jest.fn();

    act(() => {
      result.current(cb);
    });
    expect(cb).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(799);
    });
    expect(cb).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('cancela el timer anterior si se vuelve a invocar', () => {
    const { result } = renderHook(() => useReviewTariffDelay());
    const firstCb = jest.fn();
    const secondCb = jest.fn();

    act(() => {
      result.current(firstCb);
    });
    act(() => {
      jest.advanceTimersByTime(400);
      result.current(secondCb);
      jest.advanceTimersByTime(800);
    });

    expect(firstCb).not.toHaveBeenCalled();
    expect(secondCb).toHaveBeenCalledTimes(1);
  });

  it('limpia el timer al desmontar sin ejecutar el callback', () => {
    const { result, unmount } = renderHook(() => useReviewTariffDelay());
    const cb = jest.fn();

    act(() => {
      result.current(cb);
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(cb).not.toHaveBeenCalled();
  });
});
