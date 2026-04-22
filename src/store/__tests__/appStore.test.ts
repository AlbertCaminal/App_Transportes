import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('arranca en onboarding/es sin perfil', () => {
    const s = useAppStore.getState();
    expect(s.step).toBe('onboarding');
    expect(s.lang).toBe('es');
    expect(s.profile).toBeNull();
  });

  it('setLang desde onboarding pasa a login si no hay usuario', () => {
    useAppStore.getState().setLang('ca');
    const s = useAppStore.getState();
    expect(s.lang).toBe('ca');
    expect(s.step).toBe('login');
  });

  it('setLang desde onboarding salta a profile si ya hay usuario', () => {
    useAppStore.getState().setUser({
      uid: 'u1',
      provider: 'google',
      isAnonymous: false,
      email: 'a@b.com',
      displayName: 'A',
    });
    // setUser solo avanza a profile si veníamos de 'login'; aquí seguimos en onboarding,
    // así que el step todavía es 'onboarding'.
    expect(useAppStore.getState().step).toBe('onboarding');

    useAppStore.getState().setLang('en');
    expect(useAppStore.getState().step).toBe('profile');
    expect(useAppStore.getState().lang).toBe('en');
  });

  it('setUser desde login avanza a profile', () => {
    useAppStore.getState().setStep('login');
    useAppStore.getState().setUser({
      uid: 'u2',
      provider: 'anonymous',
      isAnonymous: true,
    });
    expect(useAppStore.getState().step).toBe('profile');
    expect(useAppStore.getState().user?.uid).toBe('u2');
  });

  it('clearUser limpia perfil y vuelve a login', () => {
    useAppStore.getState().setUser({ uid: 'u3', provider: 'google', isAnonymous: false });
    useAppStore.getState().selectProfile('client');
    useAppStore.getState().clearUser();
    const s = useAppStore.getState();
    expect(s.user).toBeNull();
    expect(s.profile).toBeNull();
    expect(s.step).toBe('login');
  });

  it('selectProfile client → home', () => {
    useAppStore.getState().selectProfile('client');
    const s = useAppStore.getState();
    expect(s.profile).toBe('client');
    expect(s.step).toBe('home');
  });

  it('selectProfile carrier → carrier-registration', () => {
    useAppStore.getState().selectProfile('carrier');
    expect(useAppStore.getState().step).toBe('carrier-registration');
  });

  it('openLegalHelp guarda returnStep y closeLegalHelp lo restaura', () => {
    useAppStore.getState().setStep('home');
    useAppStore.getState().openLegalHelp();
    expect(useAppStore.getState().step).toBe('legal-help');
    expect(useAppStore.getState().legalReturnStep).toBe('home');

    useAppStore.getState().closeLegalHelp();
    expect(useAppStore.getState().step).toBe('home');
    expect(useAppStore.getState().legalReturnStep).toBeUndefined();
  });

  it('openLegalHelp es idempotente cuando ya estamos en legal-help', () => {
    useAppStore.getState().setStep('home');
    useAppStore.getState().openLegalHelp();
    useAppStore.getState().openLegalHelp();
    expect(useAppStore.getState().legalReturnStep).toBe('home');
  });
});
