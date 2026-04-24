import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAppStore.getState().reset();
  });

  it('arranca en login sin perfil (idioma inicial del dispositivo)', () => {
    const s = useAppStore.getState();
    expect(s.step).toBe('login');
    expect(['ca', 'es', 'en']).toContain(s.lang);
    expect(s.profile).toBeNull();
    expect(s.authInitialized).toBe(false);
    expect(s.resumeAfterAuth).toBeNull();
  });

  it('setLang desde onboarding pasa a login si no hay usuario', () => {
    useAppStore.getState().setStep('onboarding');
    useAppStore.getState().setLang('ca');
    const s = useAppStore.getState();
    expect(s.lang).toBe('ca');
    expect(s.step).toBe('login');
  });

  it('setLang desde onboarding salta a profile si ya hay usuario', () => {
    useAppStore.getState().setStep('onboarding');
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

  it('setUser desde register avanza a profile', () => {
    useAppStore.getState().setStep('register');
    useAppStore.getState().setUser({
      uid: 'u-email',
      provider: 'email',
      isAnonymous: false,
      email: 'x@y.com',
    });
    expect(useAppStore.getState().step).toBe('profile');
    expect(useAppStore.getState().user?.provider).toBe('email');
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

  it('setUser desde login con rol cliente persistido vuelve a home', () => {
    useAppStore.setState({
      step: 'login',
      profile: 'client',
      boundUid: 'same-uid',
    });
    useAppStore.getState().setUser({
      uid: 'same-uid',
      provider: 'google',
      isAnonymous: false,
      email: 'a@b.com',
    });
    expect(useAppStore.getState().step).toBe('home');
    expect(useAppStore.getState().profile).toBe('client');
  });

  it('setUser desde login con modo cliente venido de Firestore va a home', () => {
    useAppStore.getState().setStep('login');
    useAppStore
      .getState()
      .setUser(
        { uid: 'remote-client', provider: 'google', isAnonymous: false, email: 'a@b.com' },
        { appMode: 'client', appLang: 'en' }
      );
    const s = useAppStore.getState();
    expect(s.step).toBe('home');
    expect(s.profile).toBe('client');
    expect(s.lang).toBe('en');
    expect(s.boundUid).toBe('remote-client');
  });

  it('setUser desde login con modo transportista y datos en Firestore va al dashboard', () => {
    useAppStore.getState().setStep('login');
    const carrier = {
      name: 'T',
      company: 'C',
      vehicle: { model: 'V', volume: 12, maxDimensions: '1x1x1' },
    };
    useAppStore
      .getState()
      .setUser(
        { uid: 'remote-carrier', provider: 'email', isAnonymous: false, email: 'c@d.com' },
        { appMode: 'carrier', carrierProfile: carrier }
      );
    const s = useAppStore.getState();
    expect(s.step).toBe('carrier-dashboard');
    expect(s.profile).toBe('carrier');
    expect(s.carrierData?.company).toBe('C');
  });

  it('setUser con UID distinto al persistido ignora el rol y muestra elegir modo', () => {
    useAppStore.setState({
      step: 'login',
      profile: 'client',
      boundUid: 'viejo',
    });
    useAppStore.getState().setUser({
      uid: 'nuevo',
      provider: 'google',
      isAnonymous: false,
      email: 'b@b.com',
    });
    expect(useAppStore.getState().step).toBe('profile');
    expect(useAppStore.getState().profile).toBeNull();
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
    expect(useAppStore.getState().carrierRegistrationReturnStep).toBe('profile');
  });

  it('exitCarrierRegistration vuelve al paso indicado en carrierRegistrationReturnStep', () => {
    useAppStore.getState().setStep('carrier-registration');
    useAppStore.setState({ carrierRegistrationReturnStep: 'account-settings' });
    useAppStore.getState().exitCarrierRegistration();
    expect(useAppStore.getState().step).toBe('account-settings');
    expect(useAppStore.getState().carrierRegistrationReturnStep).toBeUndefined();
  });

  it('openAccountSettings guarda el paso actual y muestra Mi cuenta', () => {
    useAppStore.getState().setStep('home');
    useAppStore.getState().openAccountSettings();
    expect(useAppStore.getState().step).toBe('account-settings');
    expect(useAppStore.getState().accountSettingsReturnStep).toBe('home');

    useAppStore.getState().closeAccountSettings();
    expect(useAppStore.getState().step).toBe('home');
    expect(useAppStore.getState().accountSettingsReturnStep).toBeUndefined();
  });

  it('setCarrierData con vuelta account-settings navega a account-settings', () => {
    useAppStore.setState({
      carrierRegistrationReturnStep: 'account-settings',
      profile: 'carrier',
    });
    useAppStore.getState().setCarrierData({
      name: 'Nom',
      company: 'Co',
      vehicle: { model: 'X', volume: 1, maxDimensions: '1x1' },
    });
    expect(useAppStore.getState().step).toBe('account-settings');
    expect(useAppStore.getState().carrierData?.name).toBe('Nom');
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

  it('setUser con cuenta Google y resumeAfterAuth restaura step y perfil', () => {
    useAppStore.getState().setStep('login');
    useAppStore.getState().setResumeAfterAuth({
      step: 'carrier-registration',
      profile: 'carrier',
    });
    useAppStore.getState().setUser({
      uid: 'g1',
      provider: 'google',
      isAnonymous: false,
      email: 'a@b.com',
    });
    const s = useAppStore.getState();
    expect(s.step).toBe('carrier-registration');
    expect(s.profile).toBe('carrier');
    expect(s.resumeAfterAuth).toBeNull();
  });

  it('invitado en login con resume pendiente borra resume al pasar por setUser', () => {
    useAppStore.getState().setStep('login');
    useAppStore.getState().setResumeAfterAuth({ step: 'home', profile: 'client' });
    useAppStore.getState().setUser({
      uid: 'anon',
      provider: 'anonymous',
      isAnonymous: true,
    });
    const s = useAppStore.getState();
    expect(s.resumeAfterAuth).toBeNull();
    expect(s.step).toBe('profile');
  });

  it('clearUser borra resumeAfterAuth', () => {
    useAppStore.getState().setResumeAfterAuth({ step: 'home', profile: 'client' });
    useAppStore.getState().clearUser();
    expect(useAppStore.getState().resumeAfterAuth).toBeNull();
  });
});
