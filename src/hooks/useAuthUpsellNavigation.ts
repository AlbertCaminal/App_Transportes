import { useCallback } from 'react';
import type { ResumeAfterAuth } from '../../shared/types';
import { signOutUser } from '../services/firebase/auth';
import { useAppStore } from '../store/appStore';

/**
 * Cierra sesión anónima y lleva al login para que el usuario entre con Google.
 * Conserva `resumeAfterAuth` para reanudar pantalla tras `setUser` con cuenta real.
 */
export function useAuthUpsellNavigation(): {
  goToGoogleLogin: (resume: ResumeAfterAuth) => Promise<void>;
} {
  const setResumeAfterAuth = useAppStore((s) => s.setResumeAfterAuth);
  const setStep = useAppStore((s) => s.setStep);

  const goToGoogleLogin = useCallback(
    async (resume: ResumeAfterAuth) => {
      setResumeAfterAuth(resume);
      setStep('login');
      await signOutUser();
    },
    [setResumeAfterAuth, setStep]
  );

  return { goToGoogleLogin };
}
