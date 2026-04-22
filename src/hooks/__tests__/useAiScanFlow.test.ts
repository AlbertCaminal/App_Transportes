import { renderHook, act } from '@testing-library/react-native';
import { useAiScanFlow } from '../useAiScanFlow';

describe('useAiScanFlow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0); // fuerza 'XS'
  });

  afterEach(() => {
    jest.useRealTimers();
    (Math.random as jest.Mock).mockRestore?.();
  });

  it('estado inicial: no escaneando y sin resultado', () => {
    const { result } = renderHook(() => useAiScanFlow(jest.fn(), jest.fn(), jest.fn()));
    expect(result.current.isScanning).toBe(false);
    expect(result.current.scanResult).toBeNull();
  });

  it('express: tras SCAN_PHASE aplica tamaño express y muestra banner', () => {
    const onExpress = jest.fn();
    const onPkg = jest.fn();
    const onHide = jest.fn();
    const { result } = renderHook(() => useAiScanFlow(onExpress, onPkg, onHide));

    act(() => {
      result.current.handleAIScan('express');
    });
    expect(result.current.isScanning).toBe(true);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(onExpress).toHaveBeenCalledWith('XS');
    expect(onPkg).not.toHaveBeenCalled();
    expect(result.current.scanResult?.size).toBe('XS');
  });

  it('paquete individual: aplica tamaño al id correcto y oculta precio al final', () => {
    const onExpress = jest.fn();
    const onPkg = jest.fn();
    const onHide = jest.fn();
    const { result } = renderHook(() => useAiScanFlow(onExpress, onPkg, onHide));

    act(() => {
      result.current.handleAIScan('pkg-1');
    });
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(onPkg).toHaveBeenCalledWith('pkg-1', 'XS');

    act(() => {
      jest.advanceTimersByTime(1500);
    });
    expect(onHide).toHaveBeenCalled();
    expect(result.current.isScanning).toBe(false);
    expect(result.current.scanResult).toBeNull();
  });

  it('lanzar un nuevo escaneo cancela el anterior', () => {
    const onExpress = jest.fn();
    const onPkg = jest.fn();
    const onHide = jest.fn();
    const { result } = renderHook(() => useAiScanFlow(onExpress, onPkg, onHide));

    act(() => {
      result.current.handleAIScan('pkg-1');
      jest.advanceTimersByTime(1000);
      result.current.handleAIScan('pkg-2');
      jest.advanceTimersByTime(2500);
    });

    expect(onPkg).toHaveBeenCalledTimes(1);
    expect(onPkg).toHaveBeenCalledWith('pkg-2', 'XS');
  });

  it('desmontar cancela timers pendientes', () => {
    const onHide = jest.fn();
    const { result, unmount } = renderHook(() => useAiScanFlow(jest.fn(), jest.fn(), onHide));

    act(() => {
      result.current.handleAIScan('pkg-1');
    });
    unmount();
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(onHide).not.toHaveBeenCalled();
  });
});
