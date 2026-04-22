import { create } from 'zustand';
import type {
  AppStep,
  AppState,
  AuthUser,
  CarrierData,
  Language,
  LegalReturnStep,
  UserProfile,
} from '../../shared/types';

/**
 * Store global con Zustand. Agrupa el estado previo de `App.tsx` (lang, profile,
 * step, carrierData, legalReturnStep) y las acciones que lo manipulan.
 *
 * Slices lógicos (no físicamente separados para no sobre-modularizar):
 *   - session: `lang`, `profile`, `user`
 *   - navigation: `step`, `legalReturnStep`
 *   - carrier: `carrierData`
 */
interface AppStore extends AppState {
  setLang: (lang: Language) => void;
  selectProfile: (profile: UserProfile) => void;
  setCarrierData: (data: CarrierData) => void;
  setStep: (step: AppStep) => void;
  openLegalHelp: () => void;
  closeLegalHelp: () => void;
  /** Refleja el resultado de Firebase `onAuthStateChanged`. */
  setUser: (user: AuthUser | null) => void;
  /** Limpia el usuario y vuelve al onboarding (uso típico tras cerrar sesión). */
  clearUser: () => void;
  reset: () => void;
}

const initial: AppState = {
  lang: 'es',
  profile: null,
  step: 'onboarding',
  user: null,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initial,

  setLang: (lang) =>
    set((prev) => ({
      lang,
      // Si ya hay usuario autenticado al cambiar idioma desde el onboarding inicial,
      // saltamos directamente a perfil; si no, vamos al login.
      step: prev.step === 'onboarding' ? (prev.user ? 'profile' : 'login') : prev.step,
    })),

  selectProfile: (profile) =>
    set({
      profile,
      step: profile === 'carrier' ? 'carrier-registration' : 'home',
    }),

  setCarrierData: (data) => set({ carrierData: data, step: 'carrier-dashboard' }),

  setStep: (step) => set({ step }),

  openLegalHelp: () =>
    set((prev) => {
      if (prev.step === 'legal-help') return prev;
      return {
        step: 'legal-help',
        legalReturnStep: prev.step as LegalReturnStep,
      };
    }),

  closeLegalHelp: () =>
    set((prev) => ({
      step: prev.legalReturnStep ?? 'profile',
      legalReturnStep: undefined,
    })),

  setUser: (user) =>
    set((prev) => {
      // Si el usuario aparece estando en 'login', avanzamos a 'profile'.
      const next: Partial<AppState> = { user };
      if (user && prev.step === 'login') {
        next.step = 'profile';
      }
      return next;
    }),

  clearUser: () =>
    set({
      user: null,
      profile: null,
      carrierData: undefined,
      step: 'login',
    }),

  reset: () => set({ ...initial }),
}));

// Selectores tipados para evitar re-renders innecesarios en componentes
export const selectLang = (s: AppStore) => s.lang;
export const selectStep = (s: AppStore) => s.step;
export const selectProfile = (s: AppStore) => s.profile;
export const selectCarrierData = (s: AppStore) => s.carrierData;
export const selectUser = (s: AppStore) => s.user;
