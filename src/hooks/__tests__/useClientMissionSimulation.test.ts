import { renderHook, act } from '@testing-library/react-native';
import { useClientMissionSimulation } from '../useClientMissionSimulation';

describe('useClientMissionSimulation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  function setup(step: 'tracking' | 'home', isOpenRoute = true) {
    const setSim = jest.fn();
    const setMatch = jest.fn();
    const setCarrier = jest.fn();
    const setHasMatch = jest.fn();

    const view = renderHook(() =>
      useClientMissionSimulation(step, isOpenRoute, false, setSim, setMatch, setCarrier, setHasMatch)
    );

    return { view, setSim, setMatch, setCarrier, setHasMatch };
  }

  it('no activa simulación si el paso no es tracking', () => {
    const { setSim, setHasMatch } = setup('home');
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(setSim).not.toHaveBeenCalledWith(true);
    expect(setHasMatch).not.toHaveBeenCalled();
  });

  it('en tracking con open route: activa sim y tras 5s marca match', () => {
    const { setSim, setHasMatch, setMatch } = setup('tracking');

    expect(setSim).toHaveBeenCalledWith(true);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(setHasMatch).toHaveBeenCalledWith(true);
    expect(setMatch).toHaveBeenCalledWith(true);
    expect(setSim).toHaveBeenLastCalledWith(false);
  });

  it('con open route desactivado muestra transportista inmediatamente', () => {
    const { setCarrier } = setup('tracking', false);
    expect(setCarrier).toHaveBeenCalledWith(true);
  });

  it('limpia timers al desmontar sin disparar efectos secundarios adicionales', () => {
    const { view, setHasMatch } = setup('tracking');
    view.unmount();
    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(setHasMatch).not.toHaveBeenCalled();
  });
});
