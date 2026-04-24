import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  AppStep,
  AppState,
  AuthUser,
  CarrierData,
  Language,
  LegalReturnStep,
  ResumeAfterAuth,
  UserProfile,
  UserSessionDoc,
} from '../../shared/types';
import { persistUserSessionFields } from '../services/firestore/userSession';
import { detectDeviceLanguage } from '../utils/deviceLanguage';

/**
 * Decide el paso tras login/registro cuando hay sesión Firebase y datos persistidos del mismo UID.
 */
function stepForRestoredRole(prev: AppState): AppStep {
  if (prev.profile === 'client') return 'home';
  if (prev.profile === 'carrier') {
    return prev.carrierData ? 'carrier-dashboard' : 'carrier-registration';
  }
  return 'profile';
}

function canRestoreRoleFromPersist(prev: AppState, uid: string): boolean {
  return Boolean(prev.boundUid && prev.boundUid === uid && prev.profile);
}

interface AppStore extends AppState {
  setLang: (lang: Language) => void;
  selectProfile: (profile: UserProfile) => void;
  openCarrierRegistrationFromAccountSettings: () => void;
  exitCarrierRegistration: () => void;
  setCarrierData: (data: CarrierData) => void;
  setStep: (step: AppStep) => void;
  openLegalHelp: () => void;
  closeLegalHelp: () => void;
  openAccountSettings: () => void;
  closeAccountSettings: () => void;
  setUser: (user: AuthUser | null, sessionFromRemote?: UserSessionDoc | null) => void;
  clearUser: () => void;
  reset: () => void;
  setAuthInitialized: (value: boolean) => void;
  setResumeAfterAuth: (value: ResumeAfterAuth | null) => void;
}

const initial: AppState = {
  lang: detectDeviceLanguage(),
  profile: null,
  boundUid: undefined,
  step: 'login',
  user: null,
  authInitialized: false,
  resumeAfterAuth: null,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initial,

      setLang: (lang) =>
        set((prev) => {
          const uid = prev.user?.uid;
          if (uid) void persistUserSessionFields(uid, { appLang: lang });
          return {
            lang,
            step: prev.step === 'onboarding' ? (prev.user ? 'profile' : 'login') : prev.step,
          };
        }),

      selectProfile: (profile) =>
        set((prev) => {
          const uid = prev.user?.uid ?? prev.boundUid;
          if (uid) void persistUserSessionFields(uid, { appMode: profile });
          return {
            profile,
            boundUid: prev.user?.uid ?? prev.boundUid,
            carrierRegistrationReturnStep: profile === 'carrier' ? 'profile' : undefined,
            step: profile === 'carrier' ? 'carrier-registration' : 'home',
          };
        }),

      openCarrierRegistrationFromAccountSettings: () =>
        set({
          carrierRegistrationReturnStep: 'account-settings',
          step: 'carrier-registration',
        }),

      exitCarrierRegistration: () =>
        set((prev) => ({
          step: prev.carrierRegistrationReturnStep ?? 'profile',
          carrierRegistrationReturnStep: undefined,
        })),

      setCarrierData: (data) =>
        set((prev) => {
          const from = prev.carrierRegistrationReturnStep;
          const nextStep = from === 'account-settings' ? 'account-settings' : 'carrier-dashboard';
          const uid = prev.user?.uid ?? prev.boundUid;
          if (uid) void persistUserSessionFields(uid, { appMode: 'carrier', carrierProfile: data });
          return {
            carrierData: data,
            boundUid: prev.user?.uid ?? prev.boundUid,
            step: nextStep,
            carrierRegistrationReturnStep: undefined,
          };
        }),

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
          step: prev.legalReturnStep ?? 'login',
          legalReturnStep: undefined,
        })),

      openAccountSettings: () =>
        set((prev) => {
          if (prev.step === 'account-settings') return prev;
          return {
            accountSettingsReturnStep: prev.step,
            step: 'account-settings',
          };
        }),

      closeAccountSettings: () =>
        set((prev) => ({
          step: prev.accountSettingsReturnStep ?? 'profile',
          accountSettingsReturnStep: undefined,
        })),

      setUser: (user, sessionFromRemote) =>
        set((prev) => {
          if (!user) {
            return {
              ...prev,
              user: null,
              profile: null,
              carrierData: undefined,
              boundUid: undefined,
              carrierRegistrationReturnStep: undefined,
              accountSettingsReturnStep: undefined,
              step: 'login',
              resumeAfterAuth: null,
            };
          }

          let base: AppState = prev;
          if (prev.boundUid && prev.boundUid !== user.uid) {
            base = {
              ...prev,
              profile: null,
              carrierData: undefined,
              carrierRegistrationReturnStep: undefined,
              boundUid: undefined,
            };
          }

          const remote = sessionFromRemote;
          if (remote && Object.keys(remote).length > 0) {
            base = {
              ...base,
              ...(remote.appLang ? { lang: remote.appLang } : {}),
            };
            if (remote.appMode) {
              base = {
                ...base,
                profile: remote.appMode,
                boundUid: user.uid,
                ...(remote.appMode === 'client'
                  ? { carrierData: undefined, carrierRegistrationReturnStep: undefined }
                  : {}),
                ...(remote.appMode === 'carrier' && remote.carrierProfile
                  ? { carrierData: remote.carrierProfile }
                  : {}),
              };
            }
          }

          const next: Partial<AppState> = { user };

          if (
            user.isAnonymous &&
            (base.step === 'login' || base.step === 'register') &&
            base.resumeAfterAuth
          ) {
            next.resumeAfterAuth = null;
          }

          const resume = next.resumeAfterAuth !== undefined ? next.resumeAfterAuth : base.resumeAfterAuth;

          if (user && !user.isAnonymous && resume) {
            next.step = resume.step;
            next.profile = resume.profile ?? base.profile;
            next.boundUid = user.uid;
            next.resumeAfterAuth = null;
            return { ...base, ...next };
          }

          const shouldRouteFromAuth =
            base.step === 'login' ||
            base.step === 'register' ||
            (base.step === 'onboarding' && Boolean(remote?.appMode));

          if (user && shouldRouteFromAuth) {
            next.step = canRestoreRoleFromPersist(base, user.uid) ? stepForRestoredRole(base) : 'profile';
          }

          return { ...base, ...next };
        }),

      clearUser: () =>
        set({
          user: null,
          profile: null,
          carrierData: undefined,
          boundUid: undefined,
          carrierRegistrationReturnStep: undefined,
          accountSettingsReturnStep: undefined,
          step: 'login',
          resumeAfterAuth: null,
        }),

      reset: () => set({ ...initial }),

      setAuthInitialized: (value) => set({ authInitialized: value }),

      setResumeAfterAuth: (value) => set({ resumeAfterAuth: value }),
    }),
    {
      name: 'barcelona-logistics-session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        profile: state.profile,
        carrierData: state.carrierData,
        boundUid: state.boundUid,
      }),
      version: 1,
    }
  )
);

export const selectLang = (s: AppStore) => s.lang;
export const selectStep = (s: AppStore) => s.step;
export const selectProfile = (s: AppStore) => s.profile;
export const selectCarrierData = (s: AppStore) => s.carrierData;
export const selectUser = (s: AppStore) => s.user;
